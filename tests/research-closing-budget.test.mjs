import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createResearchBudget} from '../server/agent/research/research-budget.mjs';
import {evidenceTimeAvailable,REPORT_INPUT_BYTES,REPORT_MAX_TOKENS,REPORT_CLOSING_MICROS} from '../server/agent/research/research-limits.mjs';
import {quoteResearchModel} from '../server/agent/research/research-pricing.mjs';
const request=(stepKey,patch={})=>({runId:'run',stepKey,requestHash:'test-request-hash-closing',priceVersion:'synthetic',maxCostMicros:0,maxTimeMs:1,...patch});
test('evidence reservations preserve closing capacity atomically across connections; report can spend it',()=>{
 const dir=mkdtempSync(join(tmpdir(),'closing-budget-')),file=join(dir,'test.sqlite'),db=new DatabaseSync(file),other=new DatabaseSync(file);
 try{
  const ledger=createResearchBudget(db),second=createResearchBudget(other);ledger.initialize('run');
  const input=request('web:1:1:search:Q1',{maxCostMicros:680000,maxTimeMs:255000}),first=ledger.reserve(input);
  assert.equal(second.snapshot('run').remainingMicros,320000);assert.equal(evidenceTimeAvailable(second.snapshot('run')),0);
  assert.throws(()=>second.reserve(request('web:1:1:search:Q2',{maxCostMicros:1})),/收束/);
  assert.throws(()=>second.reserve(request('hybrid-evidence:1:1:Q1')),/收束/);
  ledger.settle({attemptId:first.attempt.id,actualCostMicros:680000,elapsedMs:255000,result:{evidence:[]}});
  assert.equal(second.reserve(input).replay,true);
  const final=second.reserve(request('report:1',{maxCostMicros:320000,maxTimeMs:45000}));
  second.settle({attemptId:final.attempt.id,actualCostMicros:300000,elapsedMs:40000});
  assert.equal(ledger.snapshot('run').chargedMicros,980000);assert.equal(ledger.snapshot('run').spentTimeMs,295000);
 }finally{db.close();other.close();rmSync(dir,{recursive:true,force:true});}
});
test('an already small money balance does not block free evidence, but still protects closing time',()=>{
 const db=new DatabaseSync(':memory:');try{
  const ledger=createResearchBudget(db);ledger.initialize('run');const old=ledger.reserve(request('previous-work',{maxCostMicros:900000,maxTimeMs:250000}));ledger.settle({attemptId:old.attempt.id,actualCostMicros:900000,elapsedMs:250000});
  assert.equal(evidenceTimeAvailable(ledger.snapshot('run')),5000);
  assert.throws(()=>ledger.reserve(request('local-evidence',{maxTimeMs:5001})),/收束/);
  const free=ledger.reserve(request('local-evidence',{maxTimeMs:5000}));assert.equal(free.replay,false);
  assert.throws(()=>ledger.reserve(request('web:1:1:search:Q1',{maxCostMicros:1})),/收束/);
 }finally{db.close();}
});

test('closing money floor covers the maximum report JSON and the tested system-message allowance',()=>{
 const quote=quoteResearchModel({baseUrl:'https://api.deepseek.com',model:'deepseek-flash'},'s'.repeat(4096),'u'.repeat(REPORT_INPUT_BYTES),{maxTokens:REPORT_MAX_TOKENS,now:Date.parse('2026-10-08T00:00:00Z')});
 assert.ok(quote.maxCostMicros<=REPORT_CLOSING_MICROS);
});
