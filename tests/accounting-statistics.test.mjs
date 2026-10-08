import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const dir=await mkdtemp(join(tmpdir(),'accounting-statistics-'));Object.assign(process.env,{DATA_DIR:dir,SEED_DEMO:'false',WORKER_MODE:'true'});
const {db,save,all}=await import('../server/store.mjs');
const {calculateAccountingView}=await import('../server/domain/accounting/accounting-statistics.mjs');
after(async()=>{db.close();await rm(dir,{recursive:true,force:true});});
test('confirmed ledger drives filtered sums, monthly budget and rankings with exact cents',()=>{
 for(const tx of [{type:'expense',amountCents:3550,category:'美食',note:'午饭',date:'2026-10-08'},{type:'expense',amountCents:20,category:'美食',note:'午饭',date:'2026-10-08'},{type:'expense',amountCents:10,category:'交通',note:'公交',date:'2026-10-08'},{type:'income',amountCents:500000,category:'工资',note:'工资',date:'2026-10-01'},{type:'expense',amountCents:100,category:'日用',note:'上月',date:'2026-09-30'}])save('transaction',tx);
 save('accountingImport',{status:'review',rows:[{draft:{type:'expense',amountCents:999999}}]});
 const q={period:'month',kind:'expense',category:'美食',search:'午饭',rankMonth:'2026-10',chartYear:'2026'},clock=()=>Date.parse('2026-10-08T04:00:00Z');
 const view=calculateAccountingView(all('transaction'),{amountCents:200000},q,{clock});
 assert.equal(view.filtered.length,2);assert.deepEqual(view.filteredTotals,{income:'0',expense:'3570'});assert.deepEqual(view.monthTotals,{income:'500000',expense:'3580'});assert.equal(view.budgetRemaining,'196430');assert.equal(view.monthlySpend,'3580');assert.equal(view.categories[0].value,'3570');assert.equal(view.ranking[0].amountCents,3550);assert.equal(view.monthChart[9].expense,'3580');
 const empty=calculateAccountingView(all('transaction'),{amountCents:200000},{...q,period:'custom',start:'2026-10-09',end:'2026-10-10'},{clock});assert.equal(empty.filtered.length,0);assert.equal(empty.filteredTotals.expense,'0');
 assert.throws(()=>calculateAccountingView([],{amountCents:200000},{...q,period:'custom',start:'2026-10-10',end:'2026-10-09'},{clock}),/开始日期/);
});
