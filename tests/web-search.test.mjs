import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const dir=mkdtempSync(join(tmpdir(),'shiguang-web-search-'));process.env.DATA_DIR=dir;process.env.SEED_DEMO='false';process.env.BRAVE_SEARCH_API_KEY='test-search-key';
const originalFetch=globalThis.fetch;
const {searchWeb}=await import('../server/ai/web/web-search.mjs');const {db}=await import('../server/store.mjs');
after(()=>{globalThis.fetch=originalFetch;delete process.env.BRAVE_SEARCH_API_KEY;db.close();rmSync(dir,{recursive:true,force:true});});
test('web search sends only the complete question and labels snippets separately from page text',async()=>{
 globalThis.fetch=async(url,options)=>{assert.equal(new URL(url).searchParams.get('q'),'Ozon 最近的物流要求');assert.equal(options.headers['X-Subscription-Token'],'test-search-key');assert.equal(options.redirect,'error');return new Response(JSON.stringify({web:{results:[{title:'官方物流说明',url:'https://example.com/ozon',description:'物流要求和更新时间。'},{url:'javascript:alert(1)'},{url:'https://user:pass@example.com/'}]}}));};
 const results=await searchWeb('Ozon 最近的物流要求');assert.equal(results.length,1);assert.equal(results[0].kind,'web');assert.equal(results[0].evidenceType,'search_snippet');assert.ok(results[0].retrievedAt);assert.equal(results[0].url,'https://example.com/ozon');
});
test('invalid question and missing config fail before any request without silent truncation',async()=>{
 let calls=0;globalThis.fetch=async()=>{calls++;throw new Error('must not call');};
 for(const query of ['',null,'字'.repeat(601),'word '.repeat(76)])await assert.rejects(searchWeb(query),e=>e.code==='WEB_INPUT');
 await assert.rejects(searchWeb('question',{key:''}),e=>e.code==='SEARCH_UNAVAILABLE');assert.equal(calls,0);
});
test('forbidden, rate limited and unavailable responses retain distinct classifications',async()=>{
 for(const [status,code] of [[401,'WEB_FORBIDDEN'],[403,'WEB_FORBIDDEN'],[429,'WEB_RATE_LIMIT'],[422,'WEB_INPUT'],[500,'SEARCH_UNAVAILABLE']]){globalThis.fetch=async()=>new Response('{}',{status});await assert.rejects(searchWeb('question'),e=>e.code===code&&e.upstreamStatus===status&&e.status===([429,422].includes(status)?status:502));}
 globalThis.fetch=async()=>new Response('{');await assert.rejects(searchWeb('question'),e=>e.code==='WEB_RESPONSE');
});
test('caller cancellation interrupts response-body reading and preserves its identity',async()=>{
 const controller=new AbortController(),reason=new Error('user cancelled');let ready;const started=new Promise(resolve=>{ready=resolve;});
 globalThis.fetch=async()=>new Response(new ReadableStream({start(){ready();}}));
 const pending=searchWeb('question',{signal:controller.signal});await started;controller.abort(reason);await assert.rejects(pending,e=>e===reason);
 let calls=0;globalThis.fetch=async()=>{calls++;};await assert.rejects(searchWeb('question',{signal:controller.signal}),e=>e===reason);assert.equal(calls,0);
});
