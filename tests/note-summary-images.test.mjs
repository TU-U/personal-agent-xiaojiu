import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {readSummaryImages} from '../server/domain/notes/note-summary-images.mjs';
test('text notes summarize all images and text; missing or unsupported images prevent partial results',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'shiguang-note-images-'));
 process.env.DATA_DIR=dir;process.env.SEED_DEMO='false';process.env.WORKER_MODE='true';
 const oldFetch=globalThis.fetch,oldLog=console.log;
 try{
  const {setSetting}=await import('../server/store.mjs');
  setSetting('provider',{baseUrl:'https://example.invalid',model:'text'});
  setSetting('visionProvider',{baseUrl:'https://example.invalid',model:'vision'});
  const {summarizeUpload}=await import('../server/ai/engine.mjs');
  const attachments=[1,2].map(i=>({id:'image-'+i,name:i+'.png',key:'image-'+i,mime:'image/png'}));
  for(const attachment of attachments)writeFileSync(join(dir,attachment.key),'synthetic-image-'+attachment.id);
  const note={id:'note',revision:3,type:'text',title:'带图文字',content:'必须保留的用户补充',attachments};
  let payload,calls=0;console.log=()=>{};
  globalThis.fetch=async(_url,options)=>{calls++;payload=JSON.parse(options.body);return new Response(JSON.stringify({choices:[{message:{content:'文字和两张图的摘要'}}]}));};
  const images=await readSummaryImages(note,dir);
  assert.equal(await summarizeUpload(note,images),'文字和两张图的摘要');
  assert.equal(payload.model,'vision');assert.equal(payload.messages[1].content.length,3);
  assert.match(payload.messages[1].content[0].text,/必须保留的用户补充/);
  for(let i=0;i<2;i++)assert.equal(payload.messages[1].content[i+1].image_url.url,'data:image/png;base64,'+images[i].data.toString('base64'));
  await assert.rejects(readSummaryImages({...note,attachments:[attachments[0],{...attachments[1],mime:'image/tiff'}]},dir),/2.png/);
  rmSync(join(dir,attachments[1].key));await assert.rejects(readSummaryImages(note,dir),/2.png/);
  await assert.rejects(summarizeUpload({...note,content:'字'.repeat(24001)},images),/24,000/);
  let current=true;globalThis.fetch=async()=>{calls++;current=false;return new Response(JSON.stringify({choices:[{message:{content:'旧结果'}}]}));};
  await assert.rejects(summarizeUpload(note,images,{assertCurrent:()=>{if(!current)throw new Error('来源已更新');}}),/来源已更新/);
  assert.equal(calls,2);
 }finally{globalThis.fetch=oldFetch;console.log=oldLog;rmSync(dir,{recursive:true,force:true});}
});
