import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
const dir=await mkdtemp(join(tmpdir(),'accounting-review-'));process.env.DATA_DIR=dir;process.env.SEED_DEMO='false';process.env.WORKER_MODE='true';
const {db,all,get,save}=await import('../server/store.mjs');
const {createAccountingImport}=await import('../server/domain/accounting/accounting-imports.mjs');
const {previewAccountingReview,commitAccountingReview}=await import('../server/domain/accounting/accounting-import-review.mjs');
after(async()=>{db.close();await rm(dir,{recursive:true,force:true});});
async function batch(patches=[{},{}]){
 const identity=randomUUID(),rows=patches.map((patch,i)=>({rowId:'row-'+(i+1),rowNumber:i+2,values:{merchant:identity},rawCells:['original '+i],formulas:[],draft:{type:'expense',amountCents:100,date:'2026-10-08',category:'',source:'wechat',sourceRef:'',note:identity},status:'recognized',issues:[],reason:'',duplicateCandidates:[],decision:'pending',...patch}));
 return createAccountingImport({originalname:'review.xlsx',buffer:Buffer.from('retained source bytes')},{opId:randomUUID()},{parse:async()=>({channel:'wechat',rows,duplicateGroups:[],summary:{dataRows:rows.length},notices:[]})});
}
const include=(b,index,patch={})=>{const row=b.rows[index];return {rowId:row.rowId,decision:'include',draft:{type:'expense',amountCents:100,category:'美食',date:'2026-10-08',note:row.draft.note,channel:'wechat',merchant:row.values.merchant,sourceRef:'',...patch}};};
const preview=(b,choices)=>previewAccountingReview(b.id,{opId:randomUUID(),revision:b.revision,choices});
const commitBody=(r,ack=[])=>({opId:randomUUID(),revision:r.revision,reviewId:r.reviewId,reviewToken:r.reviewToken,approved:true,duplicateAcknowledgements:ack});
test('two legitimate same-amount purchases require review and both persist; same operation replay creates nothing',async()=>{
 const b=await batch(),choices=[include(b,0),include(b,1)],r=preview(b,choices),before=all('transaction').length;
 assert.equal(r.duplicates.filter(d=>d.matches.length).length,2);assert.equal(all('transaction').length,before);
 assert.throws(()=>commitAccountingReview(b.id,commitBody(r)),/逐项确认/);
 const body=commitBody(r,['row-1','row-2']),result=commitAccountingReview(b.id,body);assert.equal(result.imported,2);assert.equal(result.remainingRows,0);
 assert.deepEqual(commitAccountingReview(b.id,body),result);assert.equal(all('transaction').length,before+2);assert.equal(get(b.id,'accountingImport').status,'completed');
 const tx=get(result.transactionIds[0],'transaction');assert.equal(tx.importBatchId,b.id);assert.equal(tx.originalSha256,b.original.sha256);assert.equal(tx.merchant,b.rows[0].values.merchant);assert.equal(tx.amountCents,100);
 assert.throws(()=>commitAccountingReview(b.id,{...body,duplicateAcknowledgements:[]}),/不同的核对/);
 assert.throws(()=>commitAccountingReview(b.id,commitBody(r,['row-1','row-2'])),/批次已变化/);
});
test('a new duplicate or edited existing candidate after preview blocks the entire commit',async()=>{
 const b=await batch([{}]),r=preview(b,[include(b,0)]),before=all('transaction').length;
 const existing=save('transaction',{type:'expense',amountCents:100,date:'2026-10-08',category:'美食',note:b.rows[0].draft.note,merchant:b.rows[0].values.merchant,source:'wechat',sourceRef:''});
 assert.throws(()=>commitAccountingReview(b.id,commitBody(r)),/重复候选已变化/);assert.equal(all('transaction').length,before+1);assert.equal(get(b.id,'accountingImport').revision,b.revision);
 const updated=preview(b,[include(b,0)]);assert.equal(updated.duplicates[0].matches[0].id,existing.id);
 save('transaction',{...existing,note:'后来修改'},existing.revision);assert.throws(()=>commitAccountingReview(b.id,commitBody(updated,['row-1'])),/重复候选已变化/);
 const final=preview(b,[include(b,0)]);assert.equal(commitAccountingReview(b.id,commitBody(final,['row-1'])).imported,1);
});
test('skips preserve originals, partial reviews retain pending rows, and exclusion overrides require an explicit correction',async()=>{
 const b=await batch([{status:'excluded',reason:'退款流水',issues:[]},{status:'needs_review',issues:['未知状态']},{}]);
 assert.throws(()=>preview(b,[include(b,0)]),/待核对提示/);
 assert.throws(()=>preview(b,[{...include(b,0),acceptWarnings:true}]),/更正原因/);
 assert.throws(()=>preview(b,[include(b,1)]),/待核对提示/);
 const r=preview(b,[{rowId:'row-1',decision:'skip',reason:'确认退款不计入'}]),result=commitAccountingReview(b.id,commitBody(r));assert.equal(result.skipped,1);assert.equal(result.remainingRows,2);
 const current=get(b.id,'accountingImport');assert.equal(current.status,'review');assert.deepEqual(current.rows[0].rawCells,b.rows[0].rawCells);assert.equal(current.rows[0].decision,'skip');
 assert.throws(()=>preview(current,[{rowId:'row-1',decision:'skip',reason:'再次跳过'}]),/已经处理/);
 const malformed=include(current,1,{category:'工资'});assert.throws(()=>preview(current,[{...malformed,acceptWarnings:true}]),/分类/);
 assert.throws(()=>preview(current,[{...include(current,1),rowId:'outside'}]),/不属于/);
});
test('a database error rolls back transactions, batch decisions, review state and receipt together',async()=>{
 const b=await batch(),r=preview(b,[include(b,0),include(b,1,{amountCents:12345})]),body=commitBody(r),before=all('transaction').length;
 db.exec("CREATE TRIGGER test_accounting_failure BEFORE INSERT ON entities WHEN NEW.kind='transaction' AND json_extract(NEW.data,'$.amountCents')=12345 BEGIN SELECT RAISE(ABORT,'synthetic write failure'); END");
 try{assert.throws(()=>commitAccountingReview(b.id,body),/synthetic write failure/);}finally{db.exec('DROP TRIGGER test_accounting_failure');}
 assert.equal(all('transaction').length,before);assert.equal(get(b.id,'accountingImport').revision,b.revision);assert.equal(get(r.reviewId,'accountingReview').status,'preview');assert.equal(db.prepare('SELECT count(*) n FROM operations WHERE id=?').get('accounting-commit:'+body.opId).n,0);
 assert.equal(commitAccountingReview(b.id,body).imported,2);
});
test('missing original and mismatched review identity cannot be bypassed by confirmation',async()=>{
 const b=await batch([{}]),other=await batch([{}]),r=preview(b,[include(b,0)]),before=all('transaction').length;
 assert.throws(()=>commitAccountingReview(other.id,commitBody(r)),/不属于当前批次/);
 await rm(join(dir,'uploads',get(b.id,'accountingImport').original.key));assert.throws(()=>commitAccountingReview(b.id,commitBody(r)),/原账单文件暂时不可用/);assert.equal(all('transaction').length,before);assert.equal(get(b.id,'accountingImport').revision,b.revision);
});

