import {test,after} from 'node:test';import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';import path from 'node:path';import os from 'node:os';
const root=await mkdtemp(path.join(os.tmpdir(),'event-jobs-'));Object.assign(process.env,{DATA_DIR:root,SEED_DEMO:'false',WORKER_MODE:'true'});
const {db,get}=await import('../server/store.mjs');
const {initializeEventLifecycle:create,snoozeEventCheck:snooze,endEvent:end}=await import('../server/event-lifecycle.mjs');
const {eventJobs,makeEventHandlers,reconcileEventJobs,requestEventReview}=await import('../server/event-jobs.mjs');
const {createBackgroundQueue}=await import('../server/background-jobs.mjs');
const {spawnSync}=await import('node:child_process');
const past='2020-01-01T00:00:00.000Z',future='2099-01-01T00:00:00.000Z';
const jobFor=id=>eventJobs.get(db.prepare("SELECT id FROM background_jobs WHERE entity_id=? ORDER BY rowid DESC LIMIT 1").get(id).id);
const wait=async fn=>{for(let i=0;i<160;i++){if(await fn())return;await new Promise(r=>setTimeout(r,50));}throw new Error('queue wait timed out');};
test('outbox survives a fresh process; reschedule and end revoke old leases without model calls',async()=>{
 let event=create({title:'待改期',eventType:'long_term',priority:'high',dueAt:past});const old=jobFor(event.id);
 const processResult=spawnSync(process.execPath,['--input-type=module','-e',`const {reconcileEventJobs,eventJobs}=await import('./server/event-jobs.mjs');reconcileEventJobs();console.log(eventJobs.get('${old.id}').state);`],{env:process.env,encoding:'utf8',timeout:15000});assert.equal(processResult.status,0,processResult.stderr);assert.equal(processResult.stdout.trim(),'pending');
 eventJobs.claim(old.id,'stale-worker',60000);event=snooze(event.id,{revision:event.revision,occurrenceId:event.currentOccurrenceId,dueAt:future});assert.equal(eventJobs.get(old.id).state,'cancelled');
 assert.equal(eventJobs.finish(old.id,'stale-worker',{},()=>assert.fail()),false);
 const handlers=makeEventHandlers(async()=>assert.fail('stale job must not call model'));assert.deepEqual(await handlers['event-check'].run(old),{stale:true});
 const next=jobFor(event.id);assert.equal(next.due_at,Date.parse(future));end(event.id,{revision:event.revision});assert.equal(eventJobs.get(next.id).state,'cancelled');
});
test('real Redis executes high/normal occurrences once, explicit retry and delayed edit fence commits',async()=>{
 let calls=0,release,entered;const gate=new Promise(r=>release=r),started=new Promise(r=>entered=r);
 const handlers=makeEventHandlers(async event=>{calls++;if(event.title==='运行中改期'){entered();await gate;}return {reviewText:'检查建议',reviewNotice:''};});
 const service=createBackgroundQueue({repository:eventJobs,handlers,connection:{host:'127.0.0.1',port:Number(process.env.REDIS_PORT||6381),maxRetriesPerRequest:null},name:'event-test-'+Date.now(),concurrency:1});
 try{
  const high=create({title:'高等级',eventType:'one_off',priority:'high',dueAt:past}),normal=create({title:'普通',eventType:'long_term',priority:'normal',dueAt:past});
  await service.dispatch();await wait(()=>jobFor(high.id).state==='completed'&&jobFor(normal.id).state==='completed');assert.equal(calls,1);assert.equal(get(high.id,'event').status,'open');assert.equal(get(normal.id,'event').reviewText,'');
  reconcileEventJobs();await service.dispatch();assert.equal(calls,1);
  const original=jobFor(high.id);const redisJob=await service.queue.getJob(original.id);await wait(async()=>await redisJob.getState()==='completed');await redisJob.remove();await service.queue.add('event-check',{}, {jobId:original.id});await wait(async()=>await (await service.queue.getJob(original.id)).getState()==='completed');assert.equal(calls,1);
  requestEventReview(high.id);await service.dispatch();await wait(()=>jobFor(high.id).state==='completed');assert.equal(calls,2);
  let moved=create({title:'运行中改期',eventType:'long_term',priority:'high',dueAt:past});const old=jobFor(moved.id);await service.dispatch();await started;
  moved=snooze(moved.id,{revision:moved.revision,occurrenceId:moved.currentOccurrenceId,dueAt:future});release();await wait(async()=>await (await service.queue.getJob(old.id)).getState()==='completed');
  assert.equal(eventJobs.get(old.id).state,'cancelled');assert.equal(get(moved.id,'event').reviewText,'');assert.equal(get(moved.currentOccurrenceId,'eventOccurrence').reviewText,'');
 }finally{release();await service.queue.obliterate({force:true});await service.close();}
});
after(async()=>{db.close();await rm(root,{recursive:true,force:true});});
