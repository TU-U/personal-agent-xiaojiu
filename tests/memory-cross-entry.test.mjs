import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import path from 'node:path';import os from 'node:os';
const root=await mkdtemp(path.join(os.tmpdir(),'memory-cross-entry-'));
Object.assign(process.env,{DATA_DIR:root,SEED_DEMO:'false',WORKER_MODE:'true'});
const {db,save,get,all,transaction}=await import('../server/store.mjs');
const {createMemory,patchMemory}=await import('../server/memory-state.mjs');
const {reviewMemoryBatch}=await import('../server/memory-review.mjs');
const {saveMemoryTurn}=await import('../server/memory-lifecycle.mjs');
const none={check:async()=>null};
const turn=content=>transaction(()=>saveMemoryTurn({query:content,body:'回复',memoryProposals:[{content}],memoryReview:'pending'}));
const select=t=>({revision:t.revision,selected:[{index:0,keep:'new'}]});
const conflict=old=>({check:async()=>({...old,conflictKind:'update',conflictReason:'同一事实更新'})});
async function prepare(label){
 const old=save('memory',{content:label+'旧地点',scope:'通用',status:'active'});
 let manual=createMemory({content:label+'手动新地点',scope:'通用'}),batch=turn(label+'对话新地点');
 await assert.rejects(patchMemory(manual.id,{revision:manual.revision,status:'active'},conflict(old)),e=>{manual=e.current.memory;return e.status===409;});
 await assert.rejects(reviewMemoryBatch(batch.id,select(batch),conflict(old)),e=>{batch=e.current;return e.status===409;});
 return {old,manual,batch};
}
for(const winner of ['manual','batch'])test(`cross-entry replacement: ${winner} wins, stale confirmation cannot activate`,async()=>{
 const {old,manual,batch}=await prepare(winner);
 const runManual=check=>patchMemory(manual.id,{revision:manual.revision,status:'active',replace:[{id:old.id,revision:old.revision}]},{check});
 const runBatch=check=>reviewMemoryBatch(batch.id,select(batch),{check});
 let enter,release;const entered=new Promise(r=>enter=r),gate=new Promise(r=>release=r);
 const waiting=async()=>{enter();await gate;return null;};
 const loser=winner==='manual'?runBatch(waiting):runManual(waiting);await entered;
 await (winner==='manual'?runManual(none.check):runBatch(none.check));release();
 await assert.rejects(loser,e=>e.status===409);
 assert.equal(get(old.id,'memory').status,'paused');
 assert.equal(get(manual.id,'memory').status,winner==='manual'?'active':'candidate');
 assert.equal(all('memory').filter(m=>m.sourceConversationId===batch.id&&m.status==='active').length,winner==='batch'?1:0);
 assert.equal(get(batch.id,'conversation').memoryReview,winner==='batch'?'reviewed':'pending');
});
test('multiple old conflicts accumulate; stale retained references reject the whole decision',async()=>{
 const first=save('memory',{content:'旧事实一',scope:'通用',status:'active'}),second=save('memory',{content:'旧事实二',scope:'通用',status:'active'});
 let t=turn('综合更正');
 for(const old of [first,second])await assert.rejects(reviewMemoryBatch(t.id,select(t),conflict(old)),e=>{t=e.current;return e.status===409;});
 assert.equal(t.memoryProposals[0].conflictRefs.length,2);
 save('memory',{...first,status:'paused'},first.revision);
 await assert.rejects(reviewMemoryBatch(t.id,{revision:t.revision,selected:[{index:0,keep:'existing'}]},none),e=>e.status===409);
 assert.equal(get(t.id,'conversation').memoryReview,'pending');
 assert.equal(get(second.id,'memory').status,'active');
});
test('confirming all accumulated replacements pauses both old facts atomically',async()=>{
 const olds=['历史一','历史二'].map(content=>save('memory',{content,scope:'通用',status:'active'}));
 let t=turn('确认的合并事实');
 for(const old of olds)await assert.rejects(reviewMemoryBatch(t.id,select(t),conflict(old)),e=>{t=e.current;return e.status===409;});
 const result=await reviewMemoryBatch(t.id,select(t),none);
 assert.equal(result.memoryReview,'reviewed');
 for(const old of olds){assert.equal(get(old.id,'memory').status,'paused');assert.equal(get(old.id,'memory').supersededByBatch,t.id);}
 assert.equal(all('memory').filter(m=>m.sourceConversationId===t.id&&m.status==='active').length,1);
});
after(async()=>{db.close();await rm(root,{recursive:true,force:true});});