test('legacy OCR without a payment channel remains a possible duplicate, not an automatic discard',async()=>{
 const b=await batch([{}]);
 const old=save('transaction',{type:'expense',amountCents:100,date:'2026-10-08',category:'美食',note:b.rows[0].values.merchant+' · 商品',source:'ocr',sourceRef:''});
 const r=preview(b,[include(b,0)]);assert.ok(r.duplicates[0].matches.some(m=>m.id===old.id&&m.basis.includes('unverified_channel_amount_merchant')));
 assert.throws(()=>commitAccountingReview(b.id,commitBody(r)),/逐项确认/);assert.equal(commitAccountingReview(b.id,commitBody(r,['row-1'])).imported,1);
});
test('an explicit correction can override a mistaken exclusion while preserving original evidence and reason',async()=>{
 const b=await batch([{status:'excluded',reason:'误识别为花呗消费'}]);
 const r=preview(b,[{...include(b,0,{category:'花呗',note:'核对原件为花呗还款'}),acceptWarnings:true,exclusionOverride:'原件明确为还款，修正识别'}]);
 const result=commitAccountingReview(b.id,commitBody(r));assert.equal(result.imported,1);
 const row=get(b.id,'accountingImport').rows[0];assert.equal(row.decisionReason,'原件明确为还款，修正识别');assert.equal(row.reason,'误识别为花呗消费');assert.deepEqual(row.rawCells,b.rows[0].rawCells);assert.equal(row.status,'excluded');assert.equal(row.decision,'include');
});
