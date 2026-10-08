import {createHash} from 'node:crypto';
import {z} from 'zod';
import {db,all,get,save,transaction} from '../../store.mjs';
import {bad,validateTransaction} from './accounting.mjs';
import {accountingImportView,assertAccountingOriginal} from './accounting-imports.mjs';
const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value;
const hash=value=>createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
const key=z.string().min(1).max(100),op=key.min(8);
const draft=z.strictObject({type:z.enum(['income','expense']),amount:z.union([z.string(),z.number()]).optional(),amountCents:z.number().optional(),category:z.string(),date:z.string(),note:z.string().max(1000),channel:z.enum(['wechat','alipay','ocr','manual']),merchant:z.string().max(300),sourceRef:z.string().max(160)});
const choice=z.discriminatedUnion('decision',[
 z.strictObject({rowId:key,decision:z.literal('include'),draft,acceptWarnings:z.boolean().default(false),exclusionOverride:z.string().trim().min(1).max(1000).optional()}),
 z.strictObject({rowId:key,decision:z.literal('skip'),reason:z.string().trim().min(1).max(1000)}),
]);
const previewSchema=z.strictObject({opId:op,revision:z.number().int().positive(),choices:z.array(choice).min(1).max(200)});
const commitSchema=z.strictObject({opId:op,revision:z.number().int().positive(),reviewId:key,reviewToken:z.string().regex(/^[a-f0-9]{64}$/),approved:z.literal(true),duplicateAcknowledgements:z.array(key).max(200)});
function checked(schema,input){const result=schema.safeParse(input);if(!result.success)throw bad('核对提交格式无效，请检查行号、决定、账单字段与版本。');return result.data;}
function batchAt(id,revision){const batch=get(id,'accountingImport');if(!batch)throw bad('导入批次不存在。',404);if(batch.revision!==revision)throw bad('批次已变化，请刷新后重新核对；本次尚未入账。',409);if(batch.status!=='review')throw bad('批次尚未解析完成或已经完成核对。',409);return batch;}
function receipt(key,signature){const stored=db.prepare('SELECT result FROM operations WHERE id=?').get(key);if(!stored)return null;const result=JSON.parse(stored.result);if(result.signature!==signature)throw bad('操作编号已用于不同的核对内容。',409);return result.value;}
function writeReceipt(key,signature,value){db.prepare('INSERT INTO operations(id,result) VALUES(?,?)').run(key,JSON.stringify({signature,value}));return value;}
function normalize(batch,choices){
 if(new Set(choices.map(c=>c.rowId)).size!==choices.length)throw bad('同一行不能重复提交决定。');
 return choices.map(c=>{
  const row=batch.rows.find(r=>r.rowId===c.rowId);if(!row)throw bad(`行 ${c.rowId} 不属于当前批次。`);
  if(row.decision!=='pending')throw bad(`第${row.rowNumber}行已经处理，请刷新。`,409);
  if(c.decision==='skip')return c;
  if((row.issues.length||row.status==='excluded')&&!c.acceptWarnings)throw bad(`第${row.rowNumber}行有待核对提示，请明确确认后再入账。`);
  if(row.status==='excluded'&&!c.exclusionOverride)throw bad(`第${row.rowNumber}行建议排除；只有识别错误时说明更正原因，才能改为入账。`);
  let tx;try{const {channel,merchant,...fields}=c.draft;tx=validateTransaction({...fields,source:channel});}catch(error){throw bad(`第${row.rowNumber}行：${error.message}`,error.status||400);}
  return {...c,draft:{type:tx.type,amountCents:tx.amountCents,category:tx.category,date:tx.date,note:tx.note,channel:tx.source,sourceRef:tx.sourceRef,merchant:c.draft.merchant.trim()}};
 }).sort((a,b)=>a.rowId.localeCompare(b.rowId));
}
const merchant=value=>String(value||'').trim().toLocaleLowerCase();
function reasons(a,b){
 const found=[],sameChannel=a.channel===b.channel;
 if(!sameChannel&&['wechat','alipay'].includes(a.channel)&&['wechat','alipay'].includes(b.channel))return found;
 if(a.sourceRef&&a.sourceRef===b.sourceRef)found.push(sameChannel?'same_channel_trade_id':'unverified_channel_trade_id');
 if(a.type===b.type&&a.date===b.date&&a.amountCents===b.amountCents&&merchant(a.merchant)&&merchant(a.merchant)===merchant(b.merchant))found.push(sameChannel?'same_day_amount_merchant':'unverified_channel_amount_merchant');
 return found;
}
function duplicateSnapshot(batch,choices){
 const transactions=all('transaction'),selected=new Map(choices.map(c=>[c.rowId,c]));
 return choices.filter(c=>c.decision==='include').map(c=>{
  const matches=[];
  for(const tx of transactions){const basis=reasons(c.draft,{...tx,channel:tx.source||'manual',merchant:tx.merchant||tx.note?.split(' · ')[0]||''});if(basis.length)matches.push({kind:'transaction',id:tx.id,revision:tx.revision,type:tx.type,date:tx.date,amountCents:tx.amountCents,note:tx.note,basis});}
  for(const row of batch.rows){if(row.rowId===c.rowId)continue;const other=selected.get(row.rowId),candidate=other?.decision==='include'?other.draft:{...row.draft,channel:row.draft.source,merchant:row.values.merchant};const basis=reasons(c.draft,candidate);if(basis.length)matches.push({kind:'importRow',id:row.rowId,rowNumber:row.rowNumber,sheetName:row.sheetName,decision:other?.decision||row.decision,basis});}
  matches.sort((a,b)=>(a.kind+':'+a.id).localeCompare(b.kind+':'+b.id));return {rowId:c.rowId,matches};
 });
}
export function previewAccountingReview(batchId,input){
 const body=checked(previewSchema,input),signature=hash({batchId,body}),operation='accounting-review:'+body.opId;
 return transaction(()=>{
  const previous=receipt(operation,signature);if(previous)return previous;
  const batch=batchAt(batchId,body.revision),choices=normalize(batch,body.choices),duplicates=duplicateSnapshot(batch,choices),reviewToken=hash({batchId,revision:batch.revision,choices,duplicates});
  const review=save('accountingReview',{batchId,batchRevision:batch.revision,choices,duplicates,reviewToken,status:'preview'});
  return writeReceipt(operation,signature,{reviewId:review.id,revision:batch.revision,reviewToken,choices,duplicates});
 });
}
export function commitAccountingReview(batchId,input){
 const body=checked(commitSchema,input),signature=hash({batchId,body}),operation='accounting-commit:'+body.opId;
 return transaction(()=>{
  const previous=receipt(operation,signature);if(previous)return previous;
  const batch=batchAt(batchId,body.revision),review=get(body.reviewId,'accountingReview');
  if(!review||review.batchId!==batchId||review.batchRevision!==batch.revision||review.status!=='preview'||review.reviewToken!==body.reviewToken)throw bad('核对结果不属于当前批次或已变化，请重新核对。',409);
  const choices=normalize(batch,review.choices),duplicates=duplicateSnapshot(batch,choices);
  if(hash({batchId,revision:batch.revision,choices,duplicates})!==body.reviewToken)throw bad('账本或重复候选已变化，请重新查看重复项后再提交；尚未入账。',409);
  const required=duplicates.filter(d=>d.matches.length).map(d=>d.rowId).sort(),ack=[...body.duplicateAcknowledgements].sort();
  if(new Set(ack).size!==ack.length||JSON.stringify(ack)!==JSON.stringify(required))throw bad('请逐项确认疑似重复的保留决定；不会自动跳过这些账单。',409);
  assertAccountingOriginal(batchId);
  const decisions=new Map(),transactionIds=[],confirmedAt=new Date().toISOString();
  for(const c of choices){
   let transactionId=null;
   if(c.decision==='include'){
    const {channel,merchant,...fields}=c.draft;
    const tx=save('transaction',{...validateTransaction({...fields,source:channel}),merchant,importBatchId:batchId,importRowId:c.rowId,originalSha256:batch.original.sha256,confirmedAt,reviewId:review.id});transactionId=tx.id;transactionIds.push(tx.id);
   }
   decisions.set(c.rowId,{decision:c.decision,transactionId,confirmedAt,reviewId:review.id,reviewedDraft:c.decision==='include'?c.draft:null,decisionReason:c.decision==='skip'?c.reason:c.exclusionOverride||'',duplicateAcknowledged:ack.includes(c.rowId)});
  }
  const rows=batch.rows.map(row=>decisions.has(row.rowId)?{...row,...decisions.get(row.rowId)}:row),pending=rows.filter(row=>row.decision==='pending').length;
  const updated=save('accountingImport',{...batch,rows,status:pending||batch.notices?.length?'review':'completed',remainingRows:pending,notice:pending?`已保存本次决定，仍有${pending}行待核对。`:batch.notices?.length?'本工作表已核对，其他工作表仍未处理。':'全部行已核对，确认入账的交易已保存。'},batch.revision);
  save('accountingReview',{...review,status:'committed',confirmedAt,transactionIds},review.revision);
  return writeReceipt(operation,signature,{batchId,revision:updated.revision,imported:transactionIds.length,skipped:choices.length-transactionIds.length,remainingRows:pending,transactionIds});
 });
}
export function installAccountingReview(app){
 app.post('/api/accounting/imports/:id/review',(req,res)=>res.json(previewAccountingReview(req.params.id,req.body)));
 app.post('/api/accounting/imports/:id/commit',(req,res)=>res.json(commitAccountingReview(req.params.id,req.body)));
 app.get('/api/accounting/imports/:id/reviews', (req,res)=>{accountingImportView(req.params.id,{limit:1});res.json({reviews:all('accountingReview').filter(r=>r.batchId===req.params.id)});});
}
