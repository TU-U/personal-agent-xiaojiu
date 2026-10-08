import {test,after} from 'node:test';import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import {spawnSync} from 'node:child_process';
const root=await mkdtemp(path.join(os.tmpdir(),'supervision-timer-'));Object.assign(process.env,{DATA_DIR:root,SEED_DEMO:'false',WORKER_MODE:'true'});
const {db,save,get,transaction}=await import('../server/store.mjs');
const {timerAction,checkpointTimer,recoverTimers,stopTaskTimers}=await import('../server/pet/supervision/supervision-timer.mjs');
const t0=Date.parse('2026-09-29T01:00:00Z');
function fixture(){const task=save('workTask',{status:'paused',supervisionStatus:'active'});return save('workRun',{taskId:task.id,status:'open',seconds:12,timerAt:null,evidenceRevision:4});}
test('repeated start/stop and fractional heartbeats count each interval once without changing evidence version',()=>{
 const run=fixture();let time=t0;const clock=()=>time;
 let current=timerAction(run.id,{action:'start',opId:'start-once'}, {clock});time+=1500;
 current=timerAction(run.id,{action:'start',opId:'start-other'}, {clock});assert.equal(current.timerSessions.length,1);
 current=checkpointTimer(run.id,{clock});assert.equal(current.seconds,13.5);time+=1500;
 current=timerAction(run.id,{action:'stop',opId:'stop-once'},{clock});assert.equal(current.seconds,15);assert.equal(current.timerSessions[0].seconds,3);assert.equal(current.evidenceRevision,4);
 time+=10000;assert.equal(timerAction(run.id,{action:'start',opId:'start-once'},{clock}).timerAt,new Date(t0).toISOString());assert.equal(get(run.id,'workRun').timerAt,null);
 assert.equal(timerAction(run.id,{action:'stop',opId:'stop-again'},{clock}).seconds,15);
});
test('adjustment receipts survive new processes, reject altered payloads and preserve reasons',()=>{
 const run=fixture(),body={action:'adjust',opId:'adjust-once',minutes:45,reason:'离线阅读'};
 const first=timerAction(run.id,body,{clock:()=>t0});assert.equal(first.seconds,2712);
 const child=spawnSync(process.execPath,['--input-type=module','-e',`const {timerAction}=await import('./server/pet/supervision/supervision-timer.mjs');timerAction(${JSON.stringify(run.id)},${JSON.stringify(body)});`],{env:process.env,encoding:'utf8',timeout:15000});assert.equal(child.status,0,child.stderr);
 assert.equal(get(run.id,'workRun').seconds,2712);assert.equal(get(run.id,'workRun').manualAdjustments.length,1);assert.equal(get(run.id,'workRun').manualAdjustments[0].reason,'离线阅读');
 assert.throws(()=>timerAction(run.id,{...body,minutes:46}),error=>error.status===409);
 for(const minutes of [0,-1,Infinity,NaN,1441,'45'])assert.throws(()=>timerAction(run.id,{...body,opId:'invalid-input',minutes}));
 assert.throws(()=>timerAction(run.id,{action:'adjust',minutes:5,reason:'无操作号'}));
});
test('restart drops offline interval, closes checkpoint session and never resumes automatically',()=>{
 const run=fixture();timerAction(run.id,{action:'start'},{clock:()=>t0});checkpointTimer(run.id,{clock:()=>t0+30500});
 recoverTimers();const current=get(run.id,'workRun');assert.equal(current.seconds,42.5);assert.equal(current.timerAt,null);assert.equal(current.timerSessions[0].endedAt,new Date(t0+30500).toISOString());assert.equal(current.timerSessions[0].endReason,'server-restart');
 assert.equal(recoverTimers(),0);assert.match(current.notice,/未累计停机时间/);
});
test('explicit pause closes timers atomically; rollback and backward clocks cannot duplicate time',()=>{
 const run=fixture();timerAction(run.id,{action:'start'},{clock:()=>t0});checkpointTimer(run.id,{clock:()=>t0+2000});
 checkpointTimer(run.id,{clock:()=>t0-1000});assert.equal(get(run.id,'workRun').timerAt,new Date(t0+2000).toISOString());
 transaction(()=>{const task=get(run.taskId,'workTask');save('workTask',{...task,supervisionStatus:'paused'},task.revision);stopTaskTimers(task.id,{clock:()=>t0+4000});});
 assert.equal(get(run.id,'workRun').seconds,16);assert.equal(get(run.id,'workRun').timerAt,null);assert.throws(()=>timerAction(run.id,{action:'start'}),/监督已暂停/);
});
after(async()=>{db.close();await rm(root,{recursive:true,force:true});});
