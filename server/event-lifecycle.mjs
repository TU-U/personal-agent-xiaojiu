import {eventOperation} from './event-operation.mjs';
import {validateEventRelations} from './event-relations.mjs';
import {eventReviewContext,eventReviewStale} from './event-review-context.mjs';
import {syncEventJob} from './event-jobs.mjs';
import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {all,get,save,transaction,now} from './store.mjs';
import {validate} from './validation.mjs';
function persistEvent(data,revision){const event=save('event',data,revision);syncEventJob(event);return event;}
const fail=(message,status=409)=>Object.assign(new Error(message),{status});
export const eventTypeSchema=z.enum(['long_term','one_off']);
const date=z.string().datetime({offset:true});
const revision=z.number().int().positive();
function at(value){return new Date(validate(date,value)).toISOString();}
function current(id,expected){const event=get(id,'event');if(!event)throw fail('要事不存在或已删除。',404);if(expected!==undefined&&event.revision!==expected)throw fail('要事已变化，请刷新后核对。');return event;}
function occurrence(event){const check=event.currentOccurrenceId?get(event.currentOccurrenceId,'eventOccurrence'):null;if(event.currentOccurrenceId&&(!check||check.eventId!==event.id))throw fail('检查记录关联异常，未执行操作。');return check;}
const cleared={reviewText:'',reviewNotice:'',reviewedAt:'',reviewedDueAt:''};
// Called explicitly in a transaction after taking a consistent backup; never infer
// an old event's duration or completion from its reminder confirmation flag.
export function migrateEventLifecycle(){return transaction(()=>{
 let count=0;
 for(const event of all('event')){
  if(event.lifecycleVersion===1)continue;
  const id=event.dueAt?'event-occurrence:legacy:'+event.id:null;
  if(id){
   if(!Number.isFinite(Date.parse(event.dueAt)))throw fail('旧要事检查时间无效：'+event.id,422);
   if(get(id,'eventOccurrence'))throw fail('旧检查迁移标识冲突：'+event.id);
   save('eventOccurrence',{id,eventId:event.id,dueAt:new Date(event.dueAt).toISOString(),status:event.status==='confirmed'?'confirmed':'pending',confirmedAt:event.confirmedAt||null,reviewText:event.reviewText||'',reviewNotice:event.reviewNotice||'',reviewedAt:event.reviewedAt||null,reviewedDueAt:event.reviewedDueAt||'',inputEventRevision:event.revision,history:[],migrated:true});
  }
  persistEvent({...event,eventType:['long_term','one_off'].includes(event.eventType)?event.eventType:null,lifecycleStatus:'ongoing',lifecycleVersion:1,currentOccurrenceId:id},event.revision);count++;
 }
 return {migrated:count};
});}
export function initializeEventLifecycle(data,{assertCurrent=()=>{}}={}){
 const eventType=data.eventType==null?null:validate(eventTypeSchema,data.eventType);
 validate(z.enum(['normal','high']),data.priority);
 return transaction(()=>{
  assertCurrent();
  const id=data.id||randomUUID(),dueAt=data.dueAt?at(data.dueAt):'';
  if(get(id,'event'))throw fail('要事已存在。');
  validateEventRelations(data,id);
  const check=dueAt?save('eventOccurrence',{eventId:id,dueAt,status:'pending',history:[]}):null;
  return persistEvent({...data,id,eventType,lifecycleVersion:1,lifecycleStatus:'ongoing',status:'open',dueAt,currentOccurrenceId:check?.id||null,...cleared});
 });
}
export function eventChecks(id){current(id);return all('eventOccurrence').filter(item=>item.eventId===id);}
export function scheduleEventCheck(id,input){
 const {opId,...body}=validate(z.strictObject({opId:z.string().min(8).max(100).optional(),revision,dueAt:date}),input);
 const operation=eventOperation('schedule'+':'+id,opId,body);if(operation.cached)return operation.cached;
 const dueAt=at(body.dueAt);
 return operation.commit(()=>{
  const event=current(id,body.revision);if(event.lifecycleVersion!==1)throw fail('请先迁移要事检查记录。');
  if(event.lifecycleStatus!=='ongoing')throw fail('已结束要事不能安排检查。');
  const old=occurrence(event);
  if(old?.status==='pending')throw fail('已有待处理检查，请改期或取消后再安排。');
  const check=save('eventOccurrence',{eventId:id,dueAt,status:'pending',history:[]});
  return persistEvent({...event,currentOccurrenceId:check.id,dueAt,status:'open',confirmedAt:null,...cleared},event.revision);
 });
}
export function snoozeEventCheck(id,input,{clock=Date.now}={}){
 const {opId,...body}=validate(z.strictObject({opId:z.string().min(8).max(100).optional(),revision,occurrenceId:z.string().min(1),dueAt:date}),input);
 const operation=eventOperation('snooze'+':'+id,opId,body);if(operation.cached)return operation.cached;
 const dueAt=at(body.dueAt);
 if(Date.parse(dueAt)<=clock())throw fail('稍后检查必须选择未来的日期和时间。',422);
 return operation.commit(()=>{
  const event=current(id,body.revision),check=occurrence(event);
  if(event.lifecycleStatus!=='ongoing'||!check||check.id!==body.occurrenceId||check.status!=='pending')throw fail('当前待处理检查已变化。');
  if(dueAt===check.dueAt)return event;
  const history=[...(check.history||[]),{action:'snoozed',at:now(),dueAt:check.dueAt,reviewText:check.reviewText||'',reviewNotice:check.reviewNotice||'',reviewedAt:check.reviewedAt||null,reviewSnapshot:check.reviewSnapshot||null}];
  save('eventOccurrence',{...check,dueAt,history,...cleared},check.revision);
  return persistEvent({...event,dueAt,...cleared},event.revision);
 });
}
export function confirmEventCheck(id,input,{clock=Date.now}={}){
 const {opId,...body}=validate(z.strictObject({opId:z.string().min(8).max(100).optional(),revision,occurrenceId:z.string().min(1)}),input);
 const operation=eventOperation('confirm'+':'+id,opId,body);if(operation.cached)return operation.cached;
 return operation.commit(()=>{
  const event=current(id,body.revision),check=occurrence(event);
  if(event.lifecycleStatus!=='ongoing'||!check||check.id!==body.occurrenceId||check.status!=='pending')throw fail('当前待处理检查已变化。');
  if(Date.parse(check.dueAt)>clock())throw fail('还未到约定检查时间。',422);
  if(event.priority==='high'&&check.reviewedDueAt!==check.dueAt)throw fail('请先查看本次复核结果或失败说明，再确认。');
  if(eventReviewStale(event,check))throw fail('复核依据已变化，请重新复核后再确认。');
  const confirmedAt=now();save('eventOccurrence',{...check,status:'confirmed',confirmedAt},check.revision);
  return persistEvent({...event,status:'confirmed',confirmedAt},event.revision);
 });
}
export function endEvent(id,input){
 const {opId,...body}=validate(z.strictObject({opId:z.string().min(8).max(100).optional(),revision}),input);
 const operation=eventOperation('end'+':'+id,opId,body);if(operation.cached)return operation.cached;
 return operation.commit(()=>{
  const event=current(id,body.revision),check=occurrence(event);
  if(event.lifecycleVersion!==1)throw fail('请先迁移要事检查记录。');
  if(event.lifecycleStatus==='ended')return event;
  if(check?.status==='pending')save('eventOccurrence',{...check,status:'cancelled',cancelledAt:now(),cancelReason:'用户结束要事'},check.revision);
  return persistEvent({...event,lifecycleStatus:'ended',endedAt:now(),status:'ended'},event.revision);
 });
}
// Late results are fenced by BOTH the independent occurrence and source event.
export function commitEventReview(id,input,{atomic=transaction}={}){
 const body=validate(z.strictObject({eventRevision:revision,occurrenceId:z.string().min(1),occurrenceRevision:revision,reviewText:z.string().max(10000),reviewNotice:z.string().max(2000),reviewSnapshot:z.object({signature:z.string(),sources:z.array(z.unknown())}).passthrough().optional()}),input);
 return atomic(()=>{
  const event=current(id,body.eventRevision),check=occurrence(event);
  if(event.lifecycleStatus!=='ongoing'||!check||check.id!==body.occurrenceId||check.revision!==body.occurrenceRevision||check.status!=='pending'||Date.parse(check.dueAt)>Date.now())throw fail('复核对应的检查已变化，旧结果未保存。');
  if(event.priority==='high'&&!body.reviewText.trim()&&!body.reviewNotice.trim())throw fail('复核内容或失败说明不能为空。',422);
  const reviewSnapshot=body.reviewSnapshot||eventReviewContext(event).snapshot;
  if(reviewSnapshot.signature!==eventReviewContext(event).snapshot.signature)throw fail('复核依据已变化，旧结果未保存。');
  const result={reviewSnapshot,reviewText:body.reviewText.trim(),reviewNotice:body.reviewNotice.trim(),reviewedAt:now(),reviewedDueAt:check.dueAt};
  save('eventOccurrence',{...check,...result,inputEventRevision:event.revision,history:check.reviewedAt?[...(check.history||[]),{action:'review_replaced',at:now(),dueAt:check.dueAt,reviewText:check.reviewText||'',reviewNotice:check.reviewNotice||'',reviewedAt:check.reviewedAt,reviewSnapshot:check.reviewSnapshot||null}]:check.history||[]},check.revision);
  return save('event',{...event,...result},event.revision);
 });
}
export function editEventLifecycle(id,data,expected,{assertCurrent=()=>{}}={}){
 return transaction(()=>{
  assertCurrent();
  const event=current(id,expected),check=occurrence(event);
  validateEventRelations(data,id);
  const eventType=data.eventType===null?null:validate(eventTypeSchema,data.eventType);
  const dueAt=data.dueAt?at(data.dueAt):'';
  if(event.lifecycleVersion!==1)throw fail('请先迁移要事检查记录。');
  if(event.lifecycleStatus==='ended'&&dueAt!==event.dueAt)throw fail('已结束要事不能修改检查约定。');
  let currentOccurrenceId=event.currentOccurrenceId,status=event.status;
  if(dueAt!==event.dueAt){
   if(check?.status==='pending'){
    if(dueAt){
     if(Date.parse(dueAt)<=Date.now())throw fail('改期请选择未来的日期和时间。',422);
     save('eventOccurrence',{...check,dueAt,...cleared,history:[...(check.history||[]),{action:'snoozed',at:now(),dueAt:check.dueAt,reviewText:check.reviewText||'',reviewNotice:check.reviewNotice||'',reviewedAt:check.reviewedAt||null,reviewSnapshot:check.reviewSnapshot||null}]},check.revision);
    }else{save('eventOccurrence',{...check,status:'cancelled',cancelledAt:now(),cancelReason:'用户取消约定'},check.revision);currentOccurrenceId=null;}
   }else if(dueAt){currentOccurrenceId=save('eventOccurrence',{eventId:id,dueAt,status:'pending',history:[]}).id;status='open';}
   else currentOccurrenceId=null;
  }else if(check?.status==='pending'){
   save('eventOccurrence',{...check,...cleared,history:check.reviewedAt?[...(check.history||[]),{action:'event_edited',at:now(),dueAt:check.dueAt,reviewText:check.reviewText||'',reviewNotice:check.reviewNotice||'',reviewedAt:check.reviewedAt,reviewSnapshot:check.reviewSnapshot||null}]:check.history||[]},check.revision);
  }
  const reset=dueAt!==event.dueAt||check?.status==='pending';
  return persistEvent({...data,id:event.id,eventType,lifecycleVersion:1,lifecycleStatus:event.lifecycleStatus,currentOccurrenceId,status,dueAt,...(reset?cleared:{})},event.revision);
 });
}
