import {test,after} from 'node:test';import assert from 'node:assert/strict';import {mkdtemp,rm} from 'node:fs/promises';import os from 'node:os';import path from 'node:path';
const root=await mkdtemp(path.join(os.tmpdir(),'supervision-conditions-'));Object.assign(process.env,{DATA_DIR:root,SEED_DEMO:'false',WORKER_MODE:'true'});
const {db,save,get,all}=await import('../server/store.mjs');const {updateSupervisionConditions:update}=await import('../server/pet/supervision/supervision-conditions.mjs');const {ensureSupervisionRuns:ensure}=await import('../server/pet/supervision/supervision-runs.mjs');
const condition=(id,description)=>({id,description,kind:'evidence',required:true});
const task=()=>save('workTask',{title:'读书',status:'draft',supervisionStatus:'draft',supervisionVersion:1,planVersion:1,minutes:30,repeat:'daily',requirement:'三条心得'});
const body=(opId='conditions-first')=>({opId,planVersion:1,minutes:45,conditions:[condition('points','三条心得'),condition('example','一个实践例子')]});
const clock=day=>()=>Date.parse(day+'T04:00:00Z');
test('conditions are versioned, all required, retry-safe, and existing daily snapshots never change',()=>{
 const draft=task(),edited=update(draft.id,body());assert.equal(edited.planVersion,2);assert.equal(edited.conditionChanges.length,1);assert.deepEqual(update(draft.id,body()),edited);assert.throws(()=>update(draft.id,{...body(),minutes:10}),/编号/);
 save('workTask',{...edited,status:'running',supervisionStatus:'active'},edited.revision);ensure({clock:clock('2026-09-29')});const first=all('workRun').find(r=>r.taskId===draft.id);assert.equal(first.conditionsSnapshot.conditions.length,2);assert.equal(first.conditionsSnapshot.minimumSeconds,2700);
 const changed=update(draft.id,{...body('conditions-next'),planVersion:2,minutes:90,conditions:[condition('new','读另一篇文章')]});assert.equal(changed.planVersion,3);assert.equal(changed.conditionChanges[1].previous.conditions.length,2);
 assert.deepEqual(get(first.id,'workRun').conditionsSnapshot,first.conditionsSnapshot);ensure({clock:clock('2026-09-29')});assert.equal(all('workRun').filter(r=>r.taskId===draft.id).length,1);
 ensure({clock:clock('2026-09-30')});const next=all('workRun').find(r=>r.taskId===draft.id&&r.day==='2026-09-30');assert.equal(next.conditionsSnapshot.conditions[0].id,'new');assert.equal(next.conditionsSnapshot.minimumSeconds,5400);
 assert.throws(()=>update(draft.id,body('stale-condition')),/已被修改/);
});
test('invalid conditions and once-started edits do not change state',()=>{
 const draft=task(),base=body('invalid-conditions');
 for(const patch of [{conditions:[]},{conditions:[condition('a','')]},{conditions:[condition('a','x'),condition('a','y')]},{conditions:[{...condition('a','x'),required:false}]},{conditions:[{...condition('a','x'),confirmed:true}]},{minutes:-1},{conditions:Array.from({length:21},(_,i)=>condition(String(i),'x'))},{conditions:[condition('a','a'.repeat(4000)),condition('b','b'.repeat(4000)),condition('c','c')]}])assert.throws(()=>update(draft.id,{...base,...patch}),error=>error.status===400);
 assert.equal(get(draft.id,'workTask').revision,draft.revision);
 const once=save('workTask',{...draft,id:undefined,repeat:'once',status:'running',supervisionStatus:'active'});ensure({clock:clock('2026-09-29')});assert.throws(()=>update(once.id,body('once-blocked')),/一次性任务已开始/);
});
after(async()=>{db.close();await rm(root,{recursive:true,force:true});});
