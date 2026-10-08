import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
const dir=await mkdtemp(join(tmpdir(),'research-web-'));process.env.DATA_DIR=dir;process.env.SEED_DEMO='false';process.env.WORKER_MODE='true';
const {db}=await import('../server/store.mjs');
const {createResearchBudget}=await import('../server/agent/research/research-budget.mjs');
const {saveSearchPricing,searchPriceQuote,searchPricingConfig}=await import('../server/agent/research/research-search-pricing.mjs');
const {collectResearchWeb}=await import('../server/agent/research/research-web.mjs');
const {renderResearchReport}=await import('../server/agent/research/research-contract.mjs');
const ledger=createResearchBudget(db),key='synthetic-key',expiry=new Date(Date.now()+86400000).toISOString();
const pricing=saveSearchPricing({revision:0,enabled:true,maxCostMicros:50000,reviewUntil:expiry,acknowledged:true},{key});
const task=()=>{const t={id:randomUUID(),researchAttempt:1,researchReportVersion:1,researchBrief:{topic:'学习事务',questions:['怎样回滚？'],web:true}};ledger.initialize(t.id);return t;};
const args=t=>({task:t,ledger,key,pricing,assertActive:()=>{}});
const search=async(query)=>({query,retrievedAt:'2026-10-08T00:00:00Z',results:[{title:'事务说明',url:'https://example.com/transaction',quote:'搜索摘要中的事务回滚'}]});
const read=async url=>({url,text:'网页原文：回滚撤销未提交的操作。',start:0,end:20,total:20,truncated:false,contentHash:'a'.repeat(64),readAt:'2026-10-08T00:00:01Z'});
after(async()=>{db.close();await rm(dir,{recursive:true,force:true});});
test('price binds to the configured account and expires; invalid updates do not change config',()=>{
 assert.equal(searchPriceQuote(pricing,{key}).maxCostMicros,50000);
 assert.throws(()=>searchPriceQuote(pricing,{key:'another'}),/密钥已变化/);assert.throws(()=>searchPriceQuote(pricing,{key,clock:()=>Date.parse(expiry)+1}),/复核期限/);
 for(const patch of [{maxCostMicros:0},{acknowledged:false},{reviewUntil:new Date(Date.now()+40*86400000).toISOString()}])assert.throws(()=>saveSearchPricing({revision:1,enabled:true,maxCostMicros:50000,reviewUntil:expiry,acknowledged:true,...patch},{key}));
 assert.equal(searchPricingConfig().revision,1);assert.throws(()=>saveSearchPricing({revision:0,enabled:false}),/已变化/);
});
test('search and full page are separately typed, metered and replayed without new requests',async()=>{
 const t=task();let calls=0;const options={...args(t),search:async(...a)=>{calls++;return search(...a);},read:async(...a)=>{calls++;return read(...a);}};
 const result=await collectResearchWeb(options);assert.equal(calls,2);assert.deepEqual(result.evidence.map(e=>e.evidenceType),['search_snippet','web_page']);assert.equal(ledger.snapshot(t.id).chargedMicros,50000);assert.equal(ledger.snapshot(t.id).uncertainMicros,50000);assert.equal(ledger.snapshot(t.id).pendingAttempts,0);
 assert.deepEqual(await collectResearchWeb(options),result);assert.equal(calls,2);
 const body=renderResearchReport({sections:[],coverage:[]},t.researchBrief,result.evidence,'');assert.match(body,/搜索摘要/);assert.match(body,/网页文字/);assert.match(body,/https:\/\/example.com/);assert.doesNotMatch(body,/本地原文/);
});
test('page failure preserves paid snippets; search failure is charged conservatively and replayed',async()=>{
 const t=task(),result=await collectResearchWeb({...args(t),search,read:async()=>{throw Object.assign(new Error('网页离线'),{code:'WEB_UNAVAILABLE'});}});assert.equal(result.evidence.length,1);assert.match(result.notice,/未联网核验/);assert.equal(ledger.snapshot(t.id).chargedMicros,50000);
 const other=task();let calls=0;const options={...args(other),search:async()=>{calls++;throw Object.assign(new Error('限流'),{code:'WEB_RATE_LIMIT'});},read};assert.match((await collectResearchWeb(options)).notice,/限流/);await collectResearchWeb(options);assert.equal(calls,1);assert.equal(ledger.snapshot(other.id).chargedMicros,50000);
});
test('missing config and exhausted budget make no requests; forbidden and cancellation are not fallback',async()=>{
 const t=task();let calls=0;const noCall=async()=>{calls++;throw new Error('unexpected');};
 assert.equal((await collectResearchWeb({...args(t),key:'',search:noCall})).evidence.length,0);assert.match((await collectResearchWeb({...args(t),pricing:{enabled:false},search:noCall})).notice,/费用上限/);assert.equal(calls,0);
 const r=ledger.reserve({runId:t.id,stepKey:'fixture',requestHash:'a'.repeat(64),priceVersion:'test',maxCostMicros:1000000,maxTimeMs:1});ledger.settle({attemptId:r.attempt.id,actualCostMicros:1000000,elapsedMs:0});assert.match((await collectResearchWeb({...args(t),search:noCall})).notice,/额度不足/);assert.equal(calls,0);
 const denied=task();await assert.rejects(collectResearchWeb({...args(denied),search:async()=>{throw Object.assign(new Error('权限拒绝'),{code:'WEB_FORBIDDEN'});}}),/权限拒绝/);assert.equal(ledger.snapshot(denied.id).chargedMicros,50000);
 const controller=new AbortController(),reason=new Error('cancelled'),cancelled=task();await assert.rejects(collectResearchWeb({...args(cancelled),signal:controller.signal,search:async()=>{controller.abort(reason);throw reason;}}),e=>e===reason);assert.equal(ledger.snapshot(cancelled.id).reservedMicros,50000);
});
test('search cannot spend the report reserve and invalid questions still fail before reservation',async()=>{
 const t=task(),r=ledger.reserve({runId:t.id,stepKey:'prior-work',requestHash:'b'.repeat(64),priceVersion:'test',maxCostMicros:950000,maxTimeMs:1});ledger.settle({attemptId:r.attempt.id,actualCostMicros:950000,elapsedMs:0});let pages=0,searches=0;
 const result=await collectResearchWeb({...args(t),search:async(...a)=>{searches++;return search(...a);},read:async()=>{pages++;return read('https://example.com');}});
 assert.equal(result.evidence.length,0);assert.equal(searches,0);assert.equal(pages,0);assert.equal(ledger.snapshot(t.id).chargedMicros,950000);assert.match(result.notice,/保留报告收束/);
 const invalid=task();invalid.researchBrief.questions=['word '.repeat(76)];await assert.rejects(collectResearchWeb({...args(invalid),search}),e=>e.code==='WEB_INPUT');assert.equal(ledger.snapshot(invalid.id).pendingAttempts,0);assert.equal(ledger.snapshot(invalid.id).chargedMicros,0);
});
