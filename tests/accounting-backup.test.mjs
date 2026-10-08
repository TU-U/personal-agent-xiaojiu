import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
const root=await mkdtemp(join(tmpdir(),'accounting-backup-')),dataDir=join(root,'data');Object.assign(process.env,{DATA_DIR:dataDir,SEED_DEMO:'false',WORKER_MODE:'true'});
const {db,get,save}=await import('../server/store.mjs');
const {createAccountingImport}=await import('../server/domain/accounting/accounting-imports.mjs');
const {previewAccountingReview,commitAccountingReview}=await import('../server/domain/accounting/accounting-import-review.mjs');
const {createBackup,restoreBackup}=await import('../server/core/backups/backups.mjs');
after(async()=>{db.close();await rm(root,{recursive:true,force:true});});
test('backup restores original, partial review, transaction and operation receipt; missing accounting original is rejected',async()=>{
 const bytes=Buffer.from('original worksheet');
 const rows=[1,2].map(i=>({rowId:'row-'+i,rowNumber:i,decision:'pending',issues:[],status:'recognized',duplicateCandidates:[],values:{merchant:'店铺'+i},draft:{type:'expense',amountCents:i*100,category:'',date:'2026-10-08',source:'wechat',sourceRef:'trade-'+i,note:'午饭'}}));
 const batch=await createAccountingImport({originalname:'bill.xlsx',buffer:bytes},{opId:'backup-upload'},{parse:async()=>({rows,duplicateGroups:[],notices:[]})});
 const review=previewAccountingReview(batch.id,{opId:'backup-review',revision:batch.revision,choices:[{rowId:'row-1',decision:'include',draft:{type:'expense',amount:'1',category:'美食',date:'2026-10-08',note:'午饭',channel:'wechat',merchant:'店铺1',sourceRef:'trade-1'}}]});
 const committed=commitAccountingReview(batch.id,{opId:'backup-commit',revision:review.revision,reviewId:review.reviewId,reviewToken:review.reviewToken,approved:true,duplicateAcknowledgements:[]});
 save('accountingCheck',{day:'2026-10-01',status:'completed'});save('accountingBudget',{amountCents:200000});
 const directory=join(root,'backup'),destination=join(root,'restored');await createBackup({dataDir,destination:directory});await restoreBackup({directory,destination});
 const restored=new DatabaseSync(join(destination,'shiguang.sqlite'),{readOnly:true});
 try{
  const entity=id=>JSON.parse(restored.prepare('SELECT data FROM entities WHERE id=?').get(id).data);
  const b=entity(batch.id),tx=entity(committed.transactionIds[0]);assert.equal(b.status,'review');assert.equal(b.rows[1].decision,'pending');assert.equal(b.rows[0].transactionId,tx.id);assert.equal(tx.importBatchId,b.id);assert.equal(tx.amountCents,100);
  assert.deepEqual(await readFile(join(destination,'uploads',b.original.key)),bytes);
  assert.equal(restored.prepare('SELECT result FROM operations WHERE id=?').get('accounting-commit:backup-commit').result,db.prepare('SELECT result FROM operations WHERE id=?').get('accounting-commit:backup-commit').result);
  assert.equal(restored.prepare("SELECT COUNT(*) n FROM entities WHERE kind='accountingCheck'").get().n,1);
 }finally{restored.close();}
 const original=get(batch.id,'accountingImport').original;await rm(join(dataDir,'uploads',original.key));
 await assert.rejects(createBackup({dataDir,destination:join(root,'missing')}),/缺少账单原件/);
});
