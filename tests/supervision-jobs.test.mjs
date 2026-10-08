import {spawnSync} from 'node:child_process';
import {test,after} from 'node:test';import assert from 'node:assert/strict';import {mkdtemp,rm} from 'node:fs/promises';import os from 'node:os';import path from 'node:path';
const root=await mkdtemp(path.join(os.tmpdir(),'supervision-jobs-'));Object.assign(process.env,{DATA_DIR:root,SEED_DEMO:'false',WORKER_MODE:'true'});
const {db,save,get,setSetting}=await import('../server/store.mjs');const {supervisionJobs:jobs,reconcileSupervisionJobs:sync,makeSupervisionHandlers,supervisionReminderStatus,retrySupervisionReminder,afterQuiet,nextSupervisionReminder:next}=await import('../server/pet/supervision/supervision-jobs.mjs');const {scheduleRunAction}=await import('../server/pet/supervision/supervision-schedule.mjs');const {createBackgroundQueue}=await import('../server/core/background-jobs.mjs');
const iso=t=>new Date(t).toISOString(),at=Date.parse('2026-09-29T04:00:00Z');
function fixture(time=at){const task=save('workTask',{status:'running',supervisionStatus:'active'});return save('workRun',{taskId:task.id,status:'open',scheduleVersion:1,scheduledStartAt:iso(time-60000),scheduledDueAt:iso(time-1000),reminders:[]});}
const jobFor=id=>{const row=db.prepare('SELECT job_id FROM supervision_dispatch WHERE run_id=?').get(id);return row?.job_id?jobs.get(row.job_id):null;};
const wait=async fn=>{for(let i=0;i<160;i++){if(await fn())return;await new Promise(r=>setTimeout(r,50));}throw Error('queue wait timed out');};
test('quiet hours delay delivery; missed start collapses to due; daily follow-ups capped at two',()=>{
 const quiet={quietStart:22,quietEnd:8},task={status:'running',supervisionStatus:'active'};
 assert.equal(afterQuiet(Date.parse('2026-09-29T23:00:00+08:00'),quiet),Date.parse('2026-09-30T08:00:00+08:00'));
 assert.equal(afterQuiet(Date.parse('2026-09-29T06:00:00+08:00'),quiet),Date.parse('2026-09-29T08:00:00+08:00'));
 let run={status:'open',scheduledStartAt:'2026-09-29T09:00:00+08:00',scheduledDueAt:'2026-09-29T12:00:00+08:00',reminders:[]};assert.equal(next(run,task,at,quiet).kind,'due');
 run.reminders=[{kind:'due',at:iso(at),scheduleVersion:1}];assert.equal(next(run,task,at,quiet).dueAt,at+7200000);
 run.reminders.push({kind:'followup',at:iso(at+7200000)},{kind:'followup',at:iso(at+14400000)});assert.equal(next(run,task,at+14400000,quiet),null);assert.equal(next(run,task,at+86400000,quiet),null);
});
test('reschedule cancels old job and late commit; pause and resume produce a fresh schedule',async()=>{
 const at=Date.now();setSetting('taskReminders',{quietStart:0,quietEnd:0});const run=fixture(at);sync({clock:()=>at});const old=jobFor(run.id),handlers=makeSupervisionHandlers({clock:()=>at});
 // Real repository uses wall clock for leases, independent of the planner fixture clock.
 assert.ok(jobs.claim(old.id,'old-token',60000));
 scheduleRunAction(run.id,{action:'snooze',opId:'queued-snooze',scheduleVersion:1,until:iso(at+86400000)},{clock:()=>at});assert.equal(jobs.get(old.id).state,'cancelled');assert.deepEqual(await handlers['supervision-reminder'].run(old),{stale:true});assert.equal(jobs.finish(old.id,'old-token',{},()=>assert.fail()),false);assert.equal(get(run.id,'workRun').reminders.length,0);
 const postponed=jobFor(run.id);const child=spawnSync(process.execPath,['--input-type=module','-e',"const {reconcileSupervisionJobs}=await import('./server/pet/supervision/supervision-jobs.mjs');reconcileSupervisionJobs();"],{env:process.env,encoding:'utf8',timeout:15000});assert.equal(child.status,0,child.stderr);assert.equal(jobFor(run.id).id,postponed.id);

 const task=get(run.taskId,'workTask');save('workTask',{...task,supervisionStatus:'paused'},task.revision);sync({clock:()=>at});assert.equal(jobFor(run.id),null);
 const paused=get(task.id,'workTask');save('workTask',{...paused,supervisionStatus:'active'},paused.revision);sync({clock:()=>at});assert.equal(jobFor(run.id).state,'pending');assert.notEqual(jobFor(run.id).id,old.id);
 // Remove future work from the following real-queue fixture.
 const active=get(task.id,'workTask');save('workTask',{...active,supervisionStatus:'paused'},active.revision);sync({clock:()=>at});
});
test('real Redis delivers once and replay never duplicates a reminder',async()=>{
 const now=Date.now();setSetting('taskReminders',{quietStart:0,quietEnd:0});const run=fixture(now);sync();const job=jobFor(run.id);
 const service=createBackgroundQueue({repository:jobs,handlers:makeSupervisionHandlers(),connection:{host:'127.0.0.1',port:Number(process.env.REDIS_PORT||6381),maxRetriesPerRequest:null},name:'supervision-test-'+Date.now(),concurrency:1});
 try{await service.dispatch();await wait(()=>jobs.get(job.id).state==='completed');assert.equal(get(run.id,'workRun').reminders.length,1);assert.equal(get(run.id,'workRun').reminders[0].dedupeKey,job.id);
 const redisJob=await service.queue.getJob(job.id);await wait(async()=>await redisJob.getState()==='completed');await redisJob.remove();await service.queue.add('supervision-reminder',{}, {jobId:job.id});await wait(async()=>await (await service.queue.getJob(job.id)).getState()==='completed');assert.equal(get(run.id,'workRun').reminders.length,1);
 sync();const nextJob=jobFor(run.id);if(nextJob)assert.notEqual(nextJob.id,job.id);assert.equal(get(run.id,'workRun').status,'open');
 scheduleRunAction(run.id,{action:'snooze',opId:'real-queue-snooze',scheduleVersion:1,until:iso(Date.now()+300)});const postponed=jobFor(run.id);await service.dispatch();await wait(()=>jobs.get(postponed.id).state==='completed');assert.equal(get(run.id,'workRun').reminders.length,2);assert.equal(get(run.id,'workRun').reminders.at(-1).kind,'snooze');sync();await service.dispatch();assert.equal(get(run.id,'workRun').reminders.length,2);assert.notEqual(jobFor(run.id)?.payload.kind,'due');

 }finally{await service.queue.obliterate({force:true});await service.close();}
});
test('failed reminder is visible through Xiaojiu and retry cannot revive a superseded job',async()=>{
 setSetting('taskReminders',{quietStart:0,quietEnd:0});const run=fixture(Date.now());sync();const job=jobFor(run.id);assert.ok(jobs.claim(job.id,'failure-token',60000));jobs.fail(job.id,'failure-token','internal detail not for the UI');
 const before=get(run.id,'workRun'),status=supervisionReminderStatus(before);assert.equal(status.state,'failed');assert.equal(status.attempts,1);assert.ok(!status.error.includes('internal detail'));assert.equal(get(run.id,'workRun').revision,before.revision);
 const {petReminders}=await import('../server/pet/pet-reminders.mjs');const prompt=petReminders().items.find(item=>item.sourceId===run.id);assert.equal(prompt.category,'supervision-error');assert.match(prompt.message,/处理失败/);
 const request={action:'retry-reminder',opId:'retry-reminder-first',jobId:job.id};assert.equal(retrySupervisionReminder(run.id,request).state,'pending');assert.deepEqual(retrySupervisionReminder(run.id,request),{id:job.id,state:'pending'});assert.equal(jobs.get(job.id).attempts,1);
 assert.ok(jobs.claim(job.id,'second-failure',60000));jobs.fail(job.id,'second-failure','another failure');scheduleRunAction(run.id,{action:'snooze',opId:'retry-then-reschedule',scheduleVersion:1,until:iso(Date.now()+86400000)});
 assert.throws(()=>retrySupervisionReminder(run.id,{...request,opId:'retry-stale-job'}),/约定已变化/);retrySupervisionReminder(run.id,request);assert.equal(jobs.get(job.id).state,'cancelled');
});
test('real worker failure can be retried and delivers exactly one business reminder',async()=>{
 setSetting('taskReminders',{quietStart:0,quietEnd:0});const run=fixture(Date.now());sync();const job=jobFor(run.id),base=makeSupervisionHandlers()['supervision-reminder'];let calls=0;
 const service=createBackgroundQueue({repository:jobs,handlers:{'supervision-reminder':{...base,async run(value){if(value.id===job.id&&++calls===1)throw new Error('synthetic worker failure');return base.run(value);}}},connection:{host:'127.0.0.1',port:Number(process.env.REDIS_PORT||6381),maxRetriesPerRequest:null},name:'supervision-retry-test-'+Date.now(),concurrency:1});
 try{await service.dispatch();await wait(()=>jobs.get(job.id).state==='failed');assert.equal(get(run.id,'workRun').reminders.length,0);const redis=await service.queue.getJob(job.id);await wait(async()=>await redis.getState()==='failed');retrySupervisionReminder(run.id,{action:'retry-reminder',opId:'real-worker-retry',jobId:job.id});await service.dispatch();await wait(()=>jobs.get(job.id).state==='completed');assert.equal(calls,2);assert.equal(get(run.id,'workRun').reminders.length,1);assert.equal(get(run.id,'workRun').status,'open');}
 finally{await service.queue.obliterate({force:true});await service.close();}
});
after(async()=>{db.close();await rm(root,{recursive:true,force:true});});
