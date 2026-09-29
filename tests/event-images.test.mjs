import {test,after} from 'node:test';import assert from 'node:assert/strict';
import {mkdtemp,rm,writeFile,readFile,readdir,copyFile,mkdir} from 'node:fs/promises';import path from 'node:path';import os from 'node:os';
const root=await mkdtemp(path.join(os.tmpdir(),'event-images-'));Object.assign(process.env,{DATA_DIR:root,SEED_DEMO:'false',WORKER_MODE:'true'});
const {db,save,get,remove}=await import('../server/store.mjs');const {copyEventImages,discardEventImages,assertEventImageSource}=await import('../server/event-images.mjs');const {initializeEventLifecycle:create,editEventLifecycle:edit}=await import('../server/event-lifecycle.mjs');
const uploads=path.join(root,'uploads');await mkdir(uploads,{recursive:true});
async function note(prefix){const attachments=[];for(let i=0;i<2;i++){const key=prefix+i,bytes=Buffer.from('original-'+key);await writeFile(path.join(uploads,key),bytes);attachments.push({id:key,key,name:key+'.png',mime:'image/png',size:bytes.length});}return save('note',{title:prefix,content:'来源',attachments});}
test('second copy failure cleans all staged files and preserves originals and saved event images',async()=>{
 const source=await note('failure'),images=await copyEventImages(source),event=create({title:'已有快照',eventType:'one_off',priority:'normal',images});const before=(await readdir(uploads)).sort();let copies=0;
 await assert.rejects(copyEventImages(source,{copy:async(a,b)=>{await copyFile(a,b);if(++copies===2)throw new Error('second copy failure');}}),/无法复制/);
 assert.deepEqual((await readdir(uploads)).sort(),before);assert.deepEqual(get(event.id,'event').images,images);
 for(const image of images)assert.ok((await readFile(path.join(uploads,image.key))).length);
});
test('source revision changes during copy and between copy/commit reject without writing event',async()=>{
 let source=await note('race');const before=(await readdir(uploads)).sort();let changed=false;
 await assert.rejects(copyEventImages(source,{copy:async(a,b)=>{await copyFile(a,b);if(!changed){changed=true;save('note',{...source,content:'变化'},source.revision);}}}),/来源记录已变化/);assert.deepEqual((await readdir(uploads)).sort(),before);
 source=get(source.id,'note');const images=await copyEventImages(source);save('note',{...source,content:'提交前变化'},source.revision);
 try{assert.throws(()=>create({title:'不可提交',eventType:'one_off',priority:'normal',images},{assertCurrent:()=>assertEventImageSource(source)}),/来源记录已变化/);}finally{await discardEventImages(images);}
 assert.deepEqual((await readdir(uploads)).sort(),before);
});
test('corrupt copy is rejected; verified snapshots survive deleting the source',async()=>{
 const source=await note('integrity'),before=(await readdir(uploads)).sort();await assert.rejects(copyEventImages(source,{copy:async(_a,b)=>writeFile(b,'damaged')}),/校验和/);assert.deepEqual((await readdir(uploads)).sort(),before);
 const images=await copyEventImages(source);assert.match(images[0].sha256,/^[a-f0-9]{64}$/);assert.equal(images[0].sourceRevision,source.revision);assert.notEqual(images[0].key,source.attachments[0].key);
 const event=create({title:'独立图片',eventType:'one_off',priority:'normal',images,sourceNoteId:source.id},{assertCurrent:()=>assertEventImageSource(source)});
 remove(source.id,'note',source.revision);for(const attachment of source.attachments)await rm(path.join(uploads,attachment.key));
 for(const image of get(event.id,'event').images)assert.ok((await readFile(path.join(uploads,image.key))).length);
 const edited=edit(event.id,{...event,title:'来源删除仍可编辑'},event.revision);assert.deepEqual(edited.images,images);
});
after(async()=>{db.close();await rm(root,{recursive:true,force:true});});
