import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const root=await mkdtemp(join(tmpdir(),'accounting-save-'));Object.assign(process.env,{DATA_DIR:root,SEED_DEMO:'false',WORKER_MODE:'true'});
const {db,all,get,remove}=await import('../server/store.mjs');
const {saveAccountingTransaction:save}=await import('../server/domain/accounting/accounting-transactions.mjs');
after(async()=>{db.close();await rm(root,{recursive:true,force:true});});
test('manual create and edit retry the same receipt, without business deduplication or deleted-row resurrection',()=>{
 const body={type:'expense',amount:'35.50',category:'美食',date:'2026-10-08',note:'午饭',opId:'manual-create'};
 const first=save(null,body);assert.deepEqual(save(null,body),first);assert.equal(all('transaction').length,1);
 assert.throws(()=>save(null,{...body,amount:'40'}),/其他账单内容/);
 const second=save(null,{...body,opId:'separate-create'});assert.notEqual(second.id,first.id);
 const edit={amount:'40',revision:first.revision,opId:'manual-edit'};
 const updated=save(first.id,edit);assert.equal(updated.amountCents,4000);assert.deepEqual(save(first.id,edit),updated);assert.equal(get(first.id,'transaction').revision,2);
 assert.throws(()=>save(first.id,{...edit,opId:'stale-new-edit'}),/已更新/);
 remove(first.id,'transaction',updated.revision);assert.throws(()=>save(null,body),/已删除/);assert.equal(all('transaction').length,1);
});
