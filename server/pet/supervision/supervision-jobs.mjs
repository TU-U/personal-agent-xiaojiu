import {z} from 'zod';
import {validate} from '../../core/validation.mjs';
import {all,db,get,getSetting,save,transaction} from '../../store.mjs';
import {createJobRepository} from '../../core/background-jobs.mjs';
import {supervisionActive} from './supervision-runs.mjs';
import {calendarDay} from '../../domain/notes/todo-days.mjs';
import {payloadHash} from '../../core/device-auth.mjs';
export const supervisionJobs=createJobRepository(db);
db.exec('CREATE TABLE IF NOT EXISTS supervision_dispatch (run_id TEXT PRIMARY KEY, signature TEXT NOT NULL, generation INTEGER NOT NULL, job_id TEXT)');
const hourAt=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Shanghai',hour:'2-digit',hourCycle:'h23'});
export function afterQuiet(time,config){
 const {quietStart:start,quietEnd:end}=config,hour=Number(hourAt.format(new Date(time)));
 const quiet=start>end?hour>=start||hour<end:hour>=start&&hour<end;
 if(!quiet)return time;
 let result=Date.parse(calendarDay(time)+'T'+String(end).padStart(2,'0')+':00:00+08:00');if(result<=time)result+=86400000;return result;
}
export function nextSupervisionReminder(run,task,time,config){
 if(!task||!supervisionActive(task)||!['open','review'].includes(run.status))return null;
 const version=run.scheduleVersion||1,history=run.reminders||[],due=Date.parse(run.scheduledDueAt),start=Date.parse(run.scheduledStartAt);
 let kind,scheduledAt,slot=0;
 if(run.snoozedUntil){kind='snooze';scheduledAt=Date.parse(run.snoozedUntil);}
 else if(time<due&&Number.isFinite(start)&&!history.some(item=>item.kind==='start')){kind='start';scheduledAt=start;}
 else if(Number.isFinite(due)&&!history.some(item=>['due','snooze'].includes(item.kind)&&(item.scheduleVersion||1)===version)){kind='due';scheduledAt=due;}
 else if(Number.isFinite(due)&&calendarDay(time)===calendarDay(due)){
  const followed=history.filter(item=>item.kind==='followup'&&calendarDay(item.at)===calendarDay(time));if(followed.length>=2)return null;
  const last=Date.parse(history.at(-1)?.at);if(!Number.isFinite(last))return null;kind='followup';slot=followed.length+1;scheduledAt=Math.max(due,last+7200000);
 }else return null;
 if(!Number.isFinite(scheduledAt)||scheduledAt<0)return null;
 const dueAt=afterQuiet(Math.max(scheduledAt,afterQuiet(time,config)>time?time:scheduledAt),config);
 // A delayed start must never be issued after its deadline. A missed follow-up
 // is not replayed on a later day; the outstanding record remains visible.
 if(kind==='start'&&dueAt>=due)return {kind:'due',scheduledAt:due,dueAt:afterQuiet(Math.max(due,afterQuiet(time,config)>time?time:due),config),version,slot:0};
 if(kind==='followup'&&calendarDay(dueAt)!==calendarDay(due))return null;
 return {kind,scheduledAt,dueAt,version,slot};
}
const settings=()=>getSetting('taskReminders',{quietStart:22,quietEnd:8});
function desired(run,time){const config=settings(),plan=run?nextSupervisionReminder(run,get(run.taskId,'workTask'),time,config):null;return {plan,signature:plan?payloadHash({plan,config}):'none'};}
export function syncSupervisionRun(id,{clock=Date.now}={}){
 const run=get(id,'workRun'),{plan,signature}=desired(run,clock()),old=db.prepare('SELECT * FROM supervision_dispatch WHERE run_id=?').get(id);
 if(old?.signature===signature){const job=old.job_id?supervisionJobs.get(old.job_id):null;if(!plan||job&&!['cancelled','completed'].includes(job.state))return job;}
 if(old?.job_id)supervisionJobs.cancel(old.job_id);
 const generation=(old?.generation||0)+1;
 const job=plan?supervisionJobs.enqueue({key:`supervision-${id}-${generation}`,kind:'supervision-reminder',entityId:id,revision:plan.version,dueAt:plan.dueAt,payload:{signature,...plan}}):null;
 db.prepare('INSERT INTO supervision_dispatch(run_id,signature,generation,job_id) VALUES(?,?,?,?) ON CONFLICT(run_id) DO UPDATE SET signature=excluded.signature,generation=excluded.generation,job_id=excluded.job_id').run(id,signature,generation,job?.id||null);
 return job;
}
export function reconcileSupervisionJobs(options={}){return transaction(()=>{
 for(const run of all('workRun'))syncSupervisionRun(run.id,options);
 for(const row of db.prepare('SELECT run_id FROM supervision_dispatch WHERE job_id IS NOT NULL').all())if(!get(row.run_id,'workRun'))syncSupervisionRun(row.run_id,options);
});}
function current(job,time){
 const run=get(job.entity_id,'workRun'),target=db.prepare('SELECT job_id FROM supervision_dispatch WHERE run_id=?').get(job.entity_id);
 if(!run||target?.job_id!==job.id||desired(run,time).signature!==job.payload.signature||time<job.due_at||afterQuiet(time,settings())!==time)return null;return run;
}
const messages={start:'到约定开始时间了，可以开始任务计时。',due:'约定时间已到，请提交证据并确认完成情况。',snooze:'约定的稍后检查时间已到，请确认本次进展。',followup:'本次任务尚待确认，可以补交证据、改期或跳过。'};
export function makeSupervisionHandlers({clock=Date.now}={}){return {'supervision-reminder':{
 async run(job){return {stale:!current(job,clock())};},
 commit(job,result){const time=clock(),run=current(job,time);if(result.stale||!run)return;
  if((run.reminders||[]).some(item=>item.dedupeKey===job.id))return;
  const reminder={kind:job.payload.kind,at:new Date(time).toISOString(),deliveredAt:new Date(time).toISOString(),scheduledAt:new Date(job.payload.scheduledAt).toISOString(),scheduleVersion:job.revision,dedupeKey:job.id};
  save('workRun',{...run,reminded:true,notice:messages[reminder.kind],snoozedUntil:null,reminders:[...(run.reminders||[]),reminder]},run.revision);
 }
}};}
export const supervisionHandlers=makeSupervisionHandlers();

