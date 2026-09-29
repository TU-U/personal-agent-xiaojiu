import {enqueueClassification} from './classification.mjs';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { db, DATA_DIR, get, save, transaction } from './store.mjs';
import { createJobRepository } from './background-jobs.mjs';
import { validate } from './validation.mjs';

export const fileJobs=createJobRepository(db);
export const backgroundQueueName='shiguang-'+createHash('sha256').update(DATA_DIR).digest('hex').slice(0,20);
export const queueConnection={host:process.env.REDIS_HOST||'127.0.0.1',port:Number(process.env.REDIS_PORT||6381),maxRetriesPerRequest:null};
export function enqueueFileParse(note){
 const attachment=note.attachments?.find(a=>/\.(pdf|docx)$/i.test(a.name));
 if(!attachment)throw Object.assign(new Error('这条记录没有可解析的 PDF 或 DOCX 原件。'),{status:422});
 return fileJobs.enqueue({key:`parse-${note.id}-${note.revision}`,kind:'parse-file',entityId:note.id,revision:note.revision,payload:{attachmentId:attachment.id}});
}
const stale=()=>Object.assign(new Error('记录或附件已更新，旧解析结果未覆盖正文。请在当前版本重新解析。'),{status:409});
function currentSource(job){
 const note=get(job.entity_id,'note');if(!note||note.revision!==job.revision)throw stale();
 const attachment=note.attachments?.find(a=>a.id===job.payload.attachmentId);
 if(!attachment||path.basename(attachment.key)!==attachment.key)throw stale();
 return {note,attachment};
}
export const fileHandlers={'parse-file':{
 async run(job){
  const {attachment}=currentSource(job),location=path.join(DATA_DIR,'uploads',attachment.key);let content;
  if(/\.docx$/i.test(attachment.name)){const mammoth=await import('mammoth');content=(await mammoth.default.extractRawText({path:location})).value;}
  else if(/\.pdf$/i.test(attachment.name)){const {PDFParse}=await import('pdf-parse');const parser=new PDFParse({data:new Uint8Array(await readFile(location))});try{content=(await parser.getText({pageJoiner:''})).text;}finally{await parser.destroy();}}
  else throw new Error('不支持此原件的后台解析');
  if(typeof content!=='string')throw new Error('解析器未返回正文');
  return {content:content.slice(0,100000),originalLength:content.length,truncated:content.length>100000};
 },
 commit(job,result){
  const {note}=currentSource(job);
  const notice=result.truncated?'正文超过100,000字，当前展示前100,000字；完整原件已保留。':result.content.trim()?'原件解析完成。':'原件已保存，但未提取到正文；扫描件可先补充文字。';
  const updated=save('note',{...note,content:result.content,status:result.content.trim()?'ready':'needs_text',notice,summary:result.content.trim().slice(0,160)||notice,summaryMode:'rule',parse:{state:'completed',sourceRevision:job.revision,originalLength:result.originalLength,truncated:result.truncated}},note.revision);enqueueClassification(updated);
 }
}};
export function installFileJobs(app){
 app.get('/api/notes/:id/processing',(req,res)=>{
  const note=get(req.params.id,'note');if(!note)throw Object.assign(new Error('记录不存在或已删除。'),{status:404});
  const row=db.prepare("SELECT id FROM background_jobs WHERE entity_id=? AND kind='parse-file' ORDER BY updated_at DESC,rowid DESC LIMIT 1").get(note.id);
  const job=row?fileJobs.get(row.id):null;
  res.json({note,job:job?{id:job.id,state:job.state,attempts:job.attempts,error:job.error,sourceRevision:job.revision}:null});
 });
 app.post('/api/notes/:id/processing', (req,res)=>{
  const input=validate(z.strictObject({action:z.enum(['retry','cancel']),revision:z.number().int().positive()}),req.body);
  const note=get(req.params.id,'note');if(!note)throw Object.assign(new Error('记录不存在。'),{status:404});
  if(note.revision!==input.revision)throw stale();
  const row=db.prepare("SELECT id FROM background_jobs WHERE entity_id=? AND kind='parse-file' ORDER BY updated_at DESC,rowid DESC LIMIT 1").get(note.id);
  const job=row?fileJobs.get(row.id):null;
  transaction(()=>{
   if(input.action==='cancel'){if(job)fileJobs.cancel(job.id);}
   else if(job?.revision===note.revision&&job.state==='failed')fileJobs.retry(job.id);
   else {
    if(job&&['pending','running'].includes(job.state)&&job.revision===note.revision)return;
    if(job&&['pending','running'].includes(job.state))fileJobs.cancel(job.id);
    const next=save('note',{...note,status:'processing',notice:'原件已保存，可下载查看。'},note.revision);enqueueFileParse(next);
   }
  });
  res.json({ok:true});
 });
}
