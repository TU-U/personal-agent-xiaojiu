import {currentAccountingCheck} from '../domain/accounting/accounting-settings.mjs';
import {researchTaskStatus,researchReportAcknowledged} from '../agent/research/research-tasks.mjs';
import {supervisionFeedback} from './supervision/supervision-feedback.mjs';
import {supervisionReminderStatus} from './supervision/supervision-jobs.mjs';
import {supervisionActive} from './supervision/supervision-runs.mjs';
import {createHash} from 'node:crypto';
import {all,db,getSetting} from '../store.mjs';
import {calendarDay} from '../domain/notes/todo-days.mjs';
import {pendingMemoryBatches} from '../domain/memory/memory-lifecycle.mjs';
import {eventReviewStale} from '../domain/events/event-review-context.mjs';

const hourAt=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Shanghai',hour:'2-digit',hourCycle:'h23'});
function quietAt(time){
 const {quietStart,quietEnd}=getSetting('taskReminders',{quietStart:22,quietEnd:8});
 const hour=Number(hourAt.format(new Date(time)));
 return quietStart>quietEnd?hour>=quietStart||hour<quietEnd:hour>=quietStart&&hour<quietEnd;
}

// A read transaction makes the badge, full table and source versions one snapshot.
// This does not run schedulers, expire candidates, acknowledge prompts or call AI.
export function petReminders({clock=Date.now}={}){
 const time=clock(),day=calendarDay(time),items=[];
 db.exec('BEGIN');
 try{
  const cursor=db.prepare('SELECT COALESCE(MAX(seq),0) n FROM changes').get().n;
  function add(sourceKind,source,occurrenceKey,category,message,actionTarget,{dueAt=null,severity='normal',count=1}={}){
   items.push({id:`${sourceKind}:${source.id}:${occurrenceKey}`,sourceKind,sourceId:source.id,sourceRevision:source.revision,occurrenceKey,category,title:source.title||source.goal||'待处理事项',message,dueAt,createdAt:source.createdAt||null,updatedAt:source.updatedAt||null,status:'active',actionTarget,severity,count});
  }
  const checks=new Map(all('eventOccurrence').map(check=>[check.id,check]));
  for(const event of all('event')){
   const check=checks.get(event.currentOccurrenceId);
   if(event.lifecycleStatus!=='ongoing'||!check||check.eventId!==event.id||check.status!=='pending'||!(Date.parse(check.dueAt)<=time))continue;
   let message='约定的检查时间到了，来看一下并确认这次检查吧。';
   if(event.priority==='high')message=eventReviewStale(event,check)?'复核依据变化了，需要重新检查后再由你确认哦。':check.reviewedDueAt!==check.dueAt?'已到约定时间，复核结果还未就绪，可以查看处理进度。':check.reviewNotice?'本次复核有需要你查看的说明，请核对后决定如何处理。':'复核建议准备好了，等你查看并确认哦。';
   add('event',event,check.id,'event-check',message,{page:'events',id:event.id,occurrenceId:check.id,occurrenceRevision:check.revision},{dueAt:check.dueAt,severity:event.priority==='high'?'important':'normal'});
  }
  for(const todo of all('todo'))if(!todo.done&&!todo.supervisionTaskId&&(todo.day||calendarDay(todo.createdAt))===day)add('todo',todo,day,'daily-todo','今天还有这件事等你处理哦。',{page:'library',id:todo.id,day});
  const conversations=new Map(all('conversation').map(turn=>[turn.id,turn]));
  for(const batch of pendingMemoryBatches()){
   const turn=conversations.get(batch.id);
   add('conversation',{...turn,title:batch.title},batch.id,'memory-review',`这轮有 ${batch.count} 条记忆候选，等你选择；只有确认后才会记住哦。`,{page:'assistant',id:batch.id,threadId:batch.threadId},{count:batch.count});
  }
  for(const memory of all('memory'))if(memory.status==='candidate')add('memory',memory,memory.id,'memory-review','这条记忆还在等待你的选择，来核对一下吧。',{page:'memories',id:memory.id});
  // The source scheduler owns start/due/follow-up production and its follow-up cap.
  // Show only the latest issued prompt per run; do not turn old history into alerts.
  const tasks=new Map(all('workTask').map(task=>[task.id,task])),runs=all('workRun');
  const facts=supervisionFeedback([...tasks.values()],runs,{clock:()=>time}),quiet=quietAt(time);
  const feedback=[...facts.completions,...(!quiet?[...facts.streaks.values()].flatMap(fact=>fact.feedback?[fact.feedback]:[]):[])].sort((a,b)=>b.at.localeCompare(a.at)||a.id.localeCompare(b.id));
  if(!quiet){
   const accountingCheck=currentAccountingCheck({clock:()=>time});
   if(accountingCheck?.status==='pending')add('accountingCheck',accountingCheck,day,'accounting-check',accountingCheck.message,{page:'accounting',id:accountingCheck.id,day});
   const grouped=new Set();
   for(const task of tasks.values()){
    if(!supervisionActive(task)||['waiting','review'].includes(task.status))continue;
    const overdue=runs.filter(run=>supervisionReminderStatus(run,{clock:()=>time})?.state!=='failed'&&run.taskId===task.id&&(run.logicalDay||run.day)<day&&['open','review'].includes(run.status)&&Date.parse(run.scheduledDueAt)<=time&&!(Date.parse(run.snoozedUntil)>time)&&(run.status==='review'||run.reminded&&run.reminders?.length));
    if(overdue.length<2)continue;
    overdue.forEach(run=>grouped.add(run.id));
    add('workTask',task,'overdue','supervision',facts.streaks.get(task.id)?.message||`之前有 ${overdue.length} 次任务记录还待处理，集中看一下，选择补做、改期或跳过吧。`,{page:'workTasks',id:task.id,history:true},{count:overdue.length});
   }
   for(const run of runs){
    if(grouped.has(run.id))continue;
    const task=tasks.get(run.taskId),last=run.reminders?.at(-1);
    const reminderJob=supervisionReminderStatus(run,{clock:()=>time});
    if(task&&reminderJob?.state==='failed'){add('workRun',{...run,title:task.title||task.goal},reminderJob.id,'supervision-error','这次提醒处理失败了，还没有确认送达。可以到任务记录里重试哦。',{page:'workTasks',id:task.id,runId:run.id});continue;}
    if(!task||!supervisionActive(task)||['waiting','review'].includes(task.status)||!['open','review'].includes(run.status)||Date.parse(run.snoozedUntil)>time)continue;
    if(run.status!=='review'&&(!run.reminded||!last||!(Date.parse(last.at)<=time)))continue;
    const key=run.status==='review'?'review':`${last.kind}:${last.at}`;
    const messages={start:'到约定开始时间了，可以开始啦。',due:'约定时间到了，请核对证据和完成情况哦。',followup:'这次进展还待确认，可以补交证据、改期或跳过。',snooze:'约定的稍后检查时间到了，来看一下进展吧。'};
    add('workRun',{...run,title:task.title||task.goal},key,'supervision',run.status==='review'?'证据已提交，等你核对并确认这次完成情况。':messages[last.kind]||'有一条任务提示等你查看哦。',{page:'workTasks',id:task.id,runId:run.id},{dueAt:run.scheduledDueAt||(run.day&&task.time?`${run.day}T${task.time}:00+08:00`:null)});
   }
   for(const task of tasks.values())if(task.executionMode==='research'&&researchTaskStatus(task).status==='failed')add('workTask',task,'research-failed:'+task.researchVersion,'research-error','这次调研执行失败了，输入和已有进度都还在，可以查看原因后决定是否重试。',{page:'workTasks',id:task.id});
   for(const task of tasks.values())if(task.executionMode==='research'&&task.status==='draft')add('workTask',task,'research-plan:'+task.planVersion,'research-plan','调研计划准备好了，请先核对问题、资料和预算，再由你确认开始。',{page:'workTasks',id:task.id});
   for(const task of tasks.values())if(['waiting','review'].includes(task.status)&&!(task.executionMode==='research'&&task.status==='review'&&researchReportAcknowledged(task)))add('workTask',task,task.status,'task-review',facts.streaks.get(task.id)?.message||(task.status==='waiting'?'这件事需要你补充资料或作出选择，来看一下吧。':'成果已准备好，等你核对验收哦。'),{page:'workTasks',id:task.id});
  }
  items.sort((a,b)=>(a.severity==='important'?-1:0)-(b.severity==='important'?-1:0)||(a.dueAt||'9999').localeCompare(b.dueAt||'9999')||a.id.localeCompare(b.id));
  const snapshot=createHash('sha256').update(JSON.stringify({day,items,feedback})).digest('hex');
  db.exec('COMMIT');
  return {snapshot,cursor,serverTime:new Date(time).toISOString(),day,total:items.length,items,feedback};
 }catch(error){db.exec('ROLLBACK');throw error;}
}

export function installPetReminders(app){app.get('/api/pet/reminders',(_req,res)=>res.json(petReminders()));}
