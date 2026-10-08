import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const root=await mkdtemp(join(tmpdir(),'memory-source-review-'));Object.assign(process.env,{DATA_DIR:root,SEED_DEMO:'false',WORKER_MODE:'true'});
const {db,get,save}=await import('../server/store.mjs');
const {patchMemory}=await import('../server/domain/memory/memory-state.mjs');
after(async()=>{db.close();await rm(root,{recursive:true,force:true});});
test('explicit same-source review repairs stale candidate without activating it or bypassing conflicts',async()=>{
 const source=save('note',{content:'原偏好'}),memory=save('memory',{content:'喜欢安静',scope:'通用',scopeKind:'global',scopeId:'',status:'candidate',sourceId:source.id,sourceRevision:source.revision,sourceRef:{kind:'note',id:source.id,revision:source.revision}});
 const changed=save('note',{...source,content:'仍喜欢安静，但白天可播放音乐'},source.revision);let checks=0;const deps={check:async()=>{checks++;return null;}};
 await assert.rejects(patchMemory(memory.id,{revision:memory.revision,status:'active'},deps),/来源已修改/);assert.equal(checks,0);
 const edited=await patchMemory(memory.id,{revision:memory.revision,content:'喜欢安静，白天可播放音乐'},deps);assert.equal(edited.sourceRevision,source.revision);
 const reviewed=await patchMemory(memory.id,{revision:edited.revision,reviewedSource:{kind:'note',id:source.id,revision:changed.revision}},deps);assert.equal(reviewed.status,'candidate');assert.equal(reviewed.sourceRef.revision,changed.revision);assert.equal(checks,0);
 const active=await patchMemory(memory.id,{revision:reviewed.revision,status:'active'},deps);assert.equal(active.status,'active');assert.equal(checks,1);assert.equal(get(memory.id,'memory').sourceRevision,changed.revision);
});

test('event, file and conversation review keeps source identity and fences later changes',async()=>{
 const {memorySourcePreview}=await import('../server/domain/memory/memory-source.mjs');
 for(const kind of ['event','libraryFile','conversation']){
  const source=save(kind,{title:'来源',content:'原文',summary:'摘要',query:'问题',body:'回答',status:'ready'});
  const memory=save('memory',{content:'提炼',scope:'通用',scopeKind:'global',scopeId:'',status:'candidate',sourceRef:{kind,id:source.id,revision:source.revision}});
  const changed=save(kind,{...source,content:'更新原文'},source.revision);
  const preview=memorySourcePreview(memory.id);assert.equal(preview.revision,changed.revision);assert.ok(preview.text);
  await assert.rejects(patchMemory(memory.id,{revision:memory.revision,reviewedSource:{kind,id:'other',revision:1}}),/原来关联/);
  await assert.rejects(patchMemory(memory.id,{revision:memory.revision,reviewedSource:{kind,id:source.id,revision:source.revision}}),/来源已变化/);
  const reviewed=await patchMemory(memory.id,{revision:memory.revision,reviewedSource:{kind,id:source.id,revision:preview.revision}});
  assert.equal(reviewed.status,'candidate');assert.equal(reviewed.sourceRef.revision,changed.revision);
  if(kind==='libraryFile'){
   save(kind,{...changed,status:'failed'},changed.revision);
   assert.throws(()=>memorySourcePreview(memory.id),/不可用/);
  }
 }
});

test('legacy sources cannot change during conflict checking and activation pins their version',async()=>{
 for(const kind of ['event','libraryFile','conversation']){
  const source=save(kind,{content:'旧内容',status:'ready'});
  const memory=save('memory',{content:'事实',scope:'通用',scopeKind:'global',scopeId:'',status:'candidate',...(kind==='conversation'?{sourceConversationId:source.id}:{sourceRef:{kind,id:source.id}})});
  await assert.rejects(patchMemory(memory.id,{revision:memory.revision,status:'active'},{check:async()=>{save(kind,{...source,content:'新内容'},source.revision);return null;}}),/检查期间/);
  assert.equal(get(memory.id,'memory').status,'candidate');
  const active=await patchMemory(memory.id,{revision:memory.revision,status:'active'},{check:async()=>null});
  assert.equal(active.sourceRef.revision,get(source.id,kind).revision);
 }
});
test('batch confirmation pins the final conversation revision',async()=>{
 const {reviewMemoryBatch}=await import('../server/domain/memory/memory-review.mjs');
 const {memorySourceValid}=await import('../server/domain/memory/memory-source.mjs');
 const turn=save('conversation',{query:'我喜欢安静',body:'知道了',originTurn:1,expiresAfterTurn:6,memoryReview:'pending',memoryProposals:[{content:'喜欢安静',scope:'通用',scopeKind:'global',scopeId:''}]});
 const reviewed=await reviewMemoryBatch(turn.id,{revision:turn.revision,selected:[{index:0}]},{check:async()=>null});
 const {all}=await import('../server/store.mjs');
 const memory=all('memory').find(m=>m.sourceConversationId===turn.id);
 assert.equal(memory.sourceRef.revision,reviewed.revision);assert.equal(memorySourceValid(memory),true);
 save('conversation',{...reviewed,query:'更正偏好'},reviewed.revision);
 assert.equal(memorySourceValid(memory),false);
});
