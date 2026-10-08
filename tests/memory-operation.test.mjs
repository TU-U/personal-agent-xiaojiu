import {test,after} from 'node:test';import assert from 'node:assert/strict';import {mkdtemp,rm} from 'node:fs/promises';import path from 'node:path';import os from 'node:os';import {spawnSync} from 'node:child_process';
const root=await mkdtemp(path.join(os.tmpdir(),'memory-operation-'));Object.assign(process.env,{DATA_DIR:root,SEED_DEMO:'false',WORKER_MODE:'true'});
const {db,save,get,all,remove}=await import('../server/store.mjs');const {createMemory,patchMemory}=await import('../server/domain/memory/memory-state.mjs');
test('create replay survives a fresh process and different content cannot reuse the operation ID',()=>{
 const body={opId:'create-one-op',content:'可重试的事实',scope:'通用'},memory=createMemory(body);assert.equal(createMemory(body).id,memory.id);assert.equal(all('memory').length,1);
 assert.throws(()=>createMemory({...body,content:'不同内容'}),e=>e.status===409);
 const child=spawnSync(process.execPath,['--input-type=module','-e',`const {createMemory}=await import('./server/domain/memory/memory-state.mjs');const {db}=await import('./server/store.mjs');console.log(createMemory(${JSON.stringify(body)}).id);db.close();`],{env:process.env,encoding:'utf8',timeout:10000});assert.equal(child.status,0,child.stderr);assert.equal(child.stdout.trim(),memory.id);
 remove(memory.id,'memory',memory.revision);assert.throws(()=>createMemory(body),e=>e.status===410);
});
test('active editing and activation replay do not create another candidate or repeat checking',async()=>{
 const active=save('memory',{content:'旧事实',scope:'通用',status:'active'}),edit={opId:'edit-one-op',revision:active.revision,content:'新事实'};
 const candidate=await patchMemory(active.id,edit);assert.equal((await patchMemory(active.id,edit)).id,candidate.id);
 const activate={opId:'activate-one-op',revision:candidate.revision,status:'active'};let calls=0;
 const result=await patchMemory(candidate.id,activate,{check:async()=>{calls++;return null;}});
 assert.equal((await patchMemory(candidate.id,activate,{check:async()=>assert.fail()})).revision,result.revision);assert.equal(calls,1);assert.equal(get(active.id,'memory').status,'paused');
});
test('conflict response itself replays without changing candidate revision',async()=>{
 const old=save('memory',{content:'冲突旧事实',scope:'通用',status:'active'}),candidate=createMemory({content:'冲突新事实',scope:'通用'}),body={opId:'conflict-one-op',revision:candidate.revision,status:'active'};
 let first;await assert.rejects(patchMemory(candidate.id,body,{check:async()=>({...old,conflictKind:'update',conflictReason:'事实更新'})}),e=>{first=e.current;return e.status===409;});
 await assert.rejects(patchMemory(candidate.id,body,{check:async()=>assert.fail()}),e=>{assert.deepEqual(e.current,first);return e.status===409;});assert.equal(get(candidate.id,'memory').revision,first.memory.revision);
});
test('two confirmations replacing the same old memory cannot both activate',async()=>{
 const old=save('memory',{content:'待替代事实',scope:'通用',status:'active'});
 const candidates=[];
 for(const content of ['替代A','替代B']){const candidate=createMemory({content,scope:'通用'});await assert.rejects(patchMemory(candidate.id,{revision:candidate.revision,status:'active'},{check:async()=>({...old,conflictKind:'update',conflictReason:'替代同一事实'})}),e=>{candidates.push(e.current.memory);return e.status===409;});}
 let enter,release;const entered=new Promise(r=>enter=r),gate=new Promise(r=>release=r);
 const body=memory=>({opId:'concurrent-'+memory.id,revision:memory.revision,status:'active',replace:[{id:old.id,revision:old.revision}]});
 const first=patchMemory(candidates[0].id,body(candidates[0]),{check:async()=>{enter();await gate;return null;}});await entered;
 await patchMemory(candidates[1].id,body(candidates[1]),{check:async()=>null});release();await assert.rejects(first,e=>e.status===409);
 assert.equal(get(candidates[0].id,'memory').status,'candidate');assert.equal(get(candidates[1].id,'memory').status,'active');assert.equal(get(old.id,'memory').supersededBy,candidates[1].id);
});
after(async()=>{db.close();await rm(root,{recursive:true,force:true});});
