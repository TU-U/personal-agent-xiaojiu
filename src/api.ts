import {API_BASE} from '../contracts/generated/routes.mjs';
export {API_BASE};
export const apiUrl=(url:string)=>API_BASE+url;
export class ApiError extends Error {status:number;current:unknown;constructor(message:string,status:number,current?:unknown){super(message);this.status=status;this.current=current;}}
export async function api<T>(url:string,options:RequestInit={}):Promise<T>{
 let response:Response;
 try{response=await fetch(apiUrl(url),{signal:AbortSignal.timeout(110000),...options,headers:{...(options.body instanceof FormData?{}:{'Content-Type':'application/json'}),...options.headers}});}catch{throw new ApiError('连接暂时中断，你的输入还在。请检查网络后重试。',0);}
 const data=await response.json().catch(()=>({error:'服务器响应异常，请稍后重试。'}));
 if(!response.ok){if(response.status===401&&!url.startsWith('/login'))window.dispatchEvent(new Event('session-expired'));throw new ApiError(data.error||'请求未完成，请重试。',response.status,data.current);}
 if(options.method&&!['GET','HEAD'].includes(options.method.toUpperCase())&&!['/pet/chat','/login','/logout'].includes(url))window.dispatchEvent(new Event('business-changed'));
 return data as T;
}
export const post=<T>(url:string,body:unknown)=>api<T>(url,{method:'POST',body:JSON.stringify(body)});
export const patch=<T>(url:string,body:unknown)=>api<T>(url,{method:'PATCH',body:JSON.stringify(body)});
export const del=(url:string,revision:number)=>api(url,{method:'DELETE',body:JSON.stringify({revision})});
export const readableDate=(date:string,full=false)=>new Date(date).toLocaleDateString('zh-CN',full?{year:'numeric',month:'long',day:'numeric'}:{month:'long',day:'numeric'});
export const fileUrl=(id:string,a:string)=>apiUrl(`/notes/${encodeURIComponent(id)}/file/${encodeURIComponent(a)}`);
export function downloadText(text:string,name:string,type='text/markdown;charset=utf-8'){const url=URL.createObjectURL(new Blob([text],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
