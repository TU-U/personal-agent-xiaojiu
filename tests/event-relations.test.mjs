import {test,after} from 'node:test';import assert from 'node:assert/strict';import express from 'express';
import {mkdtemp,rm} from 'node:fs/promises';import path from 'node:path';import os from 'node:os';
const root=await mkdtemp(path.join(os.tmpdir(),'event-relations-'));Object.assign(process.env,{DATA_DIR:root,SEED_DEMO:'false',WORKER_MODE:'true'});
const {db,save,get,remove}=await import('../server/store.mjs');const {validateEventRelations,installEventRelations}=await import('../server/domain/events/event-relations.mjs');const {initializeEventLifecycle:create,editEventLifecycle:edit}=await import('../server/domain/events/event-lifecycle.mjs');
test('manual relation validation refuses null, duplicates, wrong kinds, self and removed sources before writes',()=>{
 const task=save('workTask',{title:'任务',status:'draft'}),related=create({title:'其他要事',eventType:'one_off',priority:'normal'}),event=create({title:'主体',eventType:'long_term',priority:'high',relatedTaskIds:[task.id],relatedEventIds:[related.id]});
 for(const data of [{relatedEventIds:null},{relatedEventIds:[event.id]},{relatedEventIds:[related.id,related.id]},{relatedTaskIds:[related.id]},{relatedTaskIds:Array(11).fill(task.id)}])assert.throws(()=>validateEventRelations(data,event.id),e=>e.status===422);
 assert.equal(get(task.id,'workTask').status,'draft');remove(task.id,'workTask',task.revision);assert.throws(()=>edit(event.id,{...event,title:'不能保存'},event.revision),/关联任务已删除/);assert.equal(get(event.id,'event').revision,event.revision);
 const fixed=edit(event.id,{...event,relatedTaskIds:[]},event.revision);assert.deepEqual(fixed.relatedEventIds,[related.id]);
});
test('candidate pages exclude self while resolver retains missing selections and searches all candidates',async()=>{
 const tasks=Array.from({length:25},(_,i)=>save('workTask',{title:'候选任务'+i,status:'draft'}));
 const self=create({title:'自己',eventType:'one_off',priority:'normal'});
 const app=express();app.use(express.json());installEventRelations(app);app.use((e,req,res,next)=>res.status(e.status||500).json({error:e.message}));const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const url='http://127.0.0.1:'+server.address().port;
 try{
  const page=await (await fetch(url+'/api/event-references?kind=workTask&offset=20&limit=20')).json();assert.equal(page.items.length,5);assert.equal(page.total,25);
  const search=await (await fetch(url+'/api/event-references?kind=workTask&q='+encodeURIComponent('候选任务24'))).json();assert.equal(search.items[0].id,tasks[24].id);
  const events=await (await fetch(url+'/api/event-references?kind=event&excludeId='+self.id)).json();assert.ok(!events.items.some(item=>item.id===self.id));
  const selected=await (await fetch(url+'/api/event-references/resolve',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind:'event',ids:[self.id,'deleted-id'],excludeId:self.id})})).json();assert.equal(selected.items.length,2);assert.equal(selected.items[0].invalid,'不能关联自身');assert.equal(selected.items[1].invalid,'来源已删除或失效');
 }finally{await new Promise(r=>server.close(r));}
});
after(async()=>{db.close();await rm(root,{recursive:true,force:true});});
