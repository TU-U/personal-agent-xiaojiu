import {api,ApiError} from './api';
export type PendingAccountingRequest={method:'POST'|'PATCH';path:string;body:Record<string,unknown>};
const storageKey='shiguang-pending-accounting';
export function pendingAccountingRequest():PendingAccountingRequest|null{try{const value=JSON.parse(sessionStorage.getItem(storageKey)||'null');return value&&['POST','PATCH'].includes(value.method)&&/^\/transactions(?:\/[a-zA-Z0-9-]+)?$/.test(value.path)&&typeof value.body?.opId==='string'?value:null;}catch{return null;}}
export async function retryAccountingRequest(){
 const request=pendingAccountingRequest();if(!request)throw new Error('没有待确认的账单操作。');
 try{const result=await api(request.path,{method:request.method,body:JSON.stringify(request.body)});sessionStorage.removeItem(storageKey);return result;}
 catch(error){if(error instanceof ApiError&&error.status>=400&&error.status<500)sessionStorage.removeItem(storageKey);throw error;}
}
export async function accountingRequest(method:'POST'|'PATCH',path:string,body:Record<string,unknown>){
 const current=pendingAccountingRequest();
 if(current){const {opId,...previous}=current.body;if(current.method!==method||current.path!==path||JSON.stringify(previous)!==JSON.stringify(body))throw new Error('上一项账单操作尚未确认，请先点击“重试未确认操作”。');}
 else{
  const opId=Array.from(crypto.getRandomValues(new Uint8Array(16)),b=>b.toString(16).padStart(2,'0')).join('');
  try{sessionStorage.setItem(storageKey,JSON.stringify({method,path,body:{...body,opId}}));}catch{throw new Error('浏览器无法保留操作编号，尚未发送，请检查存储设置后重试。');}
 }
 return retryAccountingRequest();
}
