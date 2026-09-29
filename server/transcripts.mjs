import {z} from 'zod';
import {validate} from './validation.mjs';

const segment=z.strictObject({
 startMs:z.number().int().nonnegative(),endMs:z.number().int().positive(),
 speakerId:z.string().regex(/^speaker_[1-9]\d*$/).nullable(),text:z.string().min(1).max(10000),
});
export const transcriptResultSchema=z.strictObject({
 durationMs:z.number().int().positive().max(24*60*60*1000),
 language:z.string().min(2).max(16),
 segments:z.array(segment).min(1).max(20000),
 diarization:z.strictObject({state:z.enum(['completed','failed']),error:z.string().min(1).max(1000).optional()}),
 model:z.string().min(1).max(200),
}).superRefine((result,ctx)=>{
 let previous=-1;
 for(const [index,item] of result.segments.entries()){
  if(item.startMs>=item.endMs||item.endMs>result.durationMs||item.startMs<previous)
   ctx.addIssue({code:'custom',path:['segments',index],message:'转写时间段必须递增且位于录音时长内。'});
  if(result.diarization.state==='failed'&&item.speakerId!==null)
   ctx.addIssue({code:'custom',path:['segments',index,'speakerId'],message:'分离失败时不能伪造说话人。'});
  previous=item.startMs;
 }
 if(result.diarization.state==='failed'&&!result.diarization.error)
  ctx.addIssue({code:'custom',path:['diarization','error'],message:'说话人分离失败必须说明原因。'});
 if(result.diarization.state==='completed'&&result.diarization.error)
  ctx.addIssue({code:'custom',path:['diarization','error'],message:'完成状态不能携带失败原因。'});
});
export function validateTranscript(result){return validate(transcriptResultSchema,result);}
export function transcriptText(result){return result.segments.map(s=>s.text).join('\n');}
