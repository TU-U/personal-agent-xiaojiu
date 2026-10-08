import {calendarDay,validDay} from '../../domain/notes/todo-days.mjs';
import {supervisionActive} from './supervision-runs.mjs';
const previousDay=day=>new Date(Date.parse(day+'T12:00:00Z')-86400000).toISOString().slice(0,10);
// Facts only: never schedule an extra reminder or infer effort from browser use.
export function supervisionFeedback(tasks,runs,{clock=Date.now}={}){
 const time=clock(),today=calendarDay(time),streaks=new Map(),completions=[];
 for(const task of tasks){
  const own=runs.filter(run=>run.taskId===task.id);
  for(const run of own)if(run.status==='completed'&&Number.isFinite(Date.parse(run.confirmedAt))&&Date.parse(run.confirmedAt)<=time)completions.push({id:`completed:${run.id}:${run.confirmedAt}`,kind:'completed',taskId:task.id,runId:run.id,at:run.confirmedAt,message:`「${task.title||task.goal||'这项任务'}」已经由你确认完成啦，一起为这份进展开心一下 ✨`});
  if(task.repeat!=='daily'||!supervisionActive(task))continue;
  const days=new Map();for(const run of own){const day=run.logicalDay||run.day;if(validDay(day)){const values=days.get(day)||[];values.push(run);days.set(day,values);}}
  const current=days.get(today),currentDue=current?.length===1?Date.parse(current[0].scheduledDueAt):NaN;
  const endDay=currentDue<=time?today:previousDay(today);
  const pausedDay=Number.isFinite(Date.parse(task.supervisionPausedAt))?calendarDay(task.supervisionPausedAt):null;
  const consecutive=[];
  for(let day=endDay;days.has(day);day=previousDay(day)){
   const candidates=days.get(day);if(candidates.length!==1)break;const run=candidates[0];
   if(pausedDay&&day<=pausedDay||!['open','review'].includes(run.status)||run.conditionsSnapshot?.basis!=='confirmed-template'||!(Date.parse(run.scheduledDueAt)<=time)||run.snoozedUntil||(run.scheduleHistory||[]).some(change=>change.action==='snooze'))break;
   consecutive.push(run);
  }
  if(consecutive.length<3)continue;
  const reviewCount=consecutive.filter(run=>run.status==='review').length,openCount=consecutive.length-reviewCount;
  const message=reviewCount===consecutive.length?`连续 ${consecutive.length} 个计划日的证据已经提交，还等你核对完成情况；我们一起看一下吧。`:`连续 ${consecutive.length} 个计划日还没有确认完成，其中 ${openCount} 次待补充进展${reviewCount?`、${reviewCount} 次已交证据待核对`:''}。要不要一起调整一下安排？`;
  const latest=consecutive[0],last=latest.reminders?.at(-1);
  // Only an already-issued due/follow-up can drive proactive concern. This shares
  // SUP's quiet hours and follow-up limit; historical facts alone do not send one.
  const feedback=latest.reminded&&last&&['due','followup'].includes(last.kind)&&Date.parse(last.at)<=time&&calendarDay(last.at)===today?{id:`concern:${task.id}:${last.dedupeKey||latest.id+':'+last.kind+':'+last.at}`,kind:'concern',taskId:task.id,runId:latest.id,at:last.at,message}:null;
  streaks.set(task.id,{taskId:task.id,runIds:consecutive.map(run=>run.id),startDay:consecutive.at(-1).logicalDay||consecutive.at(-1).day,endDay,count:consecutive.length,reviewCount,openCount,message,feedback});
 }
 completions.sort((a,b)=>b.at.localeCompare(a.at)||a.id.localeCompare(b.id));
 return {streaks,completions:completions.slice(0,20)};
}
