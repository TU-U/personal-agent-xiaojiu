import {test,after} from 'node:test';import assert from 'node:assert/strict';import {mkdtemp,rm} from 'node:fs/promises';import path from 'node:path';import os from 'node:os';
const root=await mkdtemp(path.join(os.tmpdir(),'memory-proposal-'));Object.assign(process.env,{DATA_DIR:root,SEED_DEMO:'false',WORKER_MODE:'true'});
const {db,save,get,all,remove,transaction}=await import('../server/store.mjs');const {saveMemoryTurn}=await import('../server/domain/memory/memory-lifecycle.mjs');const {editMemoryProposal,reviewMemoryBatch}=await import('../server/domain/memory/memory-review.mjs');
const turn=items=>transaction(()=>saveMemoryTurn({query:'用户陈述',body:'回复',memoryReview:'pending',memoryProposals:items.map(content=>({content}))}));
test('editing proposal clears old conflict approval, preserves expiry and activates the selected scope',async()=>{
 const project=save('project',{name:'项目'});let t=turn(['草稿']);t=save('conversation',{...t,memoryProposals:[{content:'草稿',conflictId:'old',conflictCheckVersion:1,conflictRefs:[{id:'old',revision:1}]}]},t.revision);
 const edited=editMemoryProposal(t.id,0,{revision:t.revision,content:'明确的项目偏好',scopeKind:'project',scopeId:project.id,scope:'周报'});
 assert.equal(edited.expiresAfterTurn,t.expiresAfterTurn);assert.equal(edited.originTurn,t.originTurn);assert.equal(edited.memoryProposals[0].conflictId,undefined);assert.equal(edited.memoryProposals[0].conflictRefs,undefined);
 await reviewMemoryBatch(t.id,{revision:edited.revision,selected:[{index:0}]},{check:async(_content,_active,context)=>{assert.equal(context.scopeId,project.id);assert.equal(context.scope,'周报');return null;}});
 const memory=all('memory').find(m=>m.sourceConversationId===t.id);assert.equal(memory.scopeKind,'project');assert.equal(memory.scopeId,project.id);assert.equal(memory.scope,'周报');
});
test('different project peers are not compared as conflicting, and invalid scope change leaves draft intact',async()=>{
 const a=save('project',{name:'同名'}),b=save('project',{name:'同名'});let t=turn(['要求短句','要求长句']);
 t=editMemoryProposal(t.id,0,{revision:t.revision,content:'要求短句',scopeKind:'project',scopeId:a.id});
 t=editMemoryProposal(t.id,1,{revision:t.revision,content:'要求长句',scopeKind:'project',scopeId:b.id});
 assert.throws(()=>editMemoryProposal(t.id,0,{revision:t.revision,content:'改写',scopeKind:'project',scopeId:'missing'}),e=>e.status===422);assert.equal(get(t.id,'conversation').memoryProposals[0].content,'要求短句');
 await reviewMemoryBatch(t.id,{revision:t.revision,selected:[{index:0},{index:1}]},{check:async(_content,active)=>{assert.ok(!active.some(m=>m.batchIndex!==undefined));return null;}});
 assert.equal(all('memory').filter(m=>m.sourceConversationId===t.id).length,2);
});
test('range deletion during check blocks commit, and expired proposals cannot renew through editing',async()=>{
 const project=save('project',{name:'临时'});let t=turn(['事实']);t=editMemoryProposal(t.id,0,{revision:t.revision,content:'事实',scopeKind:'project',scopeId:project.id});
 await assert.rejects(reviewMemoryBatch(t.id,{revision:t.revision,selected:[{index:0}]},{check:async()=>{remove(project.id,'project',project.revision);return null;}}),e=>e.status===422);assert.equal(get(t.id,'conversation').memoryReview,'pending');
 for(let i=0;i<5;i++)transaction(()=>saveMemoryTurn({threadId:t.threadId,query:'继续',body:'成功',memoryReview:'none',memoryProposals:[]}));
 assert.throws(()=>editMemoryProposal(t.id,0,{revision:get(t.id,'conversation').revision,content:'延长',scopeKind:'global',scopeId:''}),/过期/);
});
after(async()=>{db.close();await rm(root,{recursive:true,force:true});});
