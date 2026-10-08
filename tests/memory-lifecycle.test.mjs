import {test,after} from 'node:test';import assert from 'node:assert/strict';import {mkdtemp,rm} from 'node:fs/promises';import os from 'node:os';import path from 'node:path';
const root=await mkdtemp(path.join(os.tmpdir(),'memory-life-'));Object.assign(process.env,{DATA_DIR:root,SEED_DEMO:'false',WORKER_MODE:'true'});
const {db,get,save,remove,transaction,getSetting}=await import('../server/store.mjs');
const {saveMemoryTurn,refreshMemoryCandidates,pendingMemoryBatches}=await import('../server/domain/memory/memory-lifecycle.mjs');const {reviewMemoryBatch}=await import('../server/domain/memory/memory-review.mjs');
const turn=(threadId,pending=false)=>transaction(()=>saveMemoryTurn({threadId,query:'用户',body:'成功回答',memoryReview:pending?'pending':'none',memoryProposals:pending?[{content:'稳定事实'}]:[]}));
test('same-thread N+4 remains pending; other threads, reads and rolled back turns do not count; N+5 expires',async()=>{
 const candidate=turn('one',true);for(let i=0;i<4;i++)turn('one');for(let i=0;i<8;i++)turn('other');
 assert.throws(()=>transaction(()=>{saveMemoryTurn({threadId:'one',query:'失败',body:'未提交'});throw new Error('failed commit');}));
 refreshMemoryCandidates();refreshMemoryCandidates();assert.equal(getSetting('memory-turn-count:one'),5);assert.equal(get(candidate.id,'conversation').memoryReview,'pending');assert.ok(pendingMemoryBatches().some(t=>t.id===candidate.id));
 turn('one');const expired=get(candidate.id,'conversation');assert.equal(expired.memoryReview,'expired');assert.equal(expired.memoryExpiredCount,1);assert.deepEqual(expired.memoryProposals,[]);assert.ok(!pendingMemoryBatches().some(t=>t.id===candidate.id));
 await assert.rejects(reviewMemoryBatch(candidate.id,{revision:candidate.revision,selected:[{index:0}]},{check:async()=>assert.fail()}),/过期/);
});
test('deleting a past successful turn never decreases the durable counter',()=>{
 const candidate=turn('delete',true),previous=turn('delete');remove(previous.id,'conversation',previous.revision);for(let i=0;i<4;i++)turn('delete');assert.equal(get(candidate.id,'conversation').memoryReview,'expired');assert.equal(getSetting('memory-turn-count:delete'),6);
});
test('legacy pending candidates acquire stable history-based expiry once',()=>{
 const candidate=save('conversation',{threadId:'legacy',query:'旧轮次',body:'回复',createdAt:'2026-01-01',memoryReview:'pending',memoryProposals:[{content:'事实'}]});
 refreshMemoryCandidates('legacy');const initialized=get(candidate.id,'conversation');assert.equal(initialized.originTurn,1);assert.equal(initialized.expiresAfterTurn,6);
 refreshMemoryCandidates('legacy');assert.equal(get(candidate.id,'conversation').revision,initialized.revision);
});
test('expiry reached while conflict checking blocks the final activation transaction',async()=>{
 const candidate=turn('race',true);for(let i=0;i<4;i++)turn('race');
 await assert.rejects(reviewMemoryBatch(candidate.id,{revision:candidate.revision,selected:[{index:0}]},{check:async()=>{turn('race');return null;}}),e=>e.status===409);
 assert.equal(get(candidate.id,'conversation').memoryReview,'expired');
});
after(async()=>{db.close();await rm(root,{recursive:true,force:true});});
