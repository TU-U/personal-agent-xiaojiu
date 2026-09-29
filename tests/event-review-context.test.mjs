import {test,after} from 'node:test';import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';import path from 'node:path';import os from 'node:os';
const root=await mkdtemp(path.join(os.tmpdir(),'event-context-'));Object.assign(process.env,{DATA_DIR:root,SEED_DEMO:'false',WORKER_MODE:'true'});
const {db,save,get,remove}=await import('../server/store.mjs');
const {initializeEventLifecycle:create,confirmEventCheck:confirm}=await import('../server/event-lifecycle.mjs');
const {eventJobs,makeEventHandlers,reconcileEventJobs}=await import('../server/event-jobs.mjs');
const {eventReviewContext,eventReviewStale}=await import('../server/event-review-context.mjs');
const jobFor=id=>eventJobs.get(db.prepare('SELECT id FROM background_jobs WHERE entity_id=? ORDER BY rowid DESC LIMIT 1').get(id).id);
const past='2020-01-01T00:00:00.000Z';
test('source changed during model prevents commit; updated review later becomes stale and cannot be confirmed',async()=>{
 let note=save('note',{title:'来源',content:'原始方案'});let event=create({title:'核对',summary:'摘要',eventType:'one_off',priority:'high',dueAt:past,sourceNoteId:note.id});
 const handlers=makeEventHandlers(async(_event,context)=>{assert.equal(context.input.source.content,'原始方案');note=save('note',{...note,content:'新的方案'},note.revision);return {reviewText:'旧结果',reviewNotice:''};});
 const old=jobFor(event.id);eventJobs.claim(old.id,'one',60000);const result=await handlers['event-check'].run(old);eventJobs.finish(old.id,'one',result,handlers['event-check'].commit);assert.equal(get(event.id,'event').reviewedDueAt,'');
 reconcileEventJobs();const next=jobFor(event.id);assert.notEqual(next.id,old.id);
 const fresh=makeEventHandlers(async(_event,context)=>{assert.equal(context.input.source.content,'新的方案');return {reviewText:'新结果',reviewNotice:''};});
 eventJobs.claim(next.id,'two',60000);eventJobs.finish(next.id,'two',await fresh['event-check'].run(next),fresh['event-check'].commit);
 event=get(event.id,'event');let check=get(event.currentOccurrenceId,'eventOccurrence');assert.equal(eventReviewStale(event,check),false);assert.equal(check.reviewSnapshot.sources[0].revision,note.revision);
 remove(note.id,'note',note.revision);assert.equal(eventReviewStale(event,check),true);assert.throws(()=>confirm(event.id,{revision:event.revision,occurrenceId:check.id}),/依据已变化/);assert.equal(get(check.id,'eventOccurrence').status,'pending');
});
test('actual linked plans, run evidence and artifacts affect signature; unrelated review bookkeeping does not',()=>{
 const artifact=save('artifact',{title:'阶段成果',body:'只有阶段结果',mode:'model'}),task=save('workTask',{title:'关联任务',goal:'学习',plan:'先读资料',requirement:'需要实践',status:'running',outputs:[artifact.id]}),run=save('workRun',{taskId:task.id,status:'review',day:'2026-09-29',evidence:'已写笔记',artifactId:artifact.id});
 let related=save('event',{title:'关联要事',summary:'相关计划',priority:'normal',lifecycleStatus:'ongoing'});
 const event=create({title:'读取关联证据',eventType:'long_term',priority:'high',dueAt:past,relatedEventIds:[related.id],relatedTaskIds:[task.id]});
 const before=eventReviewContext(event);assert.equal(before.input.tasks[0].runs[0].evidence,'已写笔记');assert.equal(before.input.tasks[0].outputs[0].mode,'model');
 related=save('event',{...related,reviewText:'自动复核内容',reviewedAt:new Date().toISOString()},related.revision);assert.equal(eventReviewContext(event).snapshot.signature,before.snapshot.signature);
 save('workRun',{...run,evidence:'实践仍未完成'},run.revision);assert.notEqual(eventReviewContext(event).snapshot.signature,before.snapshot.signature);
});
test('high priority with no check has no stale review',()=>{assert.equal(eventReviewStale({priority:'high'},null),false);});
after(async()=>{db.close();await rm(root,{recursive:true,force:true});});
