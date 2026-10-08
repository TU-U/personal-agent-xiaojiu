import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const dir=await mkdtemp(join(tmpdir(),'accounting-classification-'));process.env.DATA_DIR=dir;process.env.SEED_DEMO='false';process.env.WORKER_MODE='true';
const {db,all,get,save}=await import('../server/store.mjs');
const {classifyAccountingRows,accountingClassifications}=await import('../server/domain/accounting/accounting-classification.mjs');
after(async()=>{db.close();await rm(dir,{recursive:true,force:true});});
test('AI suggestions persist separately, replay without another model call, and invalid output remains unclassified',async()=>{
 const batch=save('accountingImport',{status:'review',rows:[{rowId:'row-1',decision:'pending'},{rowId:'row-2',decision:'pending'}]});
 const input={opId:'classification-operation',revision:batch.revision,rows:[{rowId:'row-1',type:'expense',note:'午餐'},{rowId:'row-2',type:'expense',note:'看不清'}]};
 let calls=0;const dependencies={providerAvailable:()=>true,complete:async()=>{calls++;return '[{"index":0,"category":"美食"}]';}};
 const result=await classifyAccountingRows(batch.id,input,dependencies);
 assert.equal(result.status,'ready');assert.deepEqual(result.suggestions,[{rowId:'row-1',type:'expense',note:'午餐',category:'美食'}]);assert.match(result.notice,/不完整/);
 assert.deepEqual(await classifyAccountingRows(batch.id,input,dependencies),result);assert.equal(calls,1);
 assert.deepEqual(accountingClassifications(batch.id)[0],result);assert.equal(get(batch.id,'accountingImport').revision,batch.revision);assert.equal(all('transaction').length,0);
 const invalid=await classifyAccountingRows(batch.id,{...input,opId:'classification-invalid'},{providerAvailable:()=>true,complete:async()=>'[{"index":0,"category":"工资","confirmed":true}]'});
 assert.equal(invalid.suggestions.length,0);assert.match(invalid.notice,/无效/);assert.equal(all('transaction').length,0);
});

test('latest suggestions survive more than twenty pages and newer failures suppress stale suggestions',()=>{
 const batch=save('accountingImport',{status:'review',rows:Array.from({length:25},(_,i)=>({rowId:'line-'+i,decision:'pending'}))});
 for(let i=0;i<25;i++)save('accountingClassification',{batchId:batch.id,status:'ready',createdAt:`2026-10-08T00:00:${String(i).padStart(2,'0')}Z`,inputs:[{rowId:'line-'+i,type:'expense',note:'午饭'}],suggestions:[{rowId:'line-'+i,category:'美食'}]});
 let jobs=accountingClassifications(batch.id);assert.equal(jobs.length,25);assert.ok(jobs.some(j=>j.inputs[0].rowId==='line-0'));
 save('accountingClassification',{batchId:batch.id,status:'failed',createdAt:'2026-10-08T01:00:00Z',inputs:[{rowId:'line-0',type:'expense',note:'新描述'}],suggestions:[]});
 jobs=accountingClassifications(batch.id);assert.equal(jobs.length,25);assert.equal(jobs[0].status,'failed');assert.equal(jobs[0].inputs[0].note,'新描述');assert.equal(jobs.flatMap(j=>j.suggestions).some(s=>s.rowId==='line-0'),false);
});
