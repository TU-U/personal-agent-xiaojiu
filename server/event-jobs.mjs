import {eventOperation} from './event-operation.mjs';
import {z} from 'zod';
import {validate} from './validation.mjs';
import {eventReviewContext,eventReviewStale} from './event-review-context.mjs';
import {all,db,get,save,transaction} from './store.mjs';
import {createJobRepository} from './background-jobs.mjs';
import {generateEventReview} from './events.mjs';
import {commitEventReview} from './event-lifecycle.mjs';
export const eventJobs=createJobRepository(db);
function eligible(event,check){return event?.lifecycleStatus==='ongoing'&&event.status==='open'&&check?.eventId===event.id&&check.status==='pending'&&!!check.dueAt&&(check.reviewedDueAt!==check.dueAt||eventReviewStale(event,check));}
export function syncEventJob(event){
 const check=event?.currentOccurrenceId?get(event.currentOccurrenceId,'eventOccurrence'):null;
 const key=eligible(event,check)?`event-check-${check.id}-${check.revision}-${event.revision}-${eventReviewContext(event).snapshot.signature}`:null;
 for(const row of db.prepare("SELECT id,operation_key FROM background_jobs WHERE kind='event-check' AND entity_id=? AND state IN ('pending','running','failed')").all(event.id))if(row.operation_key!==key)eventJobs.cancel(row.id);
 if(!key)return null;
 return eventJobs.enqueue({key,kind:'event-check',entityId:event.id,revision:event.revision,dueAt:Date.parse(check.dueAt),payload:{occurrenceId:check.id,occurrenceRevision:check.revision,inputSignature:eventReviewContext(event).snapshot.signature}});
}
export function reconcileEventJobs(){return transaction(()=>{
 for(const event of all('event'))syncEventJob(event);
 for(const row of db.prepare("SELECT id,entity_id FROM background_jobs WHERE kind='event-check' AND state IN ('pending','running','failed')").all())if(!get(row.entity_id,'event'))eventJobs.cancel(row.id);
});}
function source(job){
 const event=get(job.entity_id,'event'),check=get(job.payload.occurrenceId,'eventOccurrence');
 if(!eligible(event,check)||event.currentOccurrenceId!==check.id||event.revision!==job.revision||check.revision!==job.payload.occurrenceRevision||Date.parse(check.dueAt)>Date.now())return null;
 return {event,check};
}
export function requestEventReview(id,input={}){
 const {opId,...body}=validate(z.strictObject({opId:z.string().min(8).max(100).optional(),revision:z.number().int().positive().optional(),occurrenceId:z.string().min(1).max(100).optional()}),input);
 const operation=eventOperation('check:'+id,opId,body);if(operation.cached)return operation.cached;
 return operation.commit(()=>{
 let event=get(id,'event');if(!event)throw Object.assign(new Error('要事不存在。'),{status:404});
 const check=event.currentOccurrenceId?get(event.currentOccurrenceId,'eventOccurrence'):null;
 if(body.revision!==undefined&&body.revision!==event.revision||body.occurrenceId!==undefined&&body.occurrenceId!==check?.id)throw Object.assign(new Error('要事或检查已变化，请刷新后重试。'),{status:409});
 if(event.lifecycleStatus!=='ongoing'||event.priority!=='high'||check?.status!=='pending'||Date.parse(check.dueAt)>Date.now())throw Object.assign(new Error('只有到期且未确认的高等级检查才能复核。'),{status:422});
 if(check.reviewedDueAt===check.dueAt){
  save('eventOccurrence',{...check,reviewedDueAt:'',history:[...(check.history||[]),{action:'retry_requested',at:new Date().toISOString(),dueAt:check.dueAt,reviewText:check.reviewText||'',reviewNotice:check.reviewNotice||'',reviewedAt:check.reviewedAt||null,reviewSnapshot:check.reviewSnapshot||null}],reviewText:'',reviewNotice:'',reviewedAt:''},check.revision);
  event=save('event',{...event,reviewedDueAt:'',reviewText:'',reviewNotice:'',reviewedAt:''},event.revision);
 }
 const job=syncEventJob(event);if(job?.state==='failed')eventJobs.retry(job.id);
 return {...event,reviewJob:job?{id:job.id,state:eventJobs.get(job.id).state}:null};
});}
export function makeEventHandlers(generate=generateEventReview){return {'event-check':{
 async run(job){const current=source(job);if(!current)return {stale:true};const context=eventReviewContext(current.event);if(context.snapshot.signature!==job.payload.inputSignature)return {stale:true};if(current.event.priority!=='high')return {reviewText:'',reviewNotice:'',reviewSnapshot:context.snapshot};return {...await generate(current.event,context),reviewSnapshot:context.snapshot};},
 commit(job,result){const current=source(job);if(!current||result.stale||result.reviewSnapshot?.signature!==eventReviewContext(current.event).snapshot.signature)return;
  commitEventReview(current.event.id,{eventRevision:job.revision,occurrenceId:current.check.id,occurrenceRevision:current.check.revision,reviewText:result.reviewText,reviewNotice:result.reviewNotice,reviewSnapshot:result.reviewSnapshot},{atomic:fn=>fn()});
 }
}};}
export const eventHandlers=makeEventHandlers();
export function eventJobStatus(event){
 const row=db.prepare("SELECT id FROM background_jobs WHERE kind='event-check' AND entity_id=? ORDER BY rowid DESC LIMIT 1").get(event.id);
 const job=row?eventJobs.get(row.id):null;
 return job&&job.payload.occurrenceId===event.currentOccurrenceId?{id:job.id,state:job.state,error:job.error||''}:null;
}
