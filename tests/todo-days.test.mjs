import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';import path from 'node:path';
test('carry uses Shanghai dates and source identity, preserves history, and rejects stale or invalid actions',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'shiguang-todo-days-'));process.env.DATA_DIR=dir;process.env.SEED_DEMO='false';process.env.WORKER_MODE='true';
 const {save,get,all,remove,db}=await import('../server/store.mjs');const {calendarDay,validDay,carryTodo}=await import('../server/domain/notes/todo-days.mjs');
 try{
  assert.equal(calendarDay('2026-09-28T15:59:59Z'),'2026-09-28');assert.equal(calendarDay('2026-09-28T16:00:00Z'),'2026-09-29');assert.equal(validDay('2026-02-30'),false);assert.equal(validDay('2028-02-29'),true);
  const now=new Date('2026-09-29T05:00:00Z'),a=save('todo',{title:'同名待办',day:'2026-09-28',done:false}),b=save('todo',{title:'同名待办',day:'2026-09-28',done:false});
  const body={revision:a.revision,targetDay:'2026-09-29'};
  const first=carryTodo(a.id,body,now),retry=carryTodo(a.id,body,now);assert.equal(first.id,retry.id);assert.equal(first.carriedFromId,a.id);assert.equal(first.carriedRootId,a.id);assert.equal(first.carriedSourceRevision,a.revision);assert.equal(get(a.id,'todo').revision,a.revision);assert.equal(get(a.id,'todo').done,false);
  const second=carryTodo(b.id,{revision:b.revision,targetDay:body.targetDay},now);assert.notEqual(second.id,first.id);assert.equal(all('todo').filter(t=>t.day===body.targetDay).length,2);
  const next=new Date('2026-09-30T05:00:00Z'),fromCopy=carryTodo(first.id,{revision:first.revision,targetDay:'2026-09-30'},next),fromOriginal=carryTodo(a.id,{revision:a.revision,targetDay:'2026-09-30'},next);assert.equal(fromCopy.id,fromOriginal.id);assert.equal(fromCopy.carriedFromId,first.id);
  const stale=save('todo',{title:'已变更',day:'2026-09-28',done:false});save('todo',{...stale,title:'新标题'},stale.revision);assert.throws(()=>carryTodo(stale.id,{revision:stale.revision,targetDay:body.targetDay},now),/已更新/);
  const done=save('todo',{title:'已完成',day:'2026-09-28',done:true});assert.throws(()=>carryTodo(done.id,{revision:done.revision,targetDay:body.targetDay},now),/已完成/);
  assert.throws(()=>carryTodo(first.id,{revision:first.revision,targetDay:body.targetDay},now),/之前日期/);
  assert.throws(()=>carryTodo(a.id,{revision:a.revision,targetDay:'2026-09-28'},now),/日期已变化/);
  remove(first.id,'todo',first.revision);assert.throws(()=>carryTodo(a.id,body,now),/已被删除/);assert.equal(all('todo').filter(t=>t.day===body.targetDay).length,1);
 }finally{db.close();await rm(dir,{recursive:true,force:true});}
});
