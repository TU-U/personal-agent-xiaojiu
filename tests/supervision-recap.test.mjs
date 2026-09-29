import {test,after} from 'node:test';import assert from 'node:assert/strict';import {mkdtemp,rm} from 'node:fs/promises';import os from 'node:os';import path from 'node:path';
const root=await mkdtemp(path.join(os.tmpdir(),'supervision-recap-'));Object.assign(process.env,{DATA_DIR:root,SEED_DEMO:'false',WORKER_MODE:'true'});
const {db,save,get,all}=await import('../server/store.mjs');const {dailySupervisionRecap:read,generateSupervisionRecap:generate}=await import('../server/supervision-recap.mjs');
function fixture(day){const task=save('workTask',{title:'学习'});return ['completed','review','skipped'].map((status,i)=>save('workRun',{taskId:task.id,day,logicalDay:day,status,seconds:(i+1)*600,conditionsSnapshot:{minimumSeconds:1800,conditions:[{id:'result',description:'三点心得'}]},evidence:'原始心得',skipReason:status==='skipped'?'身体不舒服':'',scheduledDueAt:'2099-01-01T12:00:00Z'}));}
const response=items=>JSON.stringify({items:items.map(item=>({runId:item.id,advice:'建议先核对已保存的心得，再决定下一步。'}))});
test('daily facts are deterministic, logical-day based, and AI cannot change completion',async()=>{
 const runs=fixture('2026-09-20'),before=read('2026-09-20');assert.deepEqual(before.totals,{planned:3,completed:1,skipped:1,pending:1,seconds:3600,minimumSeconds:5400,unknownRequirements:0});assert.equal(read('2099-01-01').items.length,0);
 const body={day:before.day,signature:before.signature,opId:'recap-first'};let calls=0;
 const saved=await generate(body,{generate:async(_system,input)=>{calls++;const context=JSON.parse(input);assert.equal(context.items.length,3);assert.ok(context.items.some(item=>item.skipReason==='身体不舒服'));return response(context.items);}});
 assert.equal(saved.mode,'model');assert.deepEqual(await generate(body,{generate:async()=>assert.fail('no second model call')}),saved);assert.equal(calls,1);assert.equal(read(before.day).recap.id,saved.id);assert.deepEqual(runs.map(run=>get(run.id,'workRun').status),['completed','review','skipped']);
 const changed=get(runs[1].id,'workRun');save('workRun',{...changed,evidence:'更新了心得'},changed.revision);assert.notEqual(read(before.day).signature,saved.signature);assert.equal(read(before.day).recap.id,saved.id);
});
test('invalid model structure, unknown runs and changed facts fail without saving; stale references are excluded',async()=>{
 const runs=fixture('2026-09-21'),note=save('note',{title:'旧资料',content:'不得泄露为当前证据'}),run=get(runs[0].id,'workRun');save('workRun',{...run,evidenceRefs:[{kind:'note',id:note.id,revision:note.revision}]},run.revision);save('note',{...note,content:'新正文'},note.revision);
 const snapshot=read('2026-09-21'),body={day:snapshot.day,signature:snapshot.signature,opId:'recap-invalid'},count=all('supervisionRecap').length;
 assert.equal(snapshot.items.find(item=>item.id===run.id).references[0].content,'');
 for(const value of ['not-json',JSON.stringify({items:[]}),JSON.stringify({items:snapshot.items.map(()=>({runId:'unknown',advice:'建议'}))}),JSON.stringify({items:snapshot.items.map(item=>({runId:item.id,advice:'建议',completed:true}))})])await assert.rejects(generate(body,{generate:async()=>value}),error=>error.status===502);
 await assert.rejects(generate({...body,opId:'recap-race'},{generate:async()=>{const current=get(runs[1].id,'workRun');save('workRun',{...current,seconds:current.seconds+30},current.revision);return response(snapshot.items);}}),/生成期间/);assert.equal(all('supervisionRecap').length,count);
 assert.throws(()=>read('2026-02-30'));await assert.rejects(generate({...body,opId:'recap-old-facts'},{generate:async()=>assert.fail('stale before model')}),/当日记录已变化/);
});
after(async()=>{db.close();await rm(root,{recursive:true,force:true});});
