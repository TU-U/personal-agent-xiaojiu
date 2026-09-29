import {test,after} from 'node:test';import assert from 'node:assert/strict';import {mkdtemp,rm} from 'node:fs/promises';import path from 'node:path';import os from 'node:os';
const root=await mkdtemp(path.join(os.tmpdir(),'memory-source-'));Object.assign(process.env,{DATA_DIR:root,SEED_DEMO:'false',WORKER_MODE:'true'});
const {db,save,remove,get}=await import('../server/store.mjs');const {memorySourceValid}=await import('../server/memory-source.mjs');const {memoryApplies}=await import('../server/retrieval-scope.mjs');const {patchMemory}=await import('../server/memory-state.mjs');
test('stale or removed note source immediately invalidates active memory without touching its vector/revision',async()=>{
 const note=save('note',{content:'来源'}),memory=save('memory',{content:'事实',status:'active',scope:'通用',sourceId:note.id,sourceRevision:note.revision});
 assert.equal(memoryApplies(memory),true);const changed=save('note',{...note,content:'新来源'},note.revision);assert.equal(memoryApplies(memory),false);assert.equal(get(memory.id,'memory').revision,memory.revision);
 await assert.rejects(patchMemory(memory.id,{revision:memory.revision,status:'active'},{check:async()=>assert.fail('invalid source must fail before model')}),/来源已修改/);
 remove(note.id,'note',changed.revision);assert.equal(memorySourceValid(memory),false);
});
test('typed source refs enforce kinds, revisions and availability; missing version is not fabricated for legacy memory',()=>{
 const file=save('libraryFile',{content:'资料',status:'ready'}),base={content:'事实',status:'active',scope:'通用'};
 assert.equal(memorySourceValid({...base,sourceRef:{kind:'libraryFile',id:file.id,revision:file.revision}}),true);
 save('libraryFile',{...file,status:'archived'},file.revision);assert.equal(memorySourceValid({...base,sourceRef:{kind:'libraryFile',id:file.id}}),false);
 assert.equal(memorySourceValid({...base,sourceRef:{kind:'wrong',id:file.id}}),false);
 const note=save('note',{content:'旧来源'});assert.equal(memorySourceValid({...base,sourceId:note.id}),true);
});
test('conversation deletion and thread tombstone invalidate its memory; purpose restrictions remain',()=>{
 const thread=save('thread',{status:'active'}),turn=save('conversation',{threadId:thread.id,query:'事实',body:'回复'}),memory={content:'事实',status:'active',scope:'周报',sourceConversationId:turn.id};
 assert.equal(memoryApplies(memory),false);assert.equal(memoryApplies(memory,{purpose:'周报'}),true);
 save('thread',{...thread,status:'deleted'},thread.revision);assert.equal(memoryApplies(memory,{purpose:'周报'}),false);
 remove(turn.id,'conversation',turn.revision);assert.equal(memorySourceValid(memory),false);
});
test('typed source revision survives activation, editing and restoration; later source change still invalidates',async()=>{
 const event=save('event',{title:'有版本的来源',summary:'原事实'});
 const memory=save('memory',{content:'来源事实',status:'candidate',scope:'通用',sourceRef:{kind:'event',id:event.id},sourceRevision:event.revision});
 const active=await patchMemory(memory.id,{revision:memory.revision,status:'active'},{check:async()=>null});
 assert.equal(active.sourceRevision,event.revision);
 const edit=await patchMemory(active.id,{revision:active.revision,content:'人工修订来源事实'});
 assert.equal(edit.sourceRevision,event.revision);assert.deepEqual(edit.sourceRef,memory.sourceRef);
 const paused=await patchMemory(active.id,{revision:active.revision,status:'paused'});
 const restored=await patchMemory(paused.id,{revision:paused.revision,status:'active'},{check:async()=>null});
 assert.equal(restored.sourceRevision,event.revision);
 save('event',{...event,summary:'来源已变'},event.revision);
 assert.equal(memorySourceValid(restored),false);assert.equal(memorySourceValid(edit),false);
 await assert.rejects(patchMemory(restored.id,{revision:restored.revision,status:'active'},{check:async()=>assert.fail()}),/来源已修改/);
});
after(async()=>{db.close();await rm(root,{recursive:true,force:true});});
