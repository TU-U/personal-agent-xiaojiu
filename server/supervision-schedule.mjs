import {syncSupervisionRun} from './supervision-jobs.mjs';
import {z} from 'zod';
import {db,get,save,transaction} from './store.mjs';
import {validate} from './validation.mjs';
import {payloadHash} from './device-auth.mjs';
import {settledTimer} from './supervision-timer.mjs';
const fail=(message,status=409)=>Object.assign(new Error(message),{status});
const common={opId:z.string().min(8).max(100).optional(),scheduleVersion:z.number().int().positive().optional()};
const schema=z.discriminatedUnion('action',[
 z.strictObject({...common,action:z.literal('snooze'),until:z.iso.datetime({offset:true})}),
 z.strictObject({...common,action:z.literal('skip'),reason:z.string().trim().min(1).max(1000)})
]);
export function scheduleRunAction(id,input,{clock=Date.now}={}){
 const body=validate(schema,input,{label:'任务调整'}),key=body.opId?'work-run-schedule:'+body.opId:null,hash=payloadHash({id,...body});
 return transaction(()=>{
  if(key){const row=db.prepare('SELECT result FROM operations WHERE id=?').get(key);if(row){const receipt=JSON.parse(row.result);if(receipt.hash!==hash)throw fail('此操作编号已用于不同调整。');if(!get(id,'workRun'))throw fail('本次记录已删除，原操作不会重做。',410);return receipt.result;}}
  const run=get(id,'workRun');if(!run||!get(run.taskId,'workTask'))throw fail('任务或执行记录已不存在。',404);
  if(!['open','review'].includes(run.status))throw fail('这次执行已结束，不能修改历史。');
  const version=run.scheduleVersion||1;if(body.scheduleVersion!==undefined&&body.scheduleVersion!==version)throw fail('约定时间已修改，请核对最新时间后再提交。');
  const at=new Date(clock()).toISOString();let patch;
  if(body.action==='snooze'){
   if(Date.parse(body.until)<=clock())throw fail('请选择未来时间。',422);
   const until=new Date(body.until).toISOString();
   patch={scheduleVersion:version+1,scheduledDueAt:until,snoozedUntil:until,reminded:false,notice:'已安排稍后检查',scheduleHistory:[...(run.scheduleHistory||[]),{action:'snooze',at,from:run.scheduledDueAt||null,to:until,fromVersion:version,toVersion:version+1,logicalDay:run.logicalDay||run.day,opId:body.opId||null}]};
  }else patch={...settledTimer(run,{clock,stop:true,reason:'skipped'}),status:'skipped',reason:body.reason,skipReason:body.reason,skippedAt:at,reminded:false,notice:'',snoozedUntil:null,scheduleVersion:version+1,scheduleHistory:[...(run.scheduleHistory||[]),{action:'skip',at,reason:body.reason,fromVersion:version,toVersion:version+1,opId:body.opId||null}]};
  const result=save('workRun',{...run,...patch},run.revision);syncSupervisionRun(id,{clock});if(key)db.prepare('INSERT INTO operations(id,result) VALUES(?,?)').run(key,JSON.stringify({hash,result}));return result;
 });
}
