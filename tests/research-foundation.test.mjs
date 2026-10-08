import {test,after} from 'node:test';import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';import {mkdtemp,rm} from 'node:fs/promises';import {spawnSync,spawn} from 'node:child_process';import os from 'node:os';import path from 'node:path';
import {emptyCheckpoint} from '@langchain/langgraph-checkpoint';
import {researchApprovalCommand,researchPlanHash} from '../server/agent/research/research-approval.mjs';
import {ResearchCheckpointSaver} from '../server/agent/research/research-checkpoints.mjs';import {createResearchBudget} from '../server/agent/research/research-budget.mjs';
const root=await mkdtemp(path.join(os.tmpdir(),'research-foundation-'));
const request=(runId,stepKey,patch={})=>({runId,stepKey,requestHash:'hash-for-bounded-call',priceVersion:'price-test-v1',maxCostMicros:600000,maxTimeMs:90000,...patch});
function worker(file,mode){const result=spawnSync(process.execPath,['tests/fixtures/research-checkpoint-worker.mjs',file,mode],{encoding:'utf8',timeout:30000});assert.ok(result.stdout,result.stderr);return {code:result.status,...JSON.parse(result.stdout.trim())};}
test('approval validates both plan version and content before constructing a resume command',()=>{
 const plan={version:1,questions:['原问题']},snapshot={next:['confirm_plan'],values:{plan}};
 const decision={approved:true,planVersion:1,planHash:researchPlanHash(plan)};
 assert.ok(researchApprovalCommand(snapshot,decision));
 assert.throws(()=>researchApprovalCommand({...snapshot,values:{plan:{...plan,questions:['另一个问题']}}},decision),error=>error.code==='RESEARCH_STALE_APPROVAL');
 assert.throws(()=>researchApprovalCommand({...snapshot,next:['research']},decision),error=>error.code==='RESEARCH_STALE_APPROVAL');
 assert.throws(()=>researchApprovalCommand(snapshot,{...decision,approved:'true'}));
 assert.throws(()=>researchApprovalCommand(snapshot,{...decision,budget:1000}));
});
test('actual LangGraph persists the plan interrupt across processes; awaiting time is free and repeat recovery does not duplicate billing or artifact',()=>{
 const file=path.join(root,'graph.sqlite');const initial=worker(file,'start');assert.equal(initial.code,0);assert.equal(initial.interrupted,true);assert.deepEqual(initial.next,['confirm_plan']);assert.equal(initial.artifacts,0);assert.equal(initial.attempts,1);assert.equal(initial.budget.spentTimeMs,100);
 const waiting=worker(file,'continue');assert.equal(waiting.code,0);assert.equal(waiting.interrupted,true);assert.equal(waiting.attempts,1);assert.equal(waiting.budget.chargedMicros,100000);assert.equal(waiting.budget.spentTimeMs,100);
 const wrong=worker(file,'wrong-version');assert.equal(wrong.code,2);assert.match(wrong.error,/当前版本计划/);assert.equal(wrong.artifacts,0);
 const done=worker(file,'confirm');assert.equal(done.code,0,done.error);assert.equal(done.artifacts,1);assert.equal(done.attempts,2);assert.equal(done.budget.chargedMicros,250000);assert.equal(done.budget.spentTimeMs,200);assert.equal(done.report,'有依据的学习路径草稿');
 const replay=worker(file,'continue');assert.equal(replay.code,0);assert.equal(replay.artifacts,1);assert.equal(replay.attempts,2);assert.equal(replay.budget.chargedMicros,250000);
});
test('cancelled research cannot resume through a persisted approval gate',()=>{
 const file=path.join(root,'cancel.sqlite');assert.equal(worker(file,'start').artifacts,0);worker(file,'cancel');const resumed=worker(file,'confirm');assert.equal(resumed.code,2);assert.match(resumed.error,/取消/);assert.equal(resumed.artifacts,0);assert.equal(resumed.budget.chargedMicros,100000);
});
test('atomic reservations across connections, unknown charges, price versions and settlement receipts preserve the one-yuan cap',()=>{
 const file=path.join(root,'budget.sqlite'),db=new DatabaseSync(file),other=new DatabaseSync(file),ledger=createResearchBudget(db),second=createResearchBudget(other);ledger.initialize('run');
 const first=ledger.reserve(request('run','plan'));assert.throws(()=>second.reserve(request('run','other')),error=>error.code==='RESEARCH_BUDGET');assert.throws(()=>second.reserve(request('run','plan')),error=>error.code==='RESEARCH_CALL_PENDING');
 assert.throws(()=>ledger.reserve(request('run','unknown-price',{priceVersion:''})),error=>error.code==='RESEARCH_PRICE_REQUIRED');
 const receipt={attemptId:first.attempt.id,actualCostMicros:100000,elapsedMs:1000,result:{plan:'保留的计划'}};ledger.settle(receipt);assert.deepEqual(ledger.settle(receipt).result,receipt.result);
 assert.throws(()=>ledger.settle({...receipt,actualCostMicros:0}),error=>error.code==='RESEARCH_SETTLEMENT_CONFLICT');assert.equal(second.reserve(request('run','plan')).replay,true);
 assert.throws(()=>ledger.reserve(request('run','plan',{priceVersion:'new-price'})),error=>error.code==='RESEARCH_STEP_CONFLICT');
 const fallback=ledger.reserve(request('run','fallback',{maxCostMicros:900000}));ledger.settle({attemptId:fallback.attempt.id,actualCostMicros:null,elapsedMs:1000,error:'超时，费用未确认'});const state=ledger.initialize('run');assert.equal(state.chargedMicros,1000000);assert.equal(state.uncertainMicros,900000);assert.equal(state.remainingMicros,0);assert.throws(()=>ledger.reserve(request('run','retry',{maxCostMicros:1})),error=>error.code==='RESEARCH_BUDGET');db.close();other.close();
});
test('two independent processes cannot each reserve the same remaining one-yuan budget',async()=>{
 const file=path.join(root,'concurrent.sqlite'),db=new DatabaseSync(file);createResearchBudget(db).initialize('shared');db.close();
 const code=`import {DatabaseSync} from 'node:sqlite';import {createResearchBudget} from './server/agent/research/research-budget.mjs';const db=new DatabaseSync(process.argv[1]);db.exec('PRAGMA busy_timeout=5000');const ledger=createResearchBudget(db);try{ledger.reserve({runId:'shared',stepKey:process.argv[2],requestHash:'concurrent-call-hash',priceVersion:'test',maxCostMicros:600000,maxTimeMs:60000});console.log('reserved');}catch(error){console.log(error.code);}finally{db.close();}`;
 const reserve=step=>new Promise((resolve,reject)=>{const child=spawn(process.execPath,['--input-type=module','-e',code,file,step]);let output='',error='';child.stdout.on('data',chunk=>output+=chunk);child.stderr.on('data',chunk=>error+=chunk);child.on('error',reject);child.on('exit',status=>status===0?resolve(output.trim()):reject(new Error(error)));});
 const results=await Promise.all([reserve('first'),reserve('second')]);assert.deepEqual(results.sort(),['RESEARCH_BUDGET','reserved']);
});
test('crashed reservations survive reopening; time/cancel/overrun cannot reset or refund spent or uncertain work',()=>{
 const file=path.join(root,'crash.sqlite');let db=new DatabaseSync(file),ledger=createResearchBudget(db,{clock:()=>1000});ledger.initialize('run');const first=ledger.reserve(request('run','first',{maxTimeMs:300000}));db.close();
 db=new DatabaseSync(file);ledger=createResearchBudget(db,{clock:()=>1000000000});assert.equal(ledger.initialize('run').remainingTimeMs,0);assert.throws(()=>ledger.reserve(request('run','retry',{maxCostMicros:1,maxTimeMs:1})),error=>error.code==='RESEARCH_BUDGET');
 ledger.cancel('run');assert.throws(()=>ledger.reserve(request('run','cancelled')),error=>error.code==='RESEARCH_CANCELLED');ledger.settle({attemptId:first.attempt.id,actualCostMicros:1100000,elapsedMs:300001,error:'提供方计量超过预留上界'});const end=ledger.snapshot('run');assert.equal(end.overLimit,true);assert.equal(end.state,'cancelled');assert.equal(end.chargedMicros,1100000);db.close();
});
test('checkpoint namespaces, intermediate writes and stale-worker fencing are durable and do not cross threads',async()=>{
 const db=new DatabaseSync(path.join(root,'saver.sqlite'));let writable=true;const saver=new ResearchCheckpointSaver(db,{assertWritable:()=>{if(!writable)throw new Error('lease lost');}}),config={configurable:{thread_id:'research',checkpoint_ns:'main'}};
 const checkpoint=emptyCheckpoint();checkpoint.channel_values={value:'first'};const stored=await saver.put(config,checkpoint,{step:0,source:'input'});
 await saver.putWrites(stored,[['result','first'],['__error__','old error']],'node');await saver.putWrites(stored,[['result','duplicate'],['__error__','new error']],'node');
 const tuple=await saver.getTuple(stored);assert.equal(tuple.checkpoint.channel_values.value,'first');assert.ok(tuple.pendingWrites.some(write=>write[1]==='result'&&write[2]==='first'));assert.ok(tuple.pendingWrites.some(write=>write[1]==='__error__'&&write[2]==='new error'));
 assert.equal(await saver.getTuple({configurable:{thread_id:'research',checkpoint_ns:'other'}}),undefined);const listed=[];for await(const item of saver.list(config,{limit:1,filter:{step:0}}))listed.push(item);assert.equal(listed.length,1);
 writable=false;await assert.rejects(saver.put(stored,emptyCheckpoint(),{step:1}),/lease lost/);await assert.rejects(saver.putWrites(stored,[['result','late']],'late'),/lease lost/);assert.equal((await saver.getTuple(config)).checkpoint.id,checkpoint.id);
 writable=true;await saver.deleteThread('research');assert.equal(await saver.getTuple(config),undefined);assert.equal(db.prepare('SELECT count(*) n FROM research_checkpoint_writes').get().n,0);db.close();
});
after(async()=>{await rm(root,{recursive:true,force:true});});
