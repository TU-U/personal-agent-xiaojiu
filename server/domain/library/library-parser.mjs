import {fork} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const children=new Set();
process.once('exit',()=>{for(const child of children)child.kill('SIGKILL');});
const worker=fileURLToPath(new URL('../../jobs/workers/library-parse-worker.mjs',import.meta.url));
// Keep parser CPU and memory outside the API. The existing library runner serializes copies.
export function parseLibraryCopy(file,extension,{timeoutMs=120000,workerPath=worker}={}){
 return new Promise((resolve,reject)=>{
  const child=fork(workerPath,[file,extension],{execArgv:['--max-old-space-size=384'],stdio:['ignore','ignore','ignore','ipc']});
  children.add(child);
  let message,failure,settled=false;
  const finish=(error,result)=>{if(settled)return;settled=true;children.delete(child);clearTimeout(timer);error?reject(error):resolve(result);};
  const timer=setTimeout(()=>{failure=new Error('文档解析超过两分钟，副本已保留；可重试或拆分文档。');child.kill('SIGKILL');},timeoutMs);
  child.on('message',value=>{message=value;});
  child.on('error',error=>{failure=error;child.kill('SIGKILL');finish(new Error('无法启动文档解析进程：'+error.message));});
  child.on('exit',(code,signal)=>{
   if(failure)return finish(failure);
   if(code!==0)return finish(new Error('文档解析进程异常结束（'+(signal||code)+'），副本已保留，可重试。'));
   if(!message?.ok)return finish(new Error(message?.error||'解析进程没有返回结果。'));
   const result=message.result;
   if(typeof result?.content!=='string'||!result.parse?.state)return finish(new Error('解析进程返回了无效结果。'));
   finish(null,result);
  });
 });
}
