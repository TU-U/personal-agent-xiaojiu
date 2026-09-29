import {test,after} from 'node:test';import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';import path from 'node:path';import os from 'node:os';import {spawnSync} from 'node:child_process';
const root=await mkdtemp(path.join(os.tmpdir(),'event-operation-'));Object.assign(process.env,{DATA_DIR:root,SEED_DEMO:'false',WORKER_MODE:'true'});
const {db,get,remove}=await import('../server/store.mjs');
const {initializeEventLifecycle:create,scheduleEventCheck:schedule,snoozeEventCheck:snooze,confirmEventCheck:confirm,endEvent:end,eventChecks,commitEventReview:review}=await import('../server/event-lifecycle.mjs');
const {requestEventReview}=await import('../server/event-jobs.mjs');
const past='2020-01-01T00:00:00.000Z',future='2099-01-01T00:00:00.000Z';
test('schedule, confirm, snooze and end replay original receipts without duplicate checks or histories',()=>{
 let event=create({title:'操作重试',eventType:'long_term',priority:'normal'});const scheduleBody={opId:'schedule-once',revision:event.revision,dueAt:past};event=schedule(event.id,scheduleBody);assert.deepEqual(schedule(event.id,scheduleBody),event);
 const child=spawnSync(process.execPath,['--input-type=module','-e',`const {scheduleEventCheck}=await import('./server/event-lifecycle.mjs');console.log(scheduleEventCheck('${event.id}',${JSON.stringify(scheduleBody)}).currentOccurrenceId);`],{env:process.env,encoding:'utf8',timeout:15000});assert.equal(child.status,0,child.stderr);assert.equal(child.stdout.trim(),event.currentOccurrenceId);assert.equal(eventChecks(event.id).length,1);
 assert.throws(()=>schedule(event.id,{...scheduleBody,dueAt:future}),e=>e.status===409);
 const confirmBody={opId:'confirm-once',revision:event.revision,occurrenceId:event.currentOccurrenceId};event=confirm(event.id,confirmBody);assert.deepEqual(confirm(event.id,confirmBody),event);
 event=schedule(event.id,{opId:'schedule-next',revision:event.revision,dueAt:future});const snoozeBody={opId:'snooze-once',revision:event.revision,occurrenceId:event.currentOccurrenceId,dueAt:'2099-02-01T00:00:00.000Z'};event=snooze(event.id,snoozeBody);assert.deepEqual(snooze(event.id,snoozeBody),event);assert.equal(get(event.currentOccurrenceId,'eventOccurrence').history.length,1);
 const endBody={opId:'end-once-1',revision:event.revision};event=end(event.id,endBody);assert.deepEqual(end(event.id,endBody),event);assert.equal(eventChecks(event.id).length,2);
 remove(event.id,'event',event.revision);assert.throws(()=>end(event.id,endBody),e=>e.status===410);
});
test('lost review retry response does not clear a later result or enqueue another model call',()=>{
 let event=create({title:'复核重试',eventType:'one_off',priority:'high',dueAt:past});let check=eventChecks(event.id)[0];event=review(event.id,{eventRevision:event.revision,occurrenceId:check.id,occurrenceRevision:check.revision,reviewText:'初次结果',reviewNotice:''});
 const body={opId:'review-retry-once',revision:event.revision,occurrenceId:check.id};const first=requestEventReview(event.id,body);assert.deepEqual(requestEventReview(event.id,body),first);
 check=get(check.id,'eventOccurrence');event=review(event.id,{eventRevision:first.revision,occurrenceId:check.id,occurrenceRevision:check.revision,reviewText:'后续成功结果',reviewNotice:''});const jobs=db.prepare("SELECT COUNT(*) n FROM background_jobs WHERE entity_id=?").get(event.id).n;
 assert.deepEqual(requestEventReview(event.id,body),first);assert.equal(get(event.id,'event').reviewText,'后续成功结果');assert.equal(db.prepare('SELECT COUNT(*) n FROM background_jobs WHERE entity_id=?').get(event.id).n,jobs);
});
after(async()=>{db.close();await rm(root,{recursive:true,force:true});});
