import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {existsSync} from 'node:fs';
import {execFile} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {localAsrConfig} from './local-asr.mjs';
import {logAiEvent} from '../core/ai-log.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const fail=message=>Object.assign(new Error(message),{status:503});
export function localAudioCapability(id){
 let config;
 try{config=localAsrConfig(id==='diarization'?{model:'large-v3-turbo'}:{});}
 catch{return {available:false,model:'',configError:'ASR_MODEL配置无效，请选择small或large-v3-turbo。'};}
 return {model:id==='asr'?config.model:'sherpa-onnx/pyannote+3d-speaker',python:config.python,asrModel:config.model,available:existsSync(config.python)&&(id==='asr'?config.available:config.diarizationAvailable),sampleAvailable:existsSync(path.join(root,'.local-runtime/asr-models/1-two-speakers-en.wav'))};
}
function executeLocal(python,args){return new Promise((resolve,reject)=>{
 const child=execFile(python,args,{cwd:root,timeout:90000,killSignal:'SIGKILL',maxBuffer:65536,env:{...process.env,HF_HUB_OFFLINE:'1',HF_HUB_DISABLE_TELEMETRY:'1'}},(error,stdout)=>{process.removeListener('exit',stop);if(error)reject(fail(error.killed?'本地语音测试超时，请检查资源占用后重试。':'本地语音测试进程失败，请检查本地依赖和模型文件。'));else resolve(stdout);});
 const stop=()=>child.kill('SIGKILL');process.once('exit',stop);
});}
export async function probeLocalAudio(id,{config=localAudioCapability(id),execute=executeLocal}={}){
 if(!['asr','diarization'].includes(id))throw fail('语音能力类型无效。');
 if(!config.available)throw fail('本地语音依赖或模型文件未准备好。');
 if(!config.sampleAvailable)throw fail('缺少本地公开测试音频，请按 scripts/asr/README.md 准备样本；不会使用私人录音代替。');
 const callId=randomUUID();logAiEvent({stage:'audio-capability-request',callId,capability:id,model:config.model,sample:'public-english-first-15-seconds'});
 try{
  const output=await execute(config.python,[path.join(root,'scripts/asr/capability.py'),id,'--model',config.asrModel]);
  let parsed;try{parsed=JSON.parse(output);}catch{throw fail('本地语音测试未返回有效结果。');}
  if(!parsed?.ok)throw fail('本地语音推理未成功，请检查依赖、模型和测试音频。');
  const detail=id==='asr'?z.strictObject({response:z.string().trim().min(1).max(300),notice:z.string().max(500)}).parse(parsed.detail):z.strictObject({segments:z.number().int().positive(),speakers:z.number().int().positive(),notice:z.string().max(500)}).parse(parsed.detail);
  logAiEvent({stage:'audio-capability-response',callId,capability:id,detail});return {callId,...detail};
 }catch(error){const safe=error.status?error:fail('本地语音测试结果结构无效。');logAiEvent({stage:'audio-capability-error',callId,capability:id,error:safe.message});throw safe;}
}
