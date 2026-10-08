import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
const root=await mkdtemp(path.join(os.tmpdir(),'library-image-'));
Object.assign(process.env,{DATA_DIR:root,SEED_DEMO:'false',WORKER_MODE:'true'});
const {db,get,save,remove,setSetting}=await import('../server/store.mjs');
const {analyzeLibraryImage,libraryRoot}=await import('../server/domain/library/library.mjs');
await mkdir(libraryRoot,{recursive:true});
const bytes=Buffer.from('isolated image fixture'),hash=createHash('sha256').update(bytes).digest('hex');
await writeFile(path.join(libraryRoot,'fixture.png'),bytes);
const fixture=()=>save('libraryFile',{title:'改名不带扩展名',copyName:'fixture.png',hash,status:'copied',content:'原正文',error:'旧错误'});
function gate(){let release,entered;const started=new Promise(r=>entered=r),result=new Promise(r=>release=r);return {started,release,complete:async()=>{entered();return result;}};}
test('same revision shares in-flight analysis and saves exactly one new version',async()=>{
 const f=fixture(),g=gate();let calls=0;
 const complete=async(...args)=>{calls++;assert.equal(args[3].requireComplete,true);assert.equal(args[3].userContent[1].image_url.url,'data:image/png;base64,'+bytes.toString('base64'));return g.complete();};
 const first=analyzeLibraryImage(f.id,{revision:f.revision},{complete});await g.started;
 const second=analyzeLibraryImage(f.id,{revision:f.revision},{complete});g.release('图片归纳');
 const results=await Promise.all([first,second]);assert.equal(calls,1);assert.equal(results[0].revision,f.revision+1);assert.equal(results[1].revision,results[0].revision);
 const saved=get(f.id,'libraryFile');assert.equal(saved.content,'图片归纳');assert.equal(saved.error,'');assert.equal(saved.parse.method,'vision');
});
test('late image output cannot overwrite edits or revive archived, skipped or deleted sources',async()=>{
 for(const action of ['edit','archived','skipped','delete']){
  const f=fixture(),g=gate(),pending=analyzeLibraryImage(f.id,{revision:f.revision},{complete:g.complete});await g.started;
  if(action==='delete')remove(f.id,'libraryFile',f.revision);else save('libraryFile',{...f,...(action==='edit'?{title:'人工修改',content:'人工正文'}:{status:action})},f.revision);
  const expected=get(f.id,'libraryFile');g.release('迟到的正文');await assert.rejects(pending,e=>e.status===409);assert.deepEqual(get(f.id,'libraryFile'),expected);
 }
});
test('configuration change rejects late result; failed and empty attempts can be retried',async()=>{
 const f=fixture(),g=gate();setSetting('capabilityConfigRevision',10);
 const pending=analyzeLibraryImage(f.id,{revision:f.revision},{complete:g.complete});await g.started;setSetting('capabilityConfigRevision',11);g.release('旧配置结果');await assert.rejects(pending,e=>e.status===409);
 await assert.rejects(analyzeLibraryImage(f.id,{revision:f.revision},{complete:async()=> '  '}),e=>e.status===502);
 await assert.rejects(analyzeLibraryImage(f.id,{revision:f.revision},{complete:async()=>{throw new Error('provider failure');}}),/provider failure/);
 assert.equal(get(f.id,'libraryFile').revision,f.revision);
 await analyzeLibraryImage(f.id,{revision:f.revision},{complete:async()=> '重试成功'});assert.equal(get(f.id,'libraryFile').content,'重试成功');
});
test('invalid revision, state and copy checksum fail before calling provider',async()=>{
 const f=fixture();let calls=0;const dependencies={complete:async()=>{calls++;return '不应调用';}};
 await assert.rejects(analyzeLibraryImage(f.id,{revision:f.revision+1},dependencies),e=>e.status===409);
 let current=save('libraryFile',{...f,status:'archived'},f.revision);
 await assert.rejects(analyzeLibraryImage(f.id,{revision:current.revision},dependencies),e=>e.status===409);
 current=save('libraryFile',{...current,status:'copied',hash:'wrong'},current.revision);
 await assert.rejects(analyzeLibraryImage(f.id,{revision:current.revision},dependencies),e=>e.status===409);
 assert.equal(calls,0);
});
after(async()=>{db.close();await rm(root,{recursive:true,force:true});});
