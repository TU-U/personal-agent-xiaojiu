import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createServer} from 'node:http';
const dir=mkdtempSync(join(tmpdir(),'shiguang-model-receipt-'));
process.env.DATA_DIR=dir;
const {requestCompletion}=await import('../server/ai/model-completion.mjs');
const originalFetch=globalThis.fetch,originalLog=console.log;
console.log=()=>{};
const config={baseUrl:'https://api.deepseek.com',model:'deepseek-flash',apiKey:'private-test-value'};
const usage={prompt_tokens:20,completion_tokens:5,total_tokens:25,prompt_cache_hit_tokens:10,prompt_cache_miss_tokens:10};
function response(content='正文',finish_reason='stop'){return new Response(JSON.stringify({model:'deepseek-flash',choices:[{message:{content},finish_reason}],usage:{...usage,secret:'must-not-persist'}}));}
after(()=>{globalThis.fetch=originalFetch;console.log=originalLog;rmSync(dir,{recursive:true,force:true});});
test('text callers stay compatible; receipts expose only metering fields and fixed provider request',async()=>{
 let sent;
 globalThis.fetch=async(url,options)=>{sent={url,payload:JSON.parse(options.body)};return response();};
 assert.equal(await requestCompletion(config,'system','user'),'正文');
 const result=await requestCompletion(config,'system','user',null,{returnDetails:true,maxTokens:128});
 assert.equal(result.content,'正文');assert.deepEqual(result.usage,usage);
 assert.equal(result.finishReason,'stop');assert.equal(result.model,'deepseek-flash');assert.ok(result.callId);
 assert.equal(sent.payload.max_tokens,128);assert.deepEqual(sent.payload.thinking,{type:'disabled'});
 assert.equal(JSON.stringify(result).includes(config.apiKey),false);assert.equal(JSON.stringify(result).includes('must-not-persist'),false);
});
test('paid empty and truncated responses preserve usage on failure; malformed usage stays unknown',async()=>{
 for(const [content,finish,code] of [['','stop','MODEL_EMPTY'],['partial','length','MODEL_TRUNCATED']]){
  globalThis.fetch=async()=>response(content,finish);
  await assert.rejects(requestCompletion(config,'s','u',null,{requireComplete:true}),error=>{assert.equal(error.code,code);assert.deepEqual(error.receipt.usage,usage);return true;});
 }
 globalThis.fetch=async()=>new Response(JSON.stringify({choices:[{message:{content:'ok'}}],usage:{prompt_tokens:-1,completion_tokens:'5',total_tokens:1.5}}));
 assert.equal((await requestCompletion(config,'s','u',null,{returnDetails:true})).usage,null);
 for(const value of ['null','not-json']){
  globalThis.fetch=async()=>new Response(value);
  await assert.rejects(requestCompletion(config,'s','u'),error=>{assert.equal(error.receipt.usage,null);assert.ok(['MODEL_EMPTY','MODEL_JSON'].includes(error.code));return true;});
 }
});
test('unknown HTTP/network charges are not reported as zero and pre-cancel sends nothing',async()=>{
 globalThis.fetch=async()=>new Response('denied',{status:429});
 await assert.rejects(requestCompletion(config,'s','u'),error=>error.upstreamStatus===429&&error.receipt.usage===null);
 globalThis.fetch=async()=>{throw new Error(config.apiKey);};
 await assert.rejects(requestCompletion(config,'s','u'),error=>error.code==='MODEL_NETWORK'&&!error.message.includes(config.apiKey)&&error.receipt.usage===null);
 let calls=0;globalThis.fetch=async()=>{calls++;return response();};
 const controller=new AbortController();controller.abort();
 await assert.rejects(requestCompletion(config,'s','u',null,{signal:controller.signal}));assert.equal(calls,0);
 await assert.rejects(requestCompletion(config,'s','u',null,{maxTokens:0}));assert.equal(calls,0);
});
test('real HTTP timeout covers stalled response body; caller cancellation aborts in-flight read',async()=>{
 globalThis.fetch=originalFetch;
 const server=createServer((_request,response)=>{response.writeHead(200,{'Content-Type':'application/json'});response.write('{');});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const local={baseUrl:`http://127.0.0.1:${server.address().port}`,model:'test'};
 try{
  await assert.rejects(requestCompletion(local,'s','u',null,{timeoutMs:100}),error=>error.code==='MODEL_TIMEOUT'&&error.receipt.usage===null);
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),100);
  try{await assert.rejects(requestCompletion(local,'s','u',null,{signal:controller.signal}),error=>error.code==='MODEL_CANCELLED');}finally{clearTimeout(timer);}
 }finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});
