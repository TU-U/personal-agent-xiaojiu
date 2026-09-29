import {enqueueClassification} from './classification.mjs';
import path from 'node:path';
import {z} from 'zod';
import {db,DATA_DIR,get,save,transaction} from './store.mjs';
import {fileJobs} from './file-jobs.mjs';
import {runLocalAsr,localAsrConfig} from './local-asr.mjs';
import {validateTranscript} from './transcripts.mjs';
import {validate} from './validation.mjs';
import {logAiEvent} from './ai-log.mjs';

const optionsSchema=z.strictObject({language:z.enum(['zh','en']).optional(),speakers:z.number().int().min(-1).max(20).refine(n=>n!==0).default(-1)});
const stale=()=>Object.assign(new Error('录音或记录已更新，旧转写不会覆盖当前版本。'),{status:409});
function source(job){
 const note=get(job.entity_id,'note');
 const attachment=note?.attachments?.find(a=>a.id===job.payload.attachmentId&&a.mime.startsWith('audio/'));
 if(!note||note.revision!==job.revision||!attachment||path.basename(attachment.key)!==attachment.key)throw stale();
 return {note,attachment};
}
export function enqueueAudio(note,options={}){
 const attachment=note.attachments?.find(a=>a.mime.startsWith('audio/'));
 if(!attachment)throw Object.assign(new Error('没有可转写的录音原件。'),{status:422});
 return fileJobs.enqueue({key:`asr-${note.id}-${note.revision}`,kind:'transcribe-audio',entityId:note.id,revision:note.revision,payload:{attachmentId:attachment.id,options:validate(optionsSchema,options)}});
}
export const audioHandlers={'transcribe-audio':{
 async run(job){
  const {attachment}=source(job);
  logAiEvent({stage:'asr-request',jobId:job.id,sourceId:job.entity_id,sourceRevision:job.revision,attachmentId:attachment.id,model:localAsrConfig().model,options:job.payload.options});
  try{
   const result=await runLocalAsr(path.join(DATA_DIR,'uploads',attachment.key),{...job.payload.options,
    isCurrent:()=>{const current=fileJobs.get(job.id);if(current?.state!=='running'||current.lease_token!==job.lease_token)return false;try{source(job);return true;}catch{return false;}},
    onProgress:progress=>fileJobs.progress(job.id,job.lease_token,progress)});
   logAiEvent({stage:'asr-response',jobId:job.id,result});return result;
  }catch(error){logAiEvent({stage:'asr-error',jobId:job.id,error:error.message});throw error;}
 },
 commit(job,result){
  const {note,attachment}=source(job),valid=validateTranscript(result);
  const transcript={...valid,audioAttachmentId:attachment.id,sourceRevision:job.revision,transcriptRevision:(note.transcript?.transcriptRevision||0)+1,edited:false};
  const updated=save('note',{...note,transcript,transcriptOriginal:transcript,status:valid.diarization.state==='failed'?'partial':'ready',summaryStale:note.summaryMode==='ai',notice:valid.diarization.state==='failed'?valid.diarization.error:'转写完成，请核对文字和说话人；识别结果可能有误。'},note.revision);enqueueClassification(updated);
 }
}};
export function installAudioJobs(app){
 app.get('/api/notes/:id/transcription',(req,res)=>{
  const note=get(req.params.id,'note');if(!note)throw Object.assign(new Error('记录不存在。'),{status:404});
  const row=db.prepare("SELECT id FROM background_jobs WHERE entity_id=? AND kind='transcribe-audio' ORDER BY updated_at DESC,rowid DESC LIMIT 1").get(note.id);
  const job=row?fileJobs.get(row.id):null;
  const config=localAsrConfig();res.json({note,capability:{available:config.available,diarizationAvailable:config.diarizationAvailable,model:config.model},job:job?{id:job.id,state:job.state,error:job.error,progress:job.result?.progress||null}:null});
 });
 app.post('/api/notes/:id/transcription',(req,res)=>{
  const input=validate(z.strictObject({revision:z.number().int().positive(),action:z.enum(['start','cancel']),options:optionsSchema.optional()}),req.body);
  transaction(()=>{
   const note=get(req.params.id,'note');if(!note)throw Object.assign(new Error('记录不存在。'),{status:404});if(note.revision!==input.revision)throw stale();
   const jobs=db.prepare("SELECT id FROM background_jobs WHERE entity_id=? AND kind='transcribe-audio' AND state IN ('pending','running')").all(note.id);
   if(input.action==='cancel'){for(const job of jobs)fileJobs.cancel(job.id);return;}
   if(jobs.length)throw Object.assign(new Error('已有转写正在进行，请先取消。'),{status:409});
   const next=save('note',{...note,status:'processing',notice:'录音原件已保存，等待本地转写。'},note.revision);enqueueAudio(next,input.options);
  });res.json({ok:true});
 });
 app.patch('/api/notes/:id/transcript',(req,res)=>{
  const input=validate(z.strictObject({revision:z.number().int().positive(),transcriptRevision:z.number().int().positive(),texts:z.array(z.string().min(1).max(10000).refine(s=>!!s.trim())).min(1).max(20000),speakerIds:z.array(z.string().regex(/^speaker_[1-9]\d*$/).max(40).nullable()).min(1).max(20000).optional()}),req.body);
  const result=transaction(()=>{
   const note=get(req.params.id,'note');if(!note)throw Object.assign(new Error('记录不存在。'),{status:404});
   if(note.revision!==input.revision||note.transcript?.transcriptRevision!==input.transcriptRevision)throw stale();
   if(input.texts.join('').length>100000)throw Object.assign(new Error('转写总字数超过100,000字，请缩短后保存。'),{status:422});
   if(input.texts.length!==note.transcript.segments.length||(input.speakerIds&&input.speakerIds.length!==input.texts.length))throw Object.assign(new Error('转写段数已变化，请刷新后重试。'),{status:409});
   const transcript={...note.transcript,segments:note.transcript.segments.map((s,i)=>({...s,text:input.texts[i],...(input.speakerIds?{speakerId:input.speakerIds[i]}:{})})),transcriptRevision:input.transcriptRevision+1,edited:true,speakerEdited:note.transcript.speakerEdited||!!input.speakerIds};
   return save('note',{...note,transcript,summaryStale:note.summaryMode==='ai'},note.revision);
  });res.json(result);
 });
}
export function contentForAudioSummary(note){
 if(!note.transcript)return note;
 const text=note.transcript.segments.map(s=>`[${(s.startMs/1000).toFixed(1)}-${(s.endMs/1000).toFixed(1)}秒 ${s.speakerId?s.speakerId.replace('speaker_','说话人 '):'说话人待核对'}] ${s.text}`).join('\n');
 return {...note,content:[note.content?.trim(),'以下为录音转写，识别可能有误；说话人是匿名编号，不能推断真实身份。',text].filter(Boolean).join('\n\n')};
}
