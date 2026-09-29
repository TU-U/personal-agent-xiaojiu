import {test,after} from 'node:test';import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';import path from 'node:path';import os from 'node:os';
const root=await mkdtemp(path.join(os.tmpdir(),'event-lifecycle-'));Object.assign(process.env,{DATA_DIR:root,SEED_DEMO:'false',WORKER_MODE:'true'});
const {db,get,save,all}=await import('../server/store.mjs');
const {editEventLifecycle:edit,initializeEventLifecycle:create,migrateEventLifecycle:migrate,eventChecks,scheduleEventCheck:schedule,snoozeEventCheck:snooze,confirmEventCheck:confirm,endEvent:end,commitEventReview:review}=await import('../server/event-lifecycle.mjs');
const past='2020-01-01T00:00:00.000Z',future='2099-01-01T00:00:00.000Z';
test('migration preserves old confirmation, attachments and IDs without inferring duration or end state',()=>{
 const legacy=save('event',{title:'历史经历',status:'confirmed',priority:'high',dueAt:past,confirmedAt:past,images:[{key:'keep'}],sourceNoteId:'source',reviewText:'历史建议',reviewedDueAt:past});
 assert.equal(migrate().migrated,1);const event=get(legacy.id,'event');assert.equal(event.eventType,null);assert.equal(event.lifecycleStatus,'ongoing');assert.deepEqual(event.images,legacy.images);assert.equal(event.sourceNoteId,'source');
 const checks=eventChecks(event.id);assert.equal(checks.length,1);assert.equal(checks[0].status,'confirmed');assert.equal(checks[0].reviewText,'历史建议');assert.equal(migrate().migrated,0);
});
test('all four combinations support no reminder and confirmation never ends an event',()=>{
 for(const eventType of ['long_term','one_off'])for(const priority of ['normal','high']){
  let event=create({title:'四种组合',eventType,priority,dueAt:''});assert.equal(eventChecks(event.id).length,0);
  event=schedule(event.id,{revision:event.revision,dueAt:past});let check=eventChecks(event.id)[0];
  if(priority==='high'){
   assert.throws(()=>confirm(event.id,{revision:event.revision,occurrenceId:check.id}),/复核/);
   event=review(event.id,{eventRevision:event.revision,occurrenceId:check.id,occurrenceRevision:check.revision,reviewText:'',reviewNotice:'模型不可用，请自行核对'});
  }
  event=confirm(event.id,{revision:event.revision,occurrenceId:check.id});assert.equal(event.lifecycleStatus,'ongoing');
  event=schedule(event.id,{revision:event.revision,dueAt:future});assert.notEqual(event.currentOccurrenceId,check.id);assert.equal(eventChecks(event.id).length,2);assert.equal(get(check.id,'eventOccurrence').status,'confirmed');
  event=end(event.id,{revision:event.revision});assert.equal(event.lifecycleStatus,'ended');assert.equal(get(event.currentOccurrenceId,'eventOccurrence').status,'cancelled');assert.throws(()=>schedule(event.id,{revision:event.revision,dueAt:future}),/已结束/);
 }
});
test('snooze keeps occurrence identity and history while fencing stale reviews and confirmations',()=>{
 let event=create({title:'改期',eventType:'long_term',priority:'high',dueAt:past});const original=event,check=eventChecks(event.id)[0];
 event=review(event.id,{eventRevision:event.revision,occurrenceId:check.id,occurrenceRevision:check.revision,reviewText:'旧建议',reviewNotice:''});
 event=snooze(event.id,{revision:event.revision,occurrenceId:check.id,dueAt:future});
 const moved=get(check.id,'eventOccurrence');assert.equal(event.currentOccurrenceId,check.id);assert.equal(moved.history[0].reviewText,'旧建议');assert.equal(moved.reviewText,'');
 assert.throws(()=>review(event.id,{eventRevision:original.revision,occurrenceId:check.id,occurrenceRevision:check.revision,reviewText:'迟到',reviewNotice:''}),/已变化/);
 assert.throws(()=>confirm(event.id,{revision:event.revision,occurrenceId:check.id}),/还未到/);
 assert.throws(()=>snooze(event.id,{revision:event.revision,occurrenceId:check.id,dueAt:past}),/未来/);
 assert.equal(get(check.id,'eventOccurrence').revision,moved.revision);
});
test('invalid type, priority and date do not create event or occurrence',()=>{
 const before=all('event').length,checks=all('eventOccurrence').length;
 for(const data of [{eventType:'weekly',priority:'normal'},{eventType:'one_off',priority:'urgent'},{eventType:'one_off',priority:'normal',dueAt:'not-a-date'}])assert.throws(()=>create({title:'拒绝输入',...data}));
 assert.equal(all('event').length,before);assert.equal(all('eventOccurrence').length,checks);
});
test('event write failure rolls back occurrence creation',()=>{
 const event=create({title:'事务',eventType:'one_off',priority:'normal',dueAt:''});
 db.exec(`CREATE TRIGGER fail_event BEFORE UPDATE ON entities WHEN NEW.id='${event.id}' BEGIN SELECT RAISE(ABORT,'injected'); END`);
 try{assert.throws(()=>schedule(event.id,{revision:event.revision,dueAt:past}),/injected/);}finally{db.exec('DROP TRIGGER fail_event');}
 assert.equal(eventChecks(event.id).length,0);assert.equal(get(event.id,'event').revision,event.revision);
});
test('editing cancels or reschedules only the pending occurrence and preserves ended lifecycle',()=>{
 let event=create({title:'编辑生命周期',eventType:'one_off',priority:'normal',dueAt:past});const id=event.currentOccurrenceId;
 event=edit(event.id,{...event,title:'改名',dueAt:future},event.revision);assert.equal(event.currentOccurrenceId,id);assert.equal(get(id,'eventOccurrence').history.length,1);
 event=edit(event.id,{...event,dueAt:''},event.revision);assert.equal(event.currentOccurrenceId,null);assert.equal(get(id,'eventOccurrence').status,'cancelled');
 event=edit(event.id,{...event,dueAt:future},event.revision);assert.notEqual(event.currentOccurrenceId,id);assert.equal(eventChecks(event.id).length,2);
 event=end(event.id,{revision:event.revision});const changed=edit(event.id,{...event,title:'已结束的历史'},event.revision);assert.equal(changed.lifecycleStatus,'ended');assert.equal(changed.status,'ended');
 assert.throws(()=>edit(event.id,{...changed,dueAt:past},changed.revision),/已结束/);
});
after(async()=>{db.close();await rm(root,{recursive:true,force:true});});
