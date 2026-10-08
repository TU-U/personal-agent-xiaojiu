import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {all,db,get,save,transaction} from '../../store.mjs';
import {payloadHash} from '../../core/device-auth.mjs';
import {validate} from '../../core/validation.mjs';
import {supervisionActive} from './supervision-runs.mjs';
const fail=(message,status=409)=>Object.assign(new Error(message),{status});
const op=z.string().min(8).max(100);
const input=z.discriminatedUnion('action',[
 z.strictObject({action:z.enum(['start','stop']),opId:op.optional()}),
 z.strictObject({action:z.literal('adjust'),opId:op,minutes:z.number().finite().min(1).max(1440),reason:z.string().trim().min(1).max(1000),startedAt:z.iso.datetime({offset:true}).optional(),endedAt:z.iso.datetime({offset:true}).optional()})
]);
// seconds is a persisted checkpoint, timerAt is its boundary. Never accumulate
// the same interval twice; fractional seconds survive repeated checkpoints.
export function settledTimer(run,{clock=Date.now,stop=false,reason='paused',accrue=true}={}){
 if(!run.timerAt)return {...run};
 const from=Date.parse(run.timerAt);if(!Number.isFinite(from))throw fail('计时起点无效，请先核对记录。');
 const end=accrue?Math.max(from,clock()):from,delta=(end-from)/1000;
 const sessions=[...(run.timerSessions||[])],index=sessions.findIndex(item=>item.id===run.activeTimerSessionId);
 const session=index>=0?{...sessions[index]}:{id:randomUUID(),startedAt:run.timerAt,seconds:0,basis:'legacy-checkpoint'};
 session.seconds=(session.seconds||0)+delta;session.lastCheckpointAt=new Date(end).toISOString();
 if(stop){session.endedAt=session.lastCheckpointAt;session.endReason=reason;}
 if(index>=0)sessions[index]=session;else sessions.push(session);
 return {...run,seconds:(run.seconds||0)+delta,timerAt:stop?null:session.lastCheckpointAt,timerSessions:sessions,activeTimerSessionId:stop?null:session.id,timerVersion:(run.timerVersion||0)+1};
}
export function timerAction(id,value,{clock=Date.now}={}){
 const {opId,...body}=validate(input,value),key=opId?'work-run-operation:'+opId:null,hash=payloadHash({id,...body});
 return transaction(()=>{
  if(key){const cached=db.prepare('SELECT result FROM operations WHERE id=?').get(key);if(cached){const receipt=JSON.parse(cached.result);if(receipt.hash!==hash)throw fail('此操作编号已用于不同的投入记录。');if(!get(id,'workRun'))throw fail('执行记录已删除，原操作不会重新执行。',410);return receipt.result;}}
  let run=get(id,'workRun');if(!run)throw fail('执行记录不存在。',404);
  const task=get(run.taskId,'workTask');if(!task)throw fail('原任务已不存在。',404);
  if(!['open','review'].includes(run.status))throw fail('本次执行已结束，投入记录不能继续修改。');
  let next=run;
  if(body.action==='start'){
   if(!supervisionActive(task))throw fail('监督已暂停或取消，请先恢复监督。');
   if(!run.timerAt){const startedAt=new Date(clock()).toISOString(),session={id:randomUUID(),startedAt,lastCheckpointAt:startedAt,seconds:0};next={...run,timerAt:startedAt,activeTimerSessionId:session.id,timerSessions:[...(run.timerSessions||[]),session],timerVersion:(run.timerVersion||0)+1};}
  }else if(body.action==='stop'){if(run.timerAt)next=settledTimer(run,{clock,stop:true});}
  else{
   if(!!body.startedAt!==!!body.endedAt)throw fail('补记需要同时填写开始和结束时间。',422);
   if(body.startedAt){
    const start=Date.parse(body.startedAt),end=Date.parse(body.endedAt);
    if(end<=start||end>clock()||Math.abs((end-start)/60000-body.minutes)>0.000001)throw fail('补记时间范围无效，结束时间不能在未来，分钟数必须与区间一致。',422);
    const overlaps=(from,to)=>Number.isFinite(from)&&Number.isFinite(to)&&start<to&&end>from;
    for(const existing of all('workRun').filter(item=>item.taskId===run.taskId)){
     for(const entry of existing.manualAdjustments||[])if(overlaps(Date.parse(entry.startedAt),Date.parse(entry.endedAt)))throw fail('这段时间与本任务已有补记重叠，请核对投入记录。');
     for(const session of existing.timerSessions||[])if(overlaps(Date.parse(session.startedAt),Date.parse(session.endedAt||(existing.timerAt?new Date(clock()).toISOString():session.lastCheckpointAt))))throw fail('这段时间与本任务已有计时重叠，请核对投入记录。');
     if(existing.timerAt&&!(existing.timerSessions||[]).length&&overlaps(Date.parse(existing.timerAt),clock()))throw fail('这段时间与当前计时重叠，请先暂停并核对。');
    }
   }
   next=settledTimer(run,{clock,stop:true,reason:'manual-adjustment'});
   const entry={id:opId,minutes:body.minutes,reason:body.reason,at:new Date(clock()).toISOString(),...(body.startedAt?{startedAt:new Date(body.startedAt).toISOString(),endedAt:new Date(body.endedAt).toISOString(),basis:'interval'}:{basis:'duration-only'})};
   next={...next,seconds:(next.seconds||0)+body.minutes*60,manualAdjustments:[...(run.manualAdjustments||[]),entry],timerVersion:(run.timerVersion||0)+1};
  }
  const result=next===run?run:save('workRun',next,run.revision);
  if(key)db.prepare('INSERT INTO operations(id,result) VALUES(?,?)').run(key,JSON.stringify({hash,result}));
  return result;
 });
}
export function checkpointTimer(id,{clock=Date.now}={}){return transaction(()=>{
 const run=get(id,'workRun');if(!run?.timerAt)return run;
 const task=get(run.taskId,'workTask');
 const next=settledTimer(run,{clock,stop:!task||!supervisionActive(task),reason:'supervision-inactive'});
 return save('workRun',next,run.revision);
});}
export function stopTaskTimers(taskId,{clock=Date.now}={}){
 // Caller owns the transaction together with the template status transition.
 for(const run of all('workRun').filter(run=>run.taskId===taskId&&run.timerAt))save('workRun',settledTimer(run,{clock,stop:true,reason:'supervision-paused'}),run.revision);
}
export function recoverTimers(){return transaction(()=>{
 let stopped=0;for(const run of all('workRun').filter(run=>run.timerAt)){
  save('workRun',{...settledTimer(run,{stop:true,accrue:false,reason:'server-restart'}),notice:'服务重启，计时停在最近保存的检查点；未累计停机时间，请手动继续。'},run.revision);stopped++;
 }return stopped;
});}
