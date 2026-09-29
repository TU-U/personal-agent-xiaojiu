import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {existsSync} from 'node:fs';
import {spawn} from 'node:child_process';
import {z} from 'zod';
import {validateTranscript} from './transcripts.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export function localAsrConfig(){
 const model=process.env.ASR_MODEL||'large-v3-turbo';
 if(!['small','large-v3-turbo'].includes(model))throw new Error('本地语音模型配置无效。');
 const python=process.env.ASR_PYTHON||path.join(root,'.local-runtime/asr-venv/bin/python');
 const modelRoot=path.join(root,'.local-runtime/asr-models');
 return {model,python,available:existsSync(python)&&['vocabulary.json','vocabulary.txt'].some(f=>existsSync(path.join(modelRoot,'whisper-'+model,f)))&&['model.bin','config.json','tokenizer.json'].every(f=>existsSync(path.join(modelRoot,'whisper-'+model,f))),diarizationAvailable:['segmentation.onnx','speaker.onnx'].every(f=>existsSync(path.join(modelRoot,f)))};
}
const progressSchema=z.object({stage:z.enum(['decoding','transcribing','diarizing']),durationMs:z.number().int().positive().optional(),processedMs:z.number().int().nonnegative().optional()});

export function runLocalAsr(filename,{language,speakers=-1,onProgress=()=>{},isCurrent=()=>true,timeoutMs=15*60*1000}={}){
 const config=localAsrConfig();
 if(!config.available)throw Object.assign(new Error('本地语音模型尚未准备好，原件已保留。'),{status:503});
 if(language!==undefined&&!['zh','en'].includes(language))throw new Error('转写语言无效。');
 if(!Number.isInteger(speakers)||(speakers!==-1&&(speakers<1||speakers>20)))throw new Error('说话人数无效。');
 return new Promise((resolve,reject)=>{
  const args=[path.join(root,'scripts/asr/transcribe.py'),filename,'--model',config.model,'--speakers',String(speakers)];
  if(language)args.push('--language',language);
  const child=spawn(config.python,args,{cwd:root,env:{...process.env,ASR_PARENT_GUARD:'1',HF_HUB_OFFLINE:'1',HF_HUB_DISABLE_TELEMETRY:'1'},stdio:['ignore','pipe','pipe']});
  let buffer='',bytes=0,result,problem,closed=false,hardKill;
  const abort=error=>{if(problem)return;problem=error;child.kill('SIGTERM');hardKill=setTimeout(()=>child.kill('SIGKILL'),1000);hardKill.unref();};
  const timeout=setTimeout(()=>abort(new Error('本地转写超时，原件保留，可拆分后重试。')),timeoutMs);
  const monitor=setInterval(()=>{try{if(!isCurrent())abort(new Error('转写已取消或来源已更新，旧结果未保存。'));}catch(error){abort(error);}},500);
  const parentExit=()=>child.kill('SIGTERM');process.once('exit',parentExit);
  const cleanup=()=>{closed=true;clearTimeout(timeout);clearTimeout(hardKill);clearInterval(monitor);process.removeListener('exit',parentExit);};
  const line=value=>{
   if(!value.trim())return;
   const message=JSON.parse(value);
   if(message.stage==='completed'){
    if(result)throw new Error('转写进程返回了重复结果。');
    result=validateTranscript(message.result);
   }else if(message.stage==='failed')abort(new Error(typeof message.error==='string'?message.error.slice(0,500):'本地转写失败。'));
   else onProgress(progressSchema.parse(message));
  };
  child.stdout.setEncoding('utf8');
  child.stdout.on('data',chunk=>{if(problem||closed)return;bytes+=Buffer.byteLength(chunk);if(bytes>8*1024*1024)return abort(new Error('转写输出过大，请拆分录音。'));buffer+=chunk.toString('utf8');let end;try{while((end=buffer.indexOf('\n'))>=0){line(buffer.slice(0,end));buffer=buffer.slice(end+1);}}catch(error){abort(error);}});
  // Drain diagnostics. Protocol failures are surfaced through structured stdout.
  child.stderr.resume();
  child.once('error',error=>{problem=error;cleanup();reject(new Error('本地语音进程无法启动。'));});
  child.once('close',code=>{if(closed)return;try{if(buffer.trim()&&!problem)line(buffer);if(!problem&&!isCurrent())problem=new Error('来源已更新，旧转写结果未保存。');}catch(error){problem=error;}cleanup();if(problem)reject(problem);else if(code!==0||!result)reject(new Error('本地语音进程未返回完整结果，原件仍保留。'));else resolve(result);});
 });
}
