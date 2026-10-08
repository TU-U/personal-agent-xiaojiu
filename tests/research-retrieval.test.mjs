import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
const dir=await mkdtemp(join(tmpdir(),'research-retrieval-'));process.env.DATA_DIR=dir;process.env.SEED_DEMO='false';process.env.WORKER_MODE='true';
const {db,save,get}=await import('../server/store.mjs');
const {createResearchBudget}=await import('../server/agent/research/research-budget.mjs');
const {retrieveResearchEvidence,validateRetrievedEvidence}=await import('../server/agent/research/research-retrieval.mjs');
const ledger=createResearchBudget(db),config={indexProfile:'qwen3-local-v1',model:'qwen3-embedding-0.6b',embedding:'http://127.0.0.1:4320/v1',qdrant:'http://127.0.0.1:6333'};
const task=()=>{const t={id:randomUUID(),researchReportVersion:1,researchAttempt:1,threadId:'',researchBrief:{topic:'事务学习',questions:['怎样撤销失败的写入？','原子性是什么？']}};ledger.initialize(t.id);return t;};
const args=t=>({task:t,ledger,config,assertActive:()=>{}});
const hit=s=>({...s,kind:'note',start:0,end:s.content.length});
after(async()=>{db.close();await rm(dir,{recursive:true,force:true});});
test('semantic evidence is metered, deduplicated by exact locator, and replays without further calls',async()=>{
 const t=task(),source=save('note',{title:'回滚',content:'写入失败后回滚事务。'});let calls=0;
 const search=async(_q,_o,_c,controls)=>{calls++;assert.equal(controls.readOnly,true);assert.equal(controls.seed,false);assert.ok(controls.signal);return [hit(source)];};
 const first=await retrieveResearchEvidence({...args(t),search});assert.equal(calls,2);assert.equal(first.evidence.length,1);assert.deepEqual(first.evidence[0].matchedQuestions,['Q1','Q2']);assert.equal(first.evidence[0].id,'R1');assert.equal(first.evidence[0].sourceField,'content');
 const budget=ledger.snapshot(t.id),second=await retrieveResearchEvidence({...args(t),search});assert.equal(calls,2);assert.deepEqual(second,first);assert.equal(ledger.snapshot(t.id).spentTimeMs,budget.spentTimeMs);assert.equal(budget.chargedMicros,0);assert.equal(budget.pendingAttempts,0);
 const changed=save('note',{...source,content:'原文已修改'},source.revision);assert.ok(changed);await assert.rejects(retrieveResearchEvidence({...args(t),search}),/已修改/);assert.equal(calls,2);
});
test('partial service failure retains earlier evidence but forbidden requests fail instead of degrading',async()=>{
 const t=task(),source=save('note',{title:'材料',content:'有效原文'});let calls=0;
 const result=await retrieveResearchEvidence({...args(t),search:async()=>{if(++calls===1)return [hit(source)];throw Object.assign(new Error('服务离线'),{status:503});}});
 assert.equal(result.evidence.length,1);assert.match(result.notice,/Q2.*服务离线/);assert.equal(ledger.snapshot(t.id).pendingAttempts,0);
 const denied=task();await assert.rejects(retrieveResearchEvidence({...args(denied),search:async()=>{throw Object.assign(new Error('拒绝访问'),{status:403});}}),/拒绝访问/);
 assert.equal(ledger.attempt(denied.id,'hybrid-evidence:1:1:Q1').state,'failed');
});
test('unknown paid endpoint never gets called; budget exhaustion retains already collected evidence',async()=>{
 let calls=0;const t=task();const skipped=await retrieveResearchEvidence({...args(t),config:{...config,embedding:'https://remote.example/v1'},search:async()=>{calls++;return [];}});assert.equal(calls,0);assert.match(skipped.notice,/未知费用/);
 const source=save('note',{title:'预算前材料',content:'保留此证据'});
 const result=await retrieveResearchEvidence({...args(t),search:async()=>{calls++;const r=ledger.reserve({runId:t.id,stepKey:'fixture-cost',requestHash:'x'.repeat(64),priceVersion:'test',maxCostMicros:1000000,maxTimeMs:1});ledger.settle({attemptId:r.attempt.id,actualCostMicros:1000000,elapsedMs:0});return [hit(source)];}});
 assert.equal(calls,1);assert.equal(result.evidence.length,1);assert.match(result.notice,/预算不足/);assert.equal(ledger.snapshot(t.id).chargedMicros,1000000);
});
test('source change, revoked memory, bad position, and cancellation cannot become a successful fallback',async()=>{
 const t=task(),source=save('note',{title:'变更',content:'旧文'});
 await assert.rejects(retrieveResearchEvidence({...args(t),search:async()=>{save('note',{...source,content:'新文'},source.revision);return [hit(source)];}}),/来源已变化/);
 const other=save('note',{title:'位置',content:'真实内容'});await assert.rejects(retrieveResearchEvidence({...args(task()),search:async()=>[{...hit(other),content:'伪造内容'}]}),/位置与原文不一致/);
 const memory=save('memory',{title:'偏好',content:'简洁',scope:'通用',status:'paused'});assert.throws(()=>validateRetrievedEvidence([{selectionMethod:'hybrid_search',sourceId:memory.id,kind:'memory',revision:memory.revision,title:memory.title,sourceField:'content',start:0,end:2,quote:'简洁'}],t),/失效/);
 const controller=new AbortController(),reason=new Error('user cancelled'),cancelled=task();await assert.rejects(retrieveResearchEvidence({...args(cancelled),signal:controller.signal,search:async()=>{controller.abort(reason);throw reason;}}),error=>error===reason);assert.equal(ledger.snapshot(cancelled.id).pendingAttempts,1);
});
