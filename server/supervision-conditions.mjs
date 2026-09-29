import {syncSupervisionCalendar} from './supervision-calendar.mjs';
import {z} from 'zod';
import {all,db,get,save,transaction} from './store.mjs';
import {validate} from './validation.mjs';
import {payloadHash} from './device-auth.mjs';
export const conditionsSchema=z.array(z.strictObject({id:z.string().min(1).max(100),kind:z.literal('evidence'),required:z.literal(true),description:z.string().trim().min(1).max(4000)})).min(1).max(20).refine(items=>new Set(items.map(item=>item.id)).size===items.length,'条件编号重复').refine(items=>items.reduce((sum,item)=>sum+item.description.length,0)<=8000,'条件总长度超限');
export function templateConditions(task){return validate(conditionsSchema,task.completionConditions??[{id:'result',kind:'evidence',required:true,description:task.requirement||task.plan?.deliverable}],{label:'完成条件'});}
const fail=(message,status=409)=>Object.assign(new Error(message),{status});
export function updateSupervisionConditions(id,input,{clock=Date.now}={}){
 const body=validate(z.strictObject({opId:z.string().min(8).max(100),planVersion:z.number().int().positive(),minutes:z.number().finite().min(0).max(1440),conditions:conditionsSchema}),input,{label:'完成条件'});
 const key='supervision-conditions:'+body.opId,hash=payloadHash({id,...body});
 return transaction(()=>{
  const cached=db.prepare('SELECT result FROM operations WHERE id=?').get(key);
  if(cached){const receipt=JSON.parse(cached.result);if(receipt.hash!==hash)throw fail('此操作编号已用于不同条件。');if(!get(id,'workTask'))throw fail('任务已删除，原修改不会重做。',410);return receipt.result;}
  const task=get(id,'workTask');if(!task)throw fail('任务已不存在。',404);
  if(task.status==='cancelled')throw fail('任务已取消，不能修改完成条件。');
  if((task.planVersion||1)!==body.planVersion)throw fail('完成条件已被修改，请核对最新版本后重试。');
  if(task.repeat!=='daily'&&all('workRun').some(run=>run.taskId===id))throw fail('一次性任务已开始，不能修改本次验收门槛。');
  const previous={planVersion:task.planVersion||1,minutes:task.minutes||0,conditions:templateConditions(task)};
  const result=save('workTask',{...task,minutes:body.minutes,completionConditions:body.conditions,requirement:body.conditions.map(item=>item.description).join('；'),planVersion:previous.planVersion+1,conditionChanges:[...(task.conditionChanges||[]),{opId:body.opId,at:new Date(clock()).toISOString(),previous,next:{planVersion:previous.planVersion+1,minutes:body.minutes,conditions:body.conditions}}]},task.revision);
  syncSupervisionCalendar(result,{startTime:result.startTime||'09:00',time:result.time||'20:00',conditionsSnapshot:{version:1,taskRevision:result.revision,planVersion:result.planVersion,minimumSeconds:result.minutes*60,conditions:result.completionConditions,basis:'confirmed-template'}},{clock});
  db.prepare('INSERT INTO operations(id,result) VALUES(?,?)').run(key,JSON.stringify({hash,result}));return result;
 });
}
