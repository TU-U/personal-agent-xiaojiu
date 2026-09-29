import {syncSupervisionCalendar,calendarSegments,advanceCalendar,nextCalendarDay} from './supervision-calendar.mjs';
import {templateConditions} from './supervision-conditions.mjs';
import {z} from 'zod';
import {all,save,transaction} from './store.mjs';
import {calendarDay,validDay} from './todo-days.mjs';
import {validate} from './validation.mjs';
const time=z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const fail=message=>Object.assign(new Error(message),{status:409});
export function supervisionActive(task){
 return task.status!=='cancelled'&&(task.supervisionStatus?task.supervisionStatus==='active':['running','waiting','review'].includes(task.status));
}
export function conditionSnapshot(task,basis='confirmed-template'){
 const minutes=validate(z.number().finite().min(0).max(1440),task.minutes??0);
 const conditions=templateConditions(task);
 return {version:1,planVersion:task.planVersion||1,taskRevision:task.revision,minimumSeconds:minutes*60,conditions,basis};
}
function schedule(task,day){
 if(!validDay(day))throw fail('执行记录日期无效，未改写历史。');
 const start=validate(time,task.startTime||'09:00'),end=validate(time,task.time||'20:00');
 return {timeZone:'Asia/Shanghai',logicalDay:day,scheduledStartAt:`${day}T${start}:00+08:00`,scheduledDueAt:`${day}T${end}:00+08:00`,scheduleVersion:1};
}
// Run only after a consistent backup. Legacy snapshots cannot reconstruct
// an unrecorded historical template; preserve that limitation explicitly.
export function migrateSupervisionRuns(){return transaction(()=>{
 let tasks=0,runs=0;
 for(const task of all('workTask'))if(task.supervisionVersion!==1){
  const supervisionStatus=task.status==='draft'?'draft':task.status==='cancelled'?'cancelled':['running','waiting','review'].includes(task.status)?'active':'paused';
  save('workTask',{...task,supervisionVersion:1,supervisionStatus,planVersion:1},task.revision);tasks++;
 }
 const templates=new Map(all('workTask').map(task=>[task.id,task]));
 for(const run of all('workRun'))if(run.supervisionVersion!==1){
  const task=templates.get(run.taskId);
  const snapshot=task?{...schedule(task,run.day),conditionsSnapshot:conditionSnapshot(task,'legacy-current-template'),snapshotNotice:'旧记录未保存当时的要求版本；此快照来自迁移时模板，不代表已还原历史。'}:{snapshotNotice:'原任务已不存在，无法恢复完成要求。'};
  save('workRun',{...run,...snapshot,supervisionVersion:1,evidenceRevision:1},run.revision);runs++;
 }
 return {tasks,runs};
});}
export function initializeSupervisionRun(task,day,{backfilled=false,onCreated=()=>{}}={}){
 const run=save('workRun',{taskId:task.id,day,...schedule(task,day),supervisionVersion:1,conditionsSnapshot:task.conditionsSnapshot||conditionSnapshot(task),evidenceRevision:1,status:'open',seconds:0,timerAt:null,evidence:'',artifactId:'',notice:'',reminded:false,reminders:[],backfilled,...(backfilled?{snapshotNotice:'服务恢复后补建；完成要求来自该日期已保存的监督计划，尚未确认完成。'}:{})});onCreated(run);return run;
}
export function recordSupervisionCalendar(task,{clock=Date.now}={}){
 const active=supervisionActive(task),snapshot=active&&task.repeat==='daily'?conditionSnapshot(task):null;
 // Exclude taskRevision from identity: execution logs do not change the agreed plan.
 const template=snapshot?{startTime:task.startTime||'09:00',time:task.time||'20:00',conditionsSnapshot:snapshot}:null;
 syncSupervisionCalendar(task,template,{clock});
}
export function ensureSupervisionRuns({clock=Date.now,onCreated=()=>{}}={}){return transaction(()=>{
 const today=calendarDay(clock()),runs=all('workRun'),created=[];
 for(const task of all('workTask')){
  if(task.supervisionVersion!==1)continue;
  recordSupervisionCalendar(task,{clock});
  const previous=runs.filter(run=>run.taskId===task.id),days=new Set(previous.map(run=>run.logicalDay||run.day));
  function create(day,template,backfilled=false){
   if(days.has(day))return;
   const run=initializeSupervisionRun({...task,...template},day,{backfilled,onCreated});runs.push(run);created.push(run);days.add(day);
  }
  if(task.repeat==='once'){
   if(supervisionActive(task)&&!previous.length)create(today,{...task,conditionsSnapshot:conditionSnapshot(task)});
   continue;
  }
  let remaining=31;
  for(const segment of calendarSegments(task.id)){
   const end=segment.end_day&&segment.end_day<today?segment.end_day:today;
   let day=segment.through_day?nextCalendarDay(segment.through_day):segment.start_day;
   while(day<=end&&remaining>0){create(day,segment.template,day<today);advanceCalendar(segment.id,day);day=nextCalendarDay(day);remaining--;}
   if(remaining===0)break;
  }
 }
 return created;
});}
export function runRequirements(run){
 const snapshot=run.conditionsSnapshot;
 if(!snapshot||snapshot.version!==1)throw fail('这次记录缺少完成要求快照，不能直接验收。');
 return snapshot;
}
