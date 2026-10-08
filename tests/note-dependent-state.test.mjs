import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const root=await mkdtemp(join(tmpdir(),'note-dependent-state-'));Object.assign(process.env,{DATA_DIR:root,SEED_DEMO:'false',WORKER_MODE:'true'});
const {db,get,save,transaction}=await import('../server/store.mjs');
const {markNoteMemoriesChanged}=await import('../server/domain/memory/memory-source.mjs');
const {fileJobs,cancelNoteJobs}=await import('../server/jobs/file-jobs.mjs');
after(async()=>{db.close();await rm(root,{recursive:true,force:true});});
test('source changes retire legacy and structured active memories; cancelling its jobs leaves other sources alone',()=>{
 const note=save('note',{content:'原文'});
 const legacy=save('memory',{sourceId:note.id,status:'active',content:'旧事实'}),structured=save('memory',{sourceRef:{kind:'note',id:note.id,revision:note.revision},status:'active'}),paused=save('memory',{sourceId:note.id,status:'paused'}),other=save('memory',{sourceId:'other',status:'active'});
 const pending=fileJobs.enqueue({key:'note-parse',kind:'parse-file',entityId:note.id,revision:note.revision}),running=fileJobs.enqueue({key:'note-audio',kind:'transcribe-audio',entityId:note.id,revision:note.revision}),unrelated=fileJobs.enqueue({key:'other-audio',kind:'transcribe-audio',entityId:'other',revision:1});fileJobs.claim(running.id,'worker',60000);
 transaction(()=>{markNoteMemoriesChanged(note.id);cancelNoteJobs(note.id);});
 assert.equal(get(legacy.id,'memory').status,'candidate');assert.equal(get(structured.id,'memory').status,'candidate');assert.equal(get(paused.id,'memory').status,'paused');assert.equal(get(other.id,'memory').status,'active');assert.equal(fileJobs.get(pending.id).state,'cancelled');assert.equal(fileJobs.get(running.id).state,'cancelled');assert.equal(fileJobs.get(unrelated.id).state,'pending');
 let committed=false;assert.equal(fileJobs.finish(running.id,'worker',{},()=>{committed=true;}),false);assert.equal(committed,false);
});
