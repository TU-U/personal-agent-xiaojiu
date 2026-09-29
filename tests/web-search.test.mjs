import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

test('web search sends only the question and returns clickable cited snippets',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'shiguang-web-search-'));
 process.env.DATA_DIR=dir;
 process.env.BRAVE_SEARCH_API_KEY='test-search-key';
 const originalFetch=globalThis.fetch;
 try{
  const {searchWeb}=await import('../server/web-search.mjs');
  globalThis.fetch=async(url,options)=>{
   assert.equal(new URL(url).searchParams.get('q'),'Ozon 最近的物流要求');
   assert.equal(options.headers['X-Subscription-Token'],'test-search-key');
   return new Response(JSON.stringify({web:{results:[{title:'官方物流说明',url:'https://example.com/ozon',description:'物流要求和更新时间。'},{title:'无效链接',url:'javascript:alert(1)',description:'忽略'}]}}),{status:200,headers:{'Content-Type':'application/json'}});
  };
  const results=await searchWeb('Ozon 最近的物流要求');
  assert.equal(results.length,1);
  assert.equal(results[0].kind,'web');
  assert.equal(results[0].url,'https://example.com/ozon');
 }finally{globalThis.fetch=originalFetch;delete process.env.BRAVE_SEARCH_API_KEY;rmSync(dir,{recursive:true,force:true});}
});
