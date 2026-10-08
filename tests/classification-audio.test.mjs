import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
test('classification reads both audio notes and transcript; stale summary and empty transcript are not evidence',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'shiguang-classification-audio-'));
 Object.assign(process.env,{DATA_DIR:dir,SEED_DEMO:'false',WORKER_MODE:'true'});
 const oldFetch=globalThis.fetch,oldLog=console.log;
 const {db,save,get,setSetting}=await import('../server/store.mjs');
 try{
  const {ensureCategories}=await import('../server/domain/notes/categories.mjs');ensureCategories();
  const {classificationHandlers,enqueueClassification}=await import('../server/domain/notes/classification.mjs');
  setSetting('provider',{baseUrl:'https://example.invalid',model:'classifier-test'});
  let prompt='',calls=0;console.log=()=>{};
  globalThis.fetch=async(_url,options)=>{calls++;prompt=JSON.parse(options.body).messages[1].content;return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify({categoryId:'category-idea',reason:'录音中的产品想法'})}}]}));};
  const handler=classificationHandlers['classify-note'];
  const transcript={segments:[{startMs:0,endMs:1000,speakerId:'speaker_1',text:'给记录增加离线整理的灵感'}]};
  const note=save('note',{title:'录音',content:'下午散步时录制',type:'audio',attachments:[],transcript});
  const job=enqueueClassification(note),result=await handler.run(job);
  assert.match(prompt,/下午散步时录制/);assert.match(prompt,/给记录增加离线整理的灵感/);assert.match(prompt,/识别可能有误/);assert.match(prompt,/说话人 1/);
  handler.commit(job,result);
  const saved=get(note.id,'note');assert.equal(saved.categoryId,'category-idea');assert.equal(saved.classification.promptVersion,'note-category-v2');assert.deepEqual(saved.transcript,transcript);assert.equal(saved.content,note.content);
  for(const extra of [{summaryMode:'ai',summary:'已过期的摘要',summaryStale:true},{transcript:{segments:[{startMs:0,endMs:1000,speakerId:null,text:'  '}]}}]){
   const empty=save('note',{title:'未转写',content:'',attachments:[],...extra});
   await assert.rejects(handler.run(enqueueClassification(empty)),/尚无可读取文字/);
   assert.equal(get(empty.id,'note').categoryId,undefined);
  }
  assert.equal(calls,1);
 }finally{globalThis.fetch=oldFetch;console.log=oldLog;db.close();rmSync(dir,{recursive:true,force:true});}
});
