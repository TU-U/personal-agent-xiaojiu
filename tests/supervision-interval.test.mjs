import {test,after} from 'node:test';import assert from 'node:assert/strict';import {mkdtemp,rm} from 'node:fs/promises';import os from 'node:os';import path from 'node:path';
const root=await mkdtemp(path.join(os.tmpdir(),'supervision-interval-'));Object.assign(process.env,{DATA_DIR:root,SEED_DEMO:'false',WORKER_MODE:'true'});
const {db,save,get}=await import('../server/store.mjs');const {timerAction}=await import('../server/pet/supervision/supervision-timer.mjs');
const start=Date.parse('2026-10-07T01:00:00Z'),clock=()=>start+7200000,iso=value=>new Date(value).toISOString();
function fixture(taskId){const task=taskId?{id:taskId}:save('workTask',{supervisionStatus:'active',status:'supervising'});return save('workRun',{taskId:task.id,status:'open',seconds:0,timerAt:null});}
const body=(opId,from=start,to=start+1800000)=>({action:'adjust',opId,minutes:(to-from)/60000,reason:'离线阅读',startedAt:iso(from),endedAt:iso(to)});
test('interval evidence is persisted; identical and partial overlaps across the same task are rejected, adjacency allowed',()=>{
 const run=fixture(),request=body('interval-first');const first=timerAction(run.id,request,{clock});assert.equal(first.seconds,1800);assert.equal(first.manualAdjustments[0].basis,'interval');assert.deepEqual(timerAction(run.id,request,{clock}),first);
 assert.throws(()=>timerAction(run.id,body('interval-repeat'),{clock}),/重叠/);assert.throws(()=>timerAction(run.id,body('interval-partial',start+900000,start+2700000),{clock}),/重叠/);
 const otherDay=fixture(run.taskId);assert.throws(()=>timerAction(otherDay.id,body('interval-other-day'),{clock}),/重叠/);assert.equal(get(otherDay.id,'workRun').seconds,0);
 const next=timerAction(run.id,body('interval-adjacent',start+1800000,start+3600000),{clock});assert.equal(next.seconds,3600);assert.equal(next.manualAdjustments.length,2);
});
test('timer overlap and malformed ranges fail before settling or saving; legacy duration is explicitly unlocated',()=>{
 const run=fixture();timerAction(run.id,{action:'start'},{clock:()=>start});const before=get(run.id,'workRun');assert.throws(()=>timerAction(run.id,body('timer-overlap'),{clock}),/计时重叠/);assert.equal(get(run.id,'workRun').revision,before.revision);
 for(const patch of [{endedAt:undefined},{minutes:31},{endedAt:iso(start-60000),minutes:1},{endedAt:iso(start+10800000),minutes:180}])assert.throws(()=>timerAction(run.id,{...body('invalid-interval'),...patch},{clock}),error=>error.status===422);
 const legacy=fixture(),result=timerAction(legacy.id,{action:'adjust',opId:'duration-only-legacy',minutes:10,reason:'旧客户端补记'},{clock});assert.equal(result.manualAdjustments[0].basis,'duration-only');assert.equal(result.seconds,600);
});
after(async()=>{db.close();await rm(root,{recursive:true,force:true});});
