import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';import {join} from 'node:path';
const dir=mkdtempSync(join(tmpdir(),'research-model-'));process.env.DATA_DIR=dir;
const {completeResearch}=await import('../server/agent/research/research-model.mjs');
const {createResearchBudget}=await import('../server/agent/research/research-budget.mjs');
const {createResearchExecutionClock}=await import('../server/agent/research/research-execution-clock.mjs');
const {quoteResearchModel,priceResearchUsage}=await import('../server/agent/research/research-pricing.mjs');
const provider={baseUrl:'https://api.deepseek.com',model:'deepseek-flash',apiKey:'test-private'};
const now=Date.parse('2026-10-07T00:00:00Z'),originalFetch=globalThis.fetch,originalLog=console.log;
console.log=()=>{};
function setup(){const db=new DatabaseSync(':memory:'),ledger=createResearchBudget(db);ledger.initialize('run');return {db,ledger};}
const input=ledger=>({ledger,runId:'run',stepKey:'plan',provider,system:'只回答测试',user:'你好',maxTokens:64,now});
const result=(content='测试结果',usage={prompt_tokens:20,completion_tokens:5,total_tokens:25},finish_reason='stop')=>new Response(JSON.stringify({model:'deepseek-flash',choices:[{message:{content},finish_reason}],usage}));
after(()=>{globalThis.fetch=originalFetch;console.log=originalLog;rmSync(dir,{recursive:true,force:true});});
test('reject unknown/proxy/expired prices before any paid request; count UTF8 and cache usage conservatively',()=>{
 const quote=quoteResearchModel(provider,'😀中文','test',{maxTokens:64,now});
 assert.equal(quote.inputTokens,Buffer.byteLength('😀中文test')+1024);
 for(const patch of [{baseUrl:'https://proxy.example/v1'},{baseUrl:'https://api.deepseek.com/anthropic'},{model:'unknown'}])assert.throws(()=>quoteResearchModel({...provider,...patch},'s','u',{now}),e=>e.code==='RESEARCH_PRICE_REQUIRED');
 assert.throws(()=>quoteResearchModel(provider,'s','u',{now:Date.parse('2026-11-08')}),/重新核对/);
 const priced=priceResearchUsage({model:'deepseek-flash',usage:{prompt_tokens:10,completion_tokens:2,prompt_cache_hit_tokens:9,prompt_cache_miss_tokens:1}},quote);
 assert.equal(priced.costMicros,19);assert.equal(priced.basis,'usage-upper-bound');
 assert.equal(priceResearchUsage({model:'different',usage:{prompt_tokens:10,completion_tokens:2}},quote),null);
 assert.equal(priceResearchUsage({model:'deepseek-flash',usage:{prompt_tokens:10,completion_tokens:2,total_tokens:1}},quote),null);
 assert.equal(priceResearchUsage({model:'deepseek-flash',usage:{prompt_tokens:10,completion_tokens:2,prompt_cache_hit_tokens:99}},quote),null);
});
test('successful paid result and price persist; exact replay uses no second model call or new budget',async()=>{
 const {db,ledger}=setup();let calls=0;globalThis.fetch=async()=>{calls++;return result();};
 try{
  const request=input(ledger),first=await completeResearch(request),second=await completeResearch(request);
  assert.deepEqual(first,second);assert.deepEqual(await completeResearch({...request,now:Date.parse('2026-12-01')}),first);assert.equal(calls,1);assert.equal(first.content,'测试结果');assert.equal(first.chargeBasis,'usage-upper-bound');
  const state=ledger.snapshot('run');assert.equal(state.chargedMicros,80);assert.equal(state.uncertainMicros,80);assert.equal(state.pendingAttempts,0);
  assert.equal(JSON.stringify(first).includes(provider.apiKey),false);
  await assert.rejects(completeResearch({...request,user:'changed'}),e=>e.code==='RESEARCH_STEP_CONFLICT');assert.equal(calls,1);
 }finally{db.close();}
});
test('empty/truncated content settles returned usage; repeated failed attempt never repeats a paid call',async()=>{
 const {db,ledger}=setup();let calls=0;globalThis.fetch=async()=>{calls++;return result('',undefined,'length');};
 try{
  await assert.rejects(completeResearch(input(ledger)),e=>e.code==='MODEL_TRUNCATED');
  assert.equal(ledger.snapshot('run').chargedMicros,80);
  await assert.rejects(completeResearch(input(ledger)),e=>e.code==='RESEARCH_PREVIOUS_FAILURE');assert.equal(calls,1);
 }finally{db.close();}
});
test('network failure retains full cost reserve; explicit retry uses same cumulative run',async()=>{
 const {db,ledger}=setup();globalThis.fetch=async()=>{throw new Error('offline');};
 try{
  const request=input(ledger);await assert.rejects(completeResearch(request),e=>e.code==='MODEL_NETWORK');
  const charged=ledger.snapshot('run').chargedMicros;assert.ok(charged>80);assert.equal(charged,ledger.snapshot('run').uncertainMicros);
  globalThis.fetch=async()=>result();await completeResearch({...request,stepKey:'plan-retry-1'});
  assert.equal(ledger.snapshot('run').chargedMicros,charged+80);
  ledger.cancel('run');await assert.rejects(completeResearch({...request,stepKey:'plan-retry-2'}),e=>e.code==='RESEARCH_CANCELLED');
 }finally{db.close();}
});
test('usage above protocol bound stops subsequent work but records the actual higher count',async()=>{
 const {db,ledger}=setup();globalThis.fetch=async()=>result('unexpected',{prompt_tokens:100000,completion_tokens:5,total_tokens:100005});
 try{
  await assert.rejects(completeResearch(input(ledger)),e=>e.code==='RESEARCH_USAGE_BOUND');
  const state=ledger.snapshot('run');assert.equal(state.state,'cancelled');assert.equal(state.chargedMicros,200040);assert.equal(state.pendingAttempts,0);
  await assert.rejects(completeResearch({...input(ledger),stepKey:'new'}),e=>e.code==='RESEARCH_CANCELLED');
 }finally{db.close();}
});
test('lost writer lease after provider return leaves the reservation held, without second settlement',async()=>{
 const db=new DatabaseSync(':memory:');let writable=true;
 const ledger=createResearchBudget(db,{assertWritable(){if(!writable)throw new Error('lease lost');}});ledger.initialize('run');
 globalThis.fetch=async()=>{writable=false;return result();};
 try{await assert.rejects(completeResearch(input(ledger)),/lease lost/);assert.equal(ledger.snapshot('run').pendingAttempts,1);assert.ok(ledger.snapshot('run').reservedMicros>0);}finally{db.close();}
});
test('execution clock preserves output-bound error after settling a cancelled run',async()=>{
 const {db,ledger}=setup();let calls=0;
 const meter=createResearchExecutionClock(ledger,{runId:'run',executionId:'output-bound'});
 globalThis.fetch=async()=>{calls++;return result('',{prompt_tokens:20,completion_tokens:65,total_tokens:85},'length');};
 try{
  await assert.rejects(completeResearch(input(meter.ledger)),e=>e.code==='RESEARCH_USAGE_BOUND'&&/输出 65\/64 tokens/.test(e.message));
  meter.pulse();meter.finish();
  const state=ledger.snapshot('run');assert.equal(state.state,'cancelled');assert.equal(state.pendingAttempts,0);assert.equal(state.chargedMicros,560);
  await assert.rejects(completeResearch({...input(meter.ledger),stepKey:'retry'}),e=>e.code==='RESEARCH_CANCELLED');assert.equal(calls,1);
 }finally{meter.finish();db.close();}
});
