import {test,after} from 'node:test';import assert from 'node:assert/strict';import {mkdtemp,rm} from 'node:fs/promises';import os from 'node:os';import path from 'node:path';
const root=await mkdtemp(path.join(os.tmpdir(),'supervision-schedule-'));Object.assign(process.env,{DATA_DIR:root,SEED_DEMO:'false',WORKER_MODE:'true'});
const {db,save,get,setSetting}=await import('../server/store.mjs');const {scheduleRunAction:action}=await import('../server/supervision-schedule.mjs');
const at=Date.now(),clock=()=>at,iso=value=>new Date(value).toISOString();
function fixture(){const task=save('workTask',{status:'running',supervisionStatus:'active',supervisionVersion:1,repeat:'once',requirement:'阅读',minutes:0});return save('workRun',{taskId:task.id,supervisionVersion:1,status:'open',day:'2026-09-29',logicalDay:'2026-09-29',scheduleVersion:1,scheduledStartAt:iso(at-5000),scheduledDueAt:iso(at-1000),evidenceRevision:2,seconds:40,timerAt:null,reminders:[]});}
test('reschedule preserves logical day, evidence and duration; retries and stale edits cannot duplicate or overwrite',()=>{
 const run=fixture(),body={action:'snooze',opId:'schedule-first',scheduleVersion:1,until:iso(at+86400000)};
 const moved=action(run.id,body,{clock});assert.equal(moved.scheduleVersion,2);assert.equal(moved.scheduleHistory.length,1);assert.equal(moved.logicalDay,run.logicalDay);assert.equal(moved.scheduledDueAt,body.until);assert.equal(moved.evidenceRevision,2);assert.equal(moved.seconds,40);
 assert.deepEqual(action(run.id,body,{clock:()=>at+172800000}),moved);assert.throws(()=>action(run.id,{...body,opId:'schedule-stale',until:iso(at+172800000)},{clock}),/约定时间已修改/);assert.throws(()=>action(run.id,{...body,until:iso(at+172800000)},{clock}),/操作编号/);
 const skipped=action(run.id,{action:'skip',opId:'schedule-skip',scheduleVersion:2,reason:'今天身体不舒服'},{clock});assert.equal(skipped.status,'skipped');assert.equal(skipped.skipReason,'今天身体不舒服');assert.equal(skipped.scheduleHistory.length,2);assert.equal(skipped.reminded,false);
 assert.deepEqual(action(run.id,body,{clock}),moved);assert.equal(get(run.id,'workRun').status,'skipped');
});
test('invalid dates and missing skip reasons do not modify state',()=>{
 const run=fixture();for(const body of [{action:'snooze',until:'2026-02-30T12:00:00Z'},{action:'snooze',until:iso(at-1)},{action:'skip',reason:' '},{action:'skip',reason:'a'.repeat(1001)},{action:'skip',reason:'x',confirmed:true}])assert.throws(()=>action(run.id,body,{clock}));assert.equal(get(run.id,'workRun').revision,run.revision);
});
after(async()=>{db.close();await rm(root,{recursive:true,force:true});});
