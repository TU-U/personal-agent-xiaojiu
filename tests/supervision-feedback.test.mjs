import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';import path from 'node:path';
const root=await mkdtemp(path.join(os.tmpdir(),'supervision-feedback-'));Object.assign(process.env,{DATA_DIR:root,SEED_DEMO:'false',WORKER_MODE:'true'});
const {db,save,setSetting}=await import('../server/store.mjs');
const {supervisionFeedback}=await import('../server/pet/supervision/supervision-feedback.mjs');
const {petReminders}=await import('../server/pet/pet-reminders.mjs');
const task={id:'daily-task',title:'每日阅读',repeat:'daily',status:'supervising',supervisionStatus:'active'};
const due=day=>`${day}T20:00:00+08:00`;
const run=(day,patch={})=>({id:'run-'+day,taskId:task.id,day,logicalDay:day,status:'open',scheduledDueAt:due(day),conditionsSnapshot:{basis:'confirmed-template'},reminded:true,reminders:[{kind:'due',at:due(day),dedupeKey:'due-'+day}],...patch});
const days=['2026-10-05','2026-10-06','2026-10-07'],runs=days.map(day=>run(day));
const at=Date.parse('2026-10-07T21:00:00+08:00');
const read=(list=runs,template=task,time=at)=>supervisionFeedback([template],list,{clock:()=>time});
test('three-day facts use consecutive due plan days; review is distinct, and repeated reads reuse issued reminder identity',()=>{
 const before=JSON.stringify(runs);assert.equal(read(runs,task,Date.parse('2026-10-07T19:59:59+08:00')).streaks.size,0);
 const fact=read().streaks.get(task.id);assert.equal(fact.count,3);assert.equal(fact.openCount,3);assert.match(fact.message,/待补充进展/);assert.equal(fact.feedback.id,read().streaks.get(task.id).feedback.id);assert.equal(JSON.stringify(runs),before);
 const reviewed=read(runs.map(value=>({...value,status:'review'}))).streaks.get(task.id);assert.equal(reviewed.reviewCount,3);assert.match(reviewed.message,/证据已经提交/);assert.doesNotMatch(reviewed.message,/待补充进展/);
 const mixed=read(runs.map((value,i)=>({...value,status:i===0?'review':'open'}))).streaks.get(task.id);assert.match(mixed.message,/2 次待补充进展、1 次已交证据待核对/);
 const noDelivery=read(runs.map(value=>({...value,reminded:false}))).streaks.get(task.id);assert.equal(noDelivery.feedback,null);
 assert.equal(read(runs.map(value=>({...value,reminders:[{kind:'start',at:due(value.day)}]}))).streaks.get(task.id).feedback,null);
});
test('skip, reschedule, gaps, duplicate days, pause, cancellation and unknown historical requirements break the streak',()=>{
 for(const patch of [{status:'completed',confirmedAt:due(days[1])},{status:'skipped'},{snoozedUntil:'2026-10-06T22:00:00+08:00'},{scheduleHistory:[{action:'snooze'}]},{conditionsSnapshot:{basis:'legacy-current-template'}}])assert.equal(read(runs.map((value,i)=>i===1?{...value,...patch}:value)).streaks.size,0,JSON.stringify(patch));
 assert.equal(read([runs[0],runs[2]]).streaks.size,0);assert.equal(read([...runs,runs[1]]).streaks.size,0);
 for(const patch of [{repeat:'once'},{supervisionStatus:'paused'},{status:'cancelled'},{supervisionPausedAt:'2026-10-06T10:00:00+08:00'}])assert.equal(read(runs,{...task,...patch}).streaks.size,0);
 const next=['2026-10-07','2026-10-08','2026-10-09'].map(day=>run(day));assert.equal(read(next,{...task,supervisionPausedAt:'2026-10-06T10:00:00+08:00'},Date.parse('2026-10-09T21:00:00+08:00')).streaks.get(task.id).count,3);
});
test('completion requires confirmed business facts; aggregation stays readonly, quiet and shares the existing history prompt',()=>{
 assert.equal(read([run(days[0],{status:'review',confirmedAt:due(days[0])}),run(days[1],{status:'completed'}),run(days[2],{status:'completed',confirmedAt:'2026-10-08T20:00:00+08:00'})]).completions.length,0);
 const done=run(days[0],{status:'completed',confirmedAt:due(days[0])});assert.equal(read([done]).completions.length,1);assert.equal(read([done]).completions[0].id,read([done]).completions[0].id);
 save('workTask',task);runs.forEach(value=>save('workRun',value));setSetting('taskReminders',{quietStart:22,quietEnd:8});
 const changes=db.prepare('SELECT total_changes() n').get().n;
 const snapshot=petReminders({clock:()=>at}),again=petReminders({clock:()=>at});assert.equal(snapshot.snapshot,again.snapshot);assert.equal(db.prepare('SELECT total_changes() n').get().n,changes);
 assert.equal(snapshot.items.find(item=>item.occurrenceKey==='overdue').message,read().streaks.get(task.id).message);assert.equal(snapshot.feedback.length,1);assert.equal(snapshot.feedback[0].kind,'concern');
 const quiet=petReminders({clock:()=>Date.parse('2026-10-07T23:00:00+08:00')});assert.equal(quiet.feedback.length,0);assert.equal(quiet.items.length,0);
});
after(async()=>{db.close();await rm(root,{recursive:true,force:true});});
