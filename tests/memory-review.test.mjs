import {test,after} from 'node:test';import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';import path from 'node:path';import os from 'node:os';
const root=await mkdtemp(path.join(os.tmpdir(),'memory-review-'));Object.assign(process.env,{DATA_DIR:root,SEED_DEMO:'false',WORKER_MODE:'true'});
const {db,save,get,all,remove,transaction}=await import('../server/store.mjs');const {reviewMemoryBatch}=await import('../server/memory-review.mjs');
const {saveMemoryTurn}=await import('../server/memory-lifecycle.mjs');
const turn=items=>transaction(()=>saveMemoryTurn({query:'用户事实',body:'回复',memoryProposals:items.map(content=>({content})),memoryReview:'pending'}));
const none={check:async()=>null};
test('selected batch commits once; replay after lost response neither rechecks nor duplicates',async()=>{
 const t=turn(['一','二','三']),body={revision:t.revision,selected:[{index:1,keep:'new'}]};const result=await reviewMemoryBatch(t.id,body,none);
 assert.equal(result.memoryReview,'reviewed');assert.equal(all('memory').filter(m=>m.sourceConversationId===t.id).length,1);
 assert.deepEqual(await reviewMemoryBatch(t.id,body,{check:async()=>assert.fail()}),result);assert.equal(all('memory').filter(m=>m.sourceConversationId===t.id).length,1);
 remove(t.id,'conversation',result.revision);await assert.rejects(reviewMemoryBatch(t.id,body,none),e=>e.status===404);
});
test('legacy conflict hints cannot bypass a fresh check and replacement keeps historical memory',async()=>{
 const old=save('memory',{content:'深圳',scope:'通用',status:'active'});let t=turn(['广州']);t=save('conversation',{...t,memoryProposals:[{content:'广州',conflictId:old.id,conflictRevision:old.revision,conflictContent:old.content}]},t.revision);
 let updated,calls=0;await assert.rejects(reviewMemoryBatch(t.id,{revision:t.revision,selected:[{index:0,keep:'new'}]},{check:async()=>{calls++;return {...old,conflictReason:'居住地改变',conflictKind:'update'};}}),e=>{updated=e.current;return e.status===409;});assert.equal(calls,1);assert.equal(get(old.id,'memory').status,'active');
 await reviewMemoryBatch(t.id,{revision:updated.revision,selected:[{index:0,keep:'new'}]},none);assert.equal(get(old.id,'memory').status,'paused');assert.ok(get(old.id,'memory'));
});
test('conflicting peers block the whole batch with no partial activation',async()=>{
 const t=turn(['喜欢短句','喜欢长句']);await assert.rejects(reviewMemoryBatch(t.id,{revision:t.revision,selected:[{index:0},{index:1}]},{check:async(_content,memories)=>memories.find(m=>m.batchIndex===0)||null}),/本批第1条与第2条/);
 assert.equal(all('memory').filter(m=>m.sourceConversationId===t.id).length,0);assert.equal(get(t.id,'conversation').memoryReview,'pending');
});
test('concurrent memory mutation blocks stale batch confirmation',async()=>{
 const t=turn(['并发事实']);await assert.rejects(reviewMemoryBatch(t.id,{revision:t.revision,selected:[{index:0}]},{check:async()=>{save('memory',{content:'其他新事实',status:'active',scope:'通用'});return null;}}),e=>e.status===409);
 assert.equal(get(t.id,'conversation').memoryReview,'pending');assert.equal(all('memory').filter(m=>m.sourceConversationId===t.id).length,0);
});
test('failure on final batch write rolls back every new memory',async()=>{
 const t=turn(['原子A','原子B']);db.exec(`CREATE TRIGGER fail_review BEFORE UPDATE ON entities WHEN NEW.id='${t.id}' AND json_extract(NEW.data,'$.memoryReview')='reviewed' BEGIN SELECT RAISE(ABORT,'injected failure'); END`);
 try{await assert.rejects(reviewMemoryBatch(t.id,{revision:t.revision,selected:[{index:0},{index:1}]},none),/injected failure/);}finally{db.exec('DROP TRIGGER fail_review');}
 assert.equal(all('memory').filter(m=>m.sourceConversationId===t.id).length,0);assert.equal(get(t.id,'conversation').memoryReview,'pending');
});
after(async()=>{db.close();await rm(root,{recursive:true,force:true});});
