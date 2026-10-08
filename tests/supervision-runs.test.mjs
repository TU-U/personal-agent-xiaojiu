import {test,after} from 'node:test';import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';import path from 'node:path';import os from 'node:os';import {spawnSync} from 'node:child_process';
const root=await mkdtemp(path.join(os.tmpdir(),'supervision-runs-'));Object.assign(process.env,{DATA_DIR:root,SEED_DEMO:'false',WORKER_MODE:'true'});
const {db,save,get,all}=await import('../server/store.mjs');
const {migrateSupervisionRuns,ensureSupervisionRuns,runRequirements,recordSupervisionCalendar}=await import('../server/pet/supervision/supervision-runs.mjs');
const clock=day=>()=>Date.parse(day+'T04:00:00Z');
const template={title:'读书',status:'running',repeat:'daily',minutes:45,requirement:'写三条心得',time:'20:00',startTime:'09:00'};
test('migration preserves legacy evidence and states, records uncertainty and is repeatable',()=>{
 const task=save('workTask',template),run=save('workRun',{taskId:task.id,day:'2026-09-28',status:'completed',seconds:3000,evidence:'旧证据',confirmedAt:'2026-09-28T12:00:00Z'});
 const orphan=save('workRun',{taskId:'missing',day:'2026-09-28',status:'open'});
 assert.deepEqual(migrateSupervisionRuns(),{tasks:1,runs:2});const current=get(run.id,'workRun');
 assert.equal(current.status,run.status);assert.equal(current.evidence,run.evidence);assert.equal(current.seconds,run.seconds);assert.equal(current.confirmedAt,run.confirmedAt);
 assert.equal(runRequirements(current).basis,'legacy-current-template');assert.match(current.snapshotNotice,/不代表已还原历史/);assert.equal(runRequirements(current).minimumSeconds,2700);
 assert.throws(()=>runRequirements(get(orphan.id,'workRun')),/缺少完成要求快照/);assert.deepEqual(migrateSupervisionRuns(),{tasks:0,runs:0});
});
test('daily identity survives template edits and process restart; later days use new snapshots',()=>{
 let task=save('workTask',{...template,supervisionVersion:1,supervisionStatus:'active',planVersion:1});
 ensureSupervisionRuns({clock:clock('2026-09-29')});const before=all('workRun').find(run=>run.taskId===task.id);
 task=save('workTask',{...task,minutes:90,requirement:'写五条心得',time:'21:00',planVersion:2},task.revision);
 ensureSupervisionRuns({clock:clock('2026-09-29')});assert.equal(all('workRun').filter(run=>run.taskId===task.id).length,1);
 const first=get(before.id,'workRun');assert.equal(first.conditionsSnapshot.minimumSeconds,2700);assert.equal(first.scheduledDueAt,'2026-09-29T20:00:00+08:00');
 const child=spawnSync(process.execPath,['--input-type=module','-e',"const {ensureSupervisionRuns}=await import('./server/pet/supervision/supervision-runs.mjs');ensureSupervisionRuns({clock:()=>Date.parse('2026-09-29T04:00:00Z')});"],{env:process.env,encoding:'utf8',timeout:15000});assert.equal(child.status,0,child.stderr);
 assert.equal(all('workRun').filter(run=>run.taskId===task.id).length,1);
 ensureSupervisionRuns({clock:clock('2026-09-30')});const next=all('workRun').find(run=>run.taskId===task.id&&run.day==='2026-09-30');assert.equal(next.conditionsSnapshot.minimumSeconds,5400);assert.equal(next.conditionsSnapshot.conditions[0].description,'写五条心得');
});
test('once-only, pause and cancellation do not generate unwanted instances',()=>{
 const once=save('workTask',{...template,repeat:'once',supervisionVersion:1,supervisionStatus:'active'});
 const excluded=['draft','paused','failed','cancelled'].map(status=>save('workTask',{...template,status}));migrateSupervisionRuns();
 ensureSupervisionRuns({clock:clock('2026-10-01')});ensureSupervisionRuns({clock:clock('2026-10-02')});
 assert.equal(all('workRun').filter(run=>run.taskId===once.id).length,1);
 for(const task of excluded)assert.equal(all('workRun').filter(run=>run.taskId===task.id).length,0);
 const active=save('workTask',{...template,status:'paused',supervisionVersion:1,supervisionStatus:'active'});
 ensureSupervisionRuns({clock:clock('2026-10-03')});assert.equal(all('workRun').filter(run=>run.taskId===active.id).length,1);
 recordSupervisionCalendar(save('workTask',{...active,supervisionStatus:'paused'},active.revision),{clock:clock('2026-10-03')});ensureSupervisionRuns({clock:clock('2026-10-04')});assert.equal(all('workRun').filter(run=>run.taskId===active.id).length,1);
});
test('offline days use known historical templates; pause gaps are excluded and batches resume without duplicates',()=>{
 const task=save('workTask',{...template,supervisionVersion:1,supervisionStatus:'active',planVersion:1});
 ensureSupervisionRuns({clock:clock('2026-11-01')});
 ensureSupervisionRuns({clock:clock('2026-11-04')});let runs=all('workRun').filter(run=>run.taskId===task.id);assert.deepEqual(runs.map(run=>run.day).sort(),['2026-11-01','2026-11-02','2026-11-03','2026-11-04']);assert.equal(runs.find(run=>run.day==='2026-11-02').backfilled,true);
 let current=get(task.id,'workTask');current=save('workTask',{...current,supervisionStatus:'paused'},current.revision);recordSupervisionCalendar(current,{clock:clock('2026-11-04')});
 ensureSupervisionRuns({clock:clock('2026-11-07')});assert.equal(all('workRun').filter(run=>run.taskId===task.id).length,4);
 current=save('workTask',{...current,supervisionStatus:'active',minutes:90,requirement:'恢复后的条件',planVersion:2},current.revision);ensureSupervisionRuns({clock:clock('2026-11-08')});
 runs=all('workRun').filter(run=>run.taskId===task.id);assert.equal(runs.length,5);assert.equal(runs.find(run=>run.day==='2026-11-08').conditionsSnapshot.minimumSeconds,5400);assert.equal(runs.find(run=>run.day==='2026-11-03').conditionsSnapshot.minimumSeconds,2700);
 // A long outage is processed in bounded batches, never silently truncated.
 for(let i=0;i<4;i++)ensureSupervisionRuns({clock:clock('2027-01-10')});runs=all('workRun').filter(run=>run.taskId===task.id);assert.equal(runs.length,68);assert.equal(new Set(runs.map(run=>run.day)).size,runs.length);assert.ok(runs.some(run=>run.day==='2027-01-10'));
});
test('condition change is recorded before an outage and applies only from the following day',async()=>{
 const {updateSupervisionConditions}=await import('../server/pet/supervision/supervision-conditions.mjs');
 const task=save('workTask',{...template,supervisionVersion:1,supervisionStatus:'active',planVersion:1});ensureSupervisionRuns({clock:clock('2027-02-01')});
 updateSupervisionConditions(task.id,{opId:'calendar-condition-change',planVersion:1,minutes:90,conditions:[{id:'new',kind:'evidence',required:true,description:'新的学习要求'}]},{clock:clock('2027-02-01')});
 ensureSupervisionRuns({clock:clock('2027-02-04')});const runs=all('workRun').filter(run=>run.taskId===task.id);assert.equal(runs.length,4);assert.equal(runs.find(run=>run.day==='2027-02-01').conditionsSnapshot.minimumSeconds,2700);
 for(const day of ['2027-02-02','2027-02-03','2027-02-04'])assert.equal(runs.find(run=>run.day===day).conditionsSnapshot.minimumSeconds,5400);
});
after(async()=>{db.close();await rm(root,{recursive:true,force:true});});
