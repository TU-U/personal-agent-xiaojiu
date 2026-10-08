import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const dir=mkdtempSync(path.join(os.tmpdir(),'shiguang-ai-log-'));
process.env.DATA_DIR=dir;process.env.SEED_DEMO='false';
const {setSetting,db}=await import('../server/store.mjs');
const {complete}=await import('../server/ai/engine.mjs');
const {AI_LOG_FILE,recentAiEvents}=await import('../server/core/ai-log.mjs');
const originalFetch=globalThis.fetch,originalLog=console.log;
const key='sk-testsecret000000000000';
setSetting('provider',{baseUrl:'https://api.deepseek.com',model:'deepseek-flash',apiKey:key});

test('AI calls log prompts, result metadata and errors without exposing the key',async()=>{
 let sent;
 console.log=()=>{};
 globalThis.fetch=async(_url,options)=>{
  sent=JSON.parse(options.body);
  return new Response(JSON.stringify({model:'deepseek-flash',choices:[{finish_reason:'stop',message:{content:'周报已生成。'}}],usage:{total_tokens:42}}),{status:200});
 };
 assert.equal(await complete('请写周报','本周完成了测试',null,{maxTokens:4096}),'周报已生成。');
 assert.deepEqual(sent.thinking,{type:'disabled'});
 assert.equal(sent.max_tokens,4096);
 const events=recentAiEvents();
 assert.equal(events[0].stage,'response');
 assert.equal(events[0].finishReason,'stop');
 assert.ok(events[1].payload.messages[1].content.includes('本周完成了测试'));
 assert.equal(readFileSync(AI_LOG_FILE,'utf8').includes(key),false);

 globalThis.fetch=async()=>new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:'PRIVATE OCR AMOUNT 82.50'}}],usage:{total_tokens:8}}),{status:200});
 assert.equal(await complete('ocr','private statement input',null,{logUser:'[账单数据已脱敏]',logResponse:false}),'PRIVATE OCR AMOUNT 82.50');
 const privateLog=readFileSync(AI_LOG_FILE,'utf8');assert.equal(privateLog.includes('private statement input'),false);assert.equal(privateLog.includes('PRIVATE OCR AMOUNT'),false);assert.ok(privateLog.includes('账单数据已脱敏'));

 globalThis.fetch=async()=>new Response(JSON.stringify({choices:[{finish_reason:'length',message:{content:null,reasoning_content:'思考内容'}}],usage:{completion_tokens:1400}}),{status:200});
 await assert.rejects(complete('system','weekly'),/耗尽了输出额度/);
 assert.equal(recentAiEvents()[0].finishReason,'length');
});

after(()=>{globalThis.fetch=originalFetch;console.log=originalLog;db.close();rmSync(dir,{recursive:true,force:true});});

test('logs redact arbitrary configured credentials, nested secrets and inline image bytes',async()=>{
 const {logAiEvent,registerAiSecret}=await import('../server/core/ai-log.mjs');
 const secret='opaque-secret-not-sk-123';registerAiSecret(secret);
 const result=logAiEvent({stage:'error',error:`upstream echoed ${secret}`,nested:{apiKey:'another-value',image:'data:image/png;base64,YWJjZGVm'},request:{Authorization:'Bearer token'}});
 const serialized=JSON.stringify(result);assert.equal(serialized.includes(secret),false);assert.equal(serialized.includes('another-value'),false);assert.equal(serialized.includes('YWJjZGVm'),false);
 assert.ok(serialized.includes('OMITTED_BINARY'));
});