// Read-only: opening a page never schedules or retries work.
export function supervisionReminderStatus(run,{clock=Date.now}={}){
 const row=db.prepare('SELECT job_id FROM supervision_dispatch WHERE run_id=?').get(run.id),job=row?.job_id?supervisionJobs.get(row.job_id):null;
 if(!job||job.payload.signature!==desired(run,clock()).signature)return null;
 return {id:job.id,state:job.state,dueAt:new Date(job.due_at).toISOString(),attempts:job.attempts,error:job.state==='failed'?'提醒处理失败，尚未确认送达。重试会重新排队，不会替你确认任务。':'',overdue:job.state==='pending'&&job.due_at<clock()-60000};
}
export function retrySupervisionReminder(id,input,{clock=Date.now}={}){
 const body=validate(z.strictObject({action:z.literal('retry-reminder'),opId:z.string().min(8).max(100),jobId:z.string().regex(/^[a-f0-9]{64}$/)}),input),key='supervision-retry:'+body.opId,hash=payloadHash({id,...body});
 const fail=message=>Object.assign(new Error(message),{status:409});
 return transaction(()=>{
  const prior=db.prepare('SELECT result FROM operations WHERE id=?').get(key);if(prior){const receipt=JSON.parse(prior.result);if(receipt.hash!==hash)throw fail('此操作编号已用于其他提醒。');return receipt.result;}
  const run=get(id,'workRun');if(!run)throw fail('本次任务记录已不存在。');
  const state=supervisionReminderStatus(run,{clock});if(!state||state.id!==body.jobId)throw fail('提醒约定已变化，请刷新后处理当前提醒。');if(state.state!=='failed')throw fail('这项提醒已不处于失败状态，请刷新查看进度。');
  if(!supervisionJobs.retry(body.jobId))throw fail('提醒状态已变化，请刷新。');
  const result={id:body.jobId,state:'pending'};db.prepare('INSERT INTO operations(id,result) VALUES(?,?)').run(key,JSON.stringify({hash,result}));return result;
 });
}
