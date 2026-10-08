import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {withAiContext,updateAiContext,aiContext} from '../server/core/ai-context.mjs';

test('concurrent business contexts stay isolated across completion success and failure',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'shiguang-ai-context-'));
 process.env.DATA_DIR=dir;process.env.SEED_DEMO='false';process.env.WORKER_MODE='true';
 const {requestCompletion}=await import('../server/ai/model-completion.mjs');
 const {recentAiEvents}=await import('../server/core/ai-log.mjs');
 const originalFetch=globalThis.fetch,originalLog=console.log;
 const secret='context-test-secret-value';let release,entered;
 const ready=new Promise(resolve=>entered=resolve),gate=new Promise(resolve=>release=resolve);
 console.log=()=>{};
 globalThis.fetch=async(_url,options)=>{
  const text=JSON.parse(options.body).messages[1].content;
  if(text==='first'){entered();await gate;return new Response(JSON.stringify({choices:[{message:{content:'done'}}]}));}
  throw new Error(secret);
 };
 const config={baseUrl:'https://example.invalid',model:'test',apiKey:secret};
 try{
  const first=withAiContext({requestId:'request-a',apiKey:secret},async()=>{
   updateAiContext({threadId:'thread-a'});
   await requestCompletion(config,'system','first');
   await withAiContext({sourceId:'source-a'},async()=>{await Promise.resolve();assert.equal(aiContext().threadId,'thread-a');});
   assert.equal(aiContext().sourceId,undefined);
  });
  await ready;
  await withAiContext({jobId:'job-b',entityId:'note-b',revision:2,attempt:1},()=>assert.rejects(requestCompletion(config,'system','second'),{code:'MODEL_NETWORK'}));
  release();await first;
  const logs=recentAiEvents();assert.equal(logs.length,4);
  const a=logs.filter(row=>row.context.requestId==='request-a'),b=logs.filter(row=>row.context.jobId==='job-b');
  assert.equal(a.length,2);assert.equal(b.length,2);
  assert.deepEqual(new Set(a.map(row=>row.stage)),new Set(['request','response']));
  assert.deepEqual(new Set(b.map(row=>row.stage)),new Set(['request','error']));
  for(const row of a){assert.equal(row.context.threadId,'thread-a');assert.equal(row.context.jobId,undefined);}
  for(const row of b){assert.equal(row.context.entityId,'note-b');assert.equal(row.context.revision,2);assert.equal(row.context.threadId,undefined);}
  assert.equal(a[0].callId,a[1].callId);assert.equal(b[0].callId,b[1].callId);assert.notEqual(a[0].callId,b[0].callId);
  assert.equal(JSON.stringify(logs).includes(secret),false);assert.deepEqual(aiContext(),{});
 }finally{release?.();globalThis.fetch=originalFetch;console.log=originalLog;rmSync(dir,{recursive:true,force:true});}
});
