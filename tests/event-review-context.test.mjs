import {test,after} from 'node:test';import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';import path from 'node:path';import os from 'node:os';
const root=await mkdtemp(path.join(os.tmpdir(),'event-context-'));Object.assign(process.env,{DATA_DIR:root,SEED_DEMO:'false',WORKER_MODE:'true'});
const {db,save,get,remove}=await import('../server/store.mjs');
const {initializeEventLifecycle:create,confirmEventCheck:confirm}=await import('../server/domain/events/event-lifecycle.mjs');
const {eventJobs,makeEventHandlers,reconcileEventJobs}=await import('../server/jobs/event-jobs.mjs');
const {eventReviewContext,eventReviewStale}=await import('../server/domain/events/event-review-context.mjs');
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

test('audio transcript and execution-specific conditions are reviewed and invalidate old suggestions',()=>{
 let note=save('note',{title:'会议录音',content:'',transcript:{segments:[{startMs:0,endMs:2000,speakerId:'speaker_1',text:'必须先完成本地验证'}]}});
 const task=save('workTask',{title:'验证',goal:'验证',outputs:[],status:'running'});
 let run=save('workRun',{taskId:task.id,status:'open',day:'2026-10-08',conditionsSnapshot:{minimumSeconds:1800,conditions:[{id:'c1',description:'提交验证记录',required:true}]}});
 const event=create({title:'检查验证计划',eventType:'one_off',priority:'high',dueAt:past,sourceNoteId:note.id,relatedTaskIds:[task.id]});
 const before=eventReviewContext(event);assert.match(before.input.source.content,/必须先完成本地验证/);assert.match(before.input.source.content,/识别可能有误/);assert.equal(before.input.tasks[0].runs[0].conditionsSnapshot.minimumSeconds,1800);
 note=save('note',{...note,transcript:{segments:[{startMs:0,endMs:2000,speakerId:'speaker_1',text:'先在测试库验证，不得更改线上数据'}]}},note.revision);
 const changed=eventReviewContext(event);assert.notEqual(changed.snapshot.signature,before.snapshot.signature);
 run=save('workRun',{...run,conditionsSnapshot:{...run.conditionsSnapshot,minimumSeconds:3600}},run.revision);
 assert.notEqual(eventReviewContext(event).snapshot.signature,changed.snapshot.signature);
 assert.equal(get(note.id,'note').content,'');assert.equal(get(event.id,'event').status,'open');
});
test('referenced execution evidence uses shared validity rules and contributes to review signatures',()=>{
 let note=save('note',{title:'实践证据',content:'测试库回滚验证成功'});
 const task=save('workTask',{title:'关联实践',outputs:[],status:'running'});
 const otherArtifact=save('artifact',{title:'他人任务成果',taskId:'other-task',body:'不能采用的正文',mode:'model'});
 const run=save('workRun',{taskId:task.id,day:'2026-10-08',status:'review',evidenceRefs:[{id:note.id,kind:'note',revision:note.revision},{id:otherArtifact.id,kind:'artifact',revision:otherArtifact.revision}]});
 const event=create({title:'核对实践',eventType:'one_off',priority:'high',dueAt:past,relatedTaskIds:[task.id]});
 const initial=eventReviewContext(event),evidence=initial.input.tasks[0].runs[0].evidenceSources;
 assert.equal(evidence[0].content,note.content);assert.match(evidence[1].invalid,/不属于本任务/);assert.equal(evidence[1].content,undefined);
 assert.ok(initial.snapshot.sources.some(s=>s.id===note.id&&s.revision===note.revision));
 note=save('note',{...note,content:'实践尚未完成'},note.revision);
 const changed=eventReviewContext(event);assert.notEqual(changed.snapshot.signature,initial.snapshot.signature);
 assert.match(changed.input.tasks[0].runs[0].evidenceSources[0].invalid,/版本已变化/);assert.equal(changed.input.tasks[0].runs[0].evidenceSources[0].content,undefined);
 assert.match(changed.snapshot.sources.find(s=>s.id===note.id).issue,/版本已变化/);
 remove(note.id,'note',note.revision);const missing=eventReviewContext(event);assert.equal(missing.input.tasks[0].runs[0].evidenceSources[0].missing,true);assert.notEqual(missing.snapshot.signature,changed.snapshot.signature);
 assert.equal(get(run.id,'workRun').status,'review');
});
