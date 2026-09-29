import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';import path from 'node:path';
const root=await mkdtemp(path.join(os.tmpdir(),'memory-state-'));Object.assign(process.env,{DATA_DIR:root,SEED_DEMO:'false',WORKER_MODE:'true'});
const {db,save,get,all}=await import('../server/store.mjs');
const {patchMemory}=await import('../server/memory-state.mjs');
const memory=(content,status='candidate')=>save('memory',{content,scope:'通用',status});
const none={check:async()=>null};
test('manual enable and paused restore check conflicts; only server-checked replacements may be applied',async()=>{
 const old=memory('住深圳','active'),candidate=memory('住广州');
 const conflict={...old,conflictKind:'update',conflictReason:'居住地更新'};
 let current;await assert.rejects(patchMemory(candidate.id,{revision:candidate.revision,status:'active'},{check:async()=>conflict}),e=>{current=e.current;return e.status===409;});
 assert.equal(get(candidate.id,'memory').status,'candidate');assert.equal(get(old.id,'memory').status,'active');
 await assert.rejects(patchMemory(candidate.id,{revision:current.memory.revision,status:'active',replace:[{id:'forged',revision:1}]},none),e=>e.status===409);
 const activated=await patchMemory(candidate.id,{revision:current.memory.revision,status:'active',replace:[{id:old.id,revision:old.revision}]},none);
 assert.equal(activated.status,'active');assert.equal(get(old.id,'memory').status,'paused');assert.equal(get(old.id,'memory').supersededBy,candidate.id);
 let called=0;await assert.rejects(patchMemory(old.id,{revision:get(old.id,'memory').revision,status:'active'},{check:async()=>{called++;throw new Error('model down');}}),/model down/);assert.equal(called,1);assert.equal(get(old.id,'memory').status,'paused');
});
test('editing active memory creates a candidate and preserves original until explicit confirmation',async()=>{
 const old=memory('喜欢短句','active');const edited=await patchMemory(old.id,{revision:old.revision,content:'喜欢详细说明'},none);
 assert.notEqual(edited.id,old.id);assert.equal(edited.status,'candidate');assert.equal(get(old.id,'memory').status,'active');assert.equal(get(old.id,'memory').content,'喜欢短句');
 await patchMemory(edited.id,{revision:edited.revision,status:'active'},none);assert.equal(get(old.id,'memory').status,'paused');
 const active=get(edited.id,'memory');const paused=await patchMemory(active.id,{revision:active.revision,status:'paused'},none);assert.equal((await patchMemory(paused.id,{revision:paused.revision,status:'active'},none)).status,'active');
});
test('concurrent activation invalidates the second snapshot; failure never writes active state',async()=>{
 const a=memory('并发A'),b=memory('并发B');let release,entered;const started=new Promise(r=>entered=r),gate=new Promise(r=>release=r);
 const pending=patchMemory(a.id,{revision:a.revision,status:'active'},{check:async()=>{entered();await gate;return null;}});await started;
 await patchMemory(b.id,{revision:b.revision,status:'active'},none);release();await assert.rejects(pending,e=>e.status===409);assert.equal(get(a.id,'memory').status,'candidate');
});
test('source changes during check and content plus active in one request are rejected',async()=>{
 const note=save('note',{content:'来源'}),candidate=save('memory',{content:'记忆',scope:'通用',status:'candidate',sourceId:note.id,sourceRevision:note.revision});
 await assert.rejects(patchMemory(candidate.id,{revision:candidate.revision,status:'active',content:'改写'},none),e=>e.status===400);
 await assert.rejects(patchMemory(candidate.id,{revision:candidate.revision,status:'active'},{check:async()=>{save('note',{...note,content:'来源已改变'},note.revision);return null;}}),e=>e.status===409);
 assert.equal(get(candidate.id,'memory').status,'candidate');
});
test('failure writing the new active memory rolls back old-memory replacement',async()=>{
 const old=memory('旧事实事务','active'),candidate=memory('新事实事务');let checked;
 await assert.rejects(patchMemory(candidate.id,{revision:candidate.revision,status:'active'},{check:async()=>({...old,conflictReason:'更新',conflictKind:'update'})}),e=>{checked=e.current.memory;return e.status===409;});
 db.exec(`CREATE TRIGGER fail_memory_activation BEFORE UPDATE ON entities WHEN NEW.id='${candidate.id}' AND json_extract(NEW.data,'$.status')='active' BEGIN SELECT RAISE(ABORT,'test write failure'); END`);
 try{await assert.rejects(patchMemory(candidate.id,{revision:checked.revision,status:'active',replace:[{id:old.id,revision:old.revision}]},none),/test write failure/);}finally{db.exec('DROP TRIGGER fail_memory_activation');}
 assert.equal(get(old.id,'memory').status,'active');assert.equal(get(old.id,'memory').revision,old.revision);assert.equal(get(candidate.id,'memory').status,'candidate');
});
after(async()=>{db.close();await rm(root,{recursive:true,force:true});});
