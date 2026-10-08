import {createHash} from 'node:crypto';
import {z} from 'zod';
import {all,db,get,save,transaction} from '../../store.mjs';
import {bad,suggestCategories} from './accounting.mjs';
const request=z.strictObject({opId:z.string().min(8).max(100),revision:z.number().int().positive(),rows:z.array(z.strictObject({rowId:z.string().min(1).max(100),type:z.enum(['income','expense']),note:z.string().max(1000)})).min(1).max(25)});
const signature=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
function batchFor(id){const b=get(id,'accountingImport');if(!b)throw bad('导入批次不存在。',404);return b;}
export function accountingClassifications(batchId){
 const batch=batchFor(batchId),remaining=new Set(batch.rows.map(row=>row.rowId)),result=[];
 const jobs=all('accountingClassification').filter(c=>c.batchId===batchId).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)||b.id.localeCompare(a.id));
 for(const job of jobs){
  const inputs=job.inputs.filter(input=>remaining.has(input.rowId));if(!inputs.length)continue;
  const ids=new Set(inputs.map(input=>input.rowId));for(const id of ids)remaining.delete(id);
  // Running/failed latest attempts also own their rows: never resurrect an
  // older successful suggestion after a newer request changed its inputs.
  result.push({...job,inputs,suggestions:job.suggestions.filter(suggestion=>ids.has(suggestion.rowId))});
  if(!remaining.size)break;
 }
 return result;
}
export async function classifyAccountingRows(batchId,input,{complete,providerAvailable}){
 const parsed=request.safeParse(input);if(!parsed.success)throw bad('请选择1–25行有明确收支方向、备注不超过1000字的账单。');
 const body=parsed.data,hash=signature({batchId,...body}),operation='accounting-classification:'+body.opId;
 const started=transaction(()=>{
  const cached=db.prepare('SELECT result FROM operations WHERE id=?').get(operation);
  if(cached){const receipt=JSON.parse(cached.result);if(receipt.hash!==hash)throw bad('同一分类操作的内容已变化，请重新请求。',409);const job=get(receipt.id,'accountingClassification');if(!job)throw bad('分类记录不可用，请重新请求。',409);return {job,replay:true};}
  const batch=batchFor(batchId);if(batch.status!=='review'||batch.revision!==body.revision)throw bad('批次已经变化，请刷新后重新请求分类。',409);
  if(new Set(body.rows.map(r=>r.rowId)).size!==body.rows.length)throw bad('同一行不能重复请求分类。');
  for(const row of body.rows){const actual=batch.rows.find(r=>r.rowId===row.rowId);if(!actual||actual.decision!=='pending')throw bad(`行 ${row.rowId} 不在待核对范围，请刷新。`,409);}
  const job=save('accountingClassification',{batchId,batchRevision:batch.revision,status:'running',inputs:body.rows,suggestions:[],notice:'AI 正在建议分类，尚未修改账单。'});
  db.prepare('INSERT INTO operations(id,result) VALUES(?,?)').run(operation,JSON.stringify({hash,id:job.id}));return {job,replay:false};
 });
 if(started.replay)return started.job;
 const job=started.job;let result;
 try{
  const classified=await suggestCategories(body.rows.map(r=>({...r,category:''})),complete,providerAvailable);
  result={status:'ready',suggestions:classified.rows.filter(r=>r.categorySource==='AI').map(r=>({rowId:r.rowId,type:r.type,note:r.note,category:r.category})),notice:classified.notice||'分类建议已生成，请核对后应用；最终入账仍需确认。'};
 }catch{result={status:'failed',suggestions:[],notice:'AI 分类失败，原始账单和人工编辑均保留，请重试或手动选择。'};}
 return transaction(()=>{const current=get(job.id,'accountingClassification');return save('accountingClassification',{...current,...result},current.revision);});
}
export function installAccountingClassification(app,dependencies){
 app.get('/api/accounting/imports/:id/classifications',(req,res)=>res.json({classifications:accountingClassifications(req.params.id)}));
 app.post('/api/accounting/imports/:id/classify',async(req,res)=>res.json(await classifyAccountingRows(req.params.id,req.body,dependencies)));
}
