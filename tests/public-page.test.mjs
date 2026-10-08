import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createPublicPageReader} from '../server/ai/web/public-page.mjs';
const resolve=async()=>[{address:'93.184.215.14',family:4}];
test('page slices retain stable full-text hash, offsets, retrieval time and evidence type',async()=>{
 const html='<html><script>do not quote this</script><p>'+ 'abcdefghij'.repeat(4000)+'</p></html>',read=createPublicPageReader({resolve,request:async()=>new Response(html,{headers:{'content-type':'text/html'}})});
 const first=await read('https://example.com/'),next=await read('https://example.com/',{start:first.end,limit:1000,expectedHash:first.contentHash});assert.equal(first.total,40000);assert.equal(first.text.length,24000);assert.equal(first.truncated,true);assert.equal(first.contentHash,next.contentHash);assert.equal(next.start,24000);assert.equal(next.end,25000);assert.equal(next.evidenceType,'web_page');assert.ok(next.readAt);assert.equal(next.text,'abcdefghij'.repeat(100));
 await assert.rejects(read('https://example.com/',{start:24000,expectedHash:'a'.repeat(64)}),e=>e.code==='WEB_STALE');
});
test('redirect bodies are closed and every redirect DNS result is checked before transport',async()=>{
 let requests=0,cancelled=0;const read=createPublicPageReader({resolve:async host=>[{address:host==='private.example'?'127.0.0.1':'93.184.215.14',family:4}],request:async()=>{requests++;return new Response(new ReadableStream({cancel(){cancelled++;}}),{status:302,headers:{location:'http://private.example/'}});}});
 await assert.rejects(read('https://public.example/'),e=>e.code==='WEB_FORBIDDEN');assert.equal(requests,1);assert.equal(cancelled,1);
 const mixed=createPublicPageReader({resolve:async()=>[{address:'93.184.215.14',family:4},{address:'10.0.0.1',family:4}],request:async()=>{throw new Error('must not request');}});await assert.rejects(mixed('https://example.com/'),e=>e.code==='WEB_FORBIDDEN');
});
test('cancellation stops pending DNS or response body without converting to unavailability',async()=>{
 for(const stage of ['dns','body']){
  const controller=new AbortController(),reason=new Error('cancel '+stage);let ready;const started=new Promise(r=>{ready=r;});
  const read=createPublicPageReader({resolve:stage==='dns'?()=>{ready();return new Promise(()=>{});}:resolve,request:async()=>new Response(new ReadableStream({start(){ready();}}),{headers:{'content-type':'text/plain'}})});
  const pending=read('https://example.com/',{signal:controller.signal});await started;controller.abort(reason);await assert.rejects(pending,e=>e===reason);
 }
});
test('oversize, unsupported content and HTTP permissions remain distinct errors',async()=>{
 const cases=[{response:()=>new Response('a'.repeat(2*1024*1024+1),{headers:{'content-type':'text/plain'}}),code:'WEB_SIZE'},{response:()=>new Response('bytes',{headers:{'content-type':'application/pdf'}}),code:'WEB_CONTENT'},{response:()=>new Response('denied',{status:403}),code:'WEB_FORBIDDEN'},{response:()=>new Response('wait',{status:429}),code:'WEB_RATE_LIMIT'}];
 for(const c of cases){const read=createPublicPageReader({resolve,request:async()=>c.response()});await assert.rejects(read('https://example.com/'),e=>e.code===c.code);}
});
