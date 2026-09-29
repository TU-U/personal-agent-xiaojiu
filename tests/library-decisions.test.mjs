import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
const directory=mkdtempSync(path.join(os.tmpdir(),'library-decisions-'));
Object.assign(process.env,{DATA_DIR:directory,SEED_DEMO:'false',WORKER_MODE:'true'});
const {db,save,get,getSetting,setSetting,remove}=await import('../server/store.mjs');
const {decideLibraryBatch,libraryActions}=await import('../server/library-decisions.mjs');
const ref=file=>({id:file.id,revision:file.revision});
test('batch validation is atomic and reports every stale/missing/unsupported selection without touching valid rows',()=>{
 const valid=save('libraryFile',{title:'有效',status:'pending'}),stale=save('libraryFile',{title:'已变化',status:'pending'}),deleted=save('libraryFile',{title:'删除',status:'failed'}),ready=save('libraryFile',{title:'已完成',status:'ready'});
 save('libraryFile',{...stale,title:'改名'},stale.revision);remove(deleted.id,'libraryFile',deleted.revision);
 const before=db.prepare('SELECT COUNT(*) n FROM changes').get().n;
 assert.throws(()=>decideLibraryBatch({opId:'atomic-batch',action:'copy',items:[valid,stale,deleted,ready].map(ref)}),e=>{
  assert.equal(e.status,409);assert.deepEqual(new Set(e.current.invalid.map(x=>x.id)),new Set([stale.id,deleted.id,ready.id]));return true;
 });
 assert.equal(get(valid.id,'libraryFile').status,'pending');assert.equal(db.prepare('SELECT COUNT(*) n FROM changes').get().n,before);assert.equal(getSetting('libraryJob'),null);
 assert.equal(db.prepare("SELECT 1 FROM operations WHERE id='library-decision:atomic-batch'").get(),undefined);
});
test('successful batch and scheduling commit together, pause is respected and lost-response retry is idempotent',()=>{
 const first=save('libraryFile',{title:'一',status:'pending'}),second=save('libraryFile',{title:'二',status:'failed'});
 setSetting('libraryJob',{status:'paused',resumeStatus:'scanning',queue:['目录']});
 const body={opId:'retryable-batch',action:'copy',items:[first,second].map(ref)};
 const result=decideLibraryBatch(body);assert.ok(result.items.every(x=>x.status==='queued'));assert.equal(getSetting('libraryJob').status,'paused');
 const current=get(first.id,'libraryFile');save('libraryFile',{...current,status:'ready'},current.revision);
 assert.deepEqual(decideLibraryBatch({...body,items:[...body.items].reverse()}),result);assert.equal(get(first.id,'libraryFile').status,'ready');
 assert.throws(()=>decideLibraryBatch({...body,action:'skip'}),e=>e.status===409);
 const skip=decideLibraryBatch({opId:'skip-queued',action:'skip',items:[ref(get(second.id,'libraryFile'))]});assert.equal(skip.items[0].status,'skipped');
 setSetting('libraryJob',{status:'done'});
 const retry=decideLibraryBatch({opId:'copy-skipped',action:'copy',items:[ref(get(second.id,'libraryFile'))]});assert.equal(retry.items[0].status,'queued');assert.equal(getSetting('libraryJob').status,'copying');
});
test('malformed input and a failing database write never leave a partially applied batch',()=>{
 const first=save('libraryFile',{title:'先写',status:'pending'}),second=save('libraryFile',{id:'force-failure',title:'后写',status:'pending'});
 for(const items of [[],[ref(first),ref(first)],Array.from({length:101},(_,i)=>({id:'x'+i,revision:1})),[{id:first.id,revision:'1'}]])assert.throws(()=>decideLibraryBatch({opId:'bad-request',action:'copy',items}),e=>e.status===400);
 db.exec("CREATE TEMP TRIGGER fail_second BEFORE UPDATE ON entities WHEN NEW.id='force-failure' BEGIN SELECT RAISE(ABORT,'simulated write failure'); END;");
 try{assert.throws(()=>decideLibraryBatch({opId:'rollback-test',action:'skip',items:[first,second].map(ref)}),/simulated write failure/);}finally{db.exec('DROP TRIGGER fail_second');}
 assert.equal(get(first.id,'libraryFile').revision,first.revision);assert.equal(get(first.id,'libraryFile').status,'pending');
 assert.deepEqual(libraryActions({status:'ready'}),[]);assert.deepEqual(libraryActions({status:'copying'}),[]);assert.deepEqual(libraryActions({status:'archived'}),[]);
});
after(()=>{db.close();rmSync(directory,{recursive:true,force:true});});
