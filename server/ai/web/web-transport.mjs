export const webFailure=(message,code,status=502)=>Object.assign(new Error(message),{code,status});
export function webSignal(signal,timeoutMs=15000){
 if(!Number.isInteger(timeoutMs)||timeoutMs<1||timeoutMs>300000)throw webFailure('联网超时参数无效。','WEB_INPUT',400);
 signal?.throwIfAborted();return signal?AbortSignal.any([signal,AbortSignal.timeout(timeoutMs)]):AbortSignal.timeout(timeoutMs);
}
export async function abortable(promise,signal){
 signal.throwIfAborted();let abort;
 try{return await Promise.race([promise,new Promise((_,reject)=>{abort=()=>reject(signal.reason);signal.addEventListener('abort',abort,{once:true});})]);}
 finally{signal.removeEventListener('abort',abort);}
}
export async function readWebBody(response,signal,maxBytes=2*1024*1024){
 const reader=response.body?.getReader();if(!reader)throw webFailure('网页没有可读取的响应正文。','WEB_RESPONSE');
 const chunks=[];let length=0;
 try{while(true){signal.throwIfAborted();const {done,value}=await abortable(reader.read(),signal);if(done)break;length+=value.length;if(length>maxBytes)throw webFailure('网页超过 2 MB，请换一个具体页面。','WEB_SIZE',422);chunks.push(Buffer.from(value));}signal.throwIfAborted();return Buffer.concat(chunks).toString('utf8');}
 finally{await reader.cancel().catch(()=>{});reader.releaseLock?.();}
}
