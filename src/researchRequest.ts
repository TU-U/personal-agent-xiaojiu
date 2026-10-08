import {api,ApiError} from './api';
const key='shiguang-pending-research';
type Pending={path:string;body:Record<string,unknown>};
let inFlight:Promise<{id:string}>|null=null;
export function pendingResearch():Pending|null{try{const value=JSON.parse(sessionStorage.getItem(key)||'null');return value&&(value.path==='/research-tasks'||/^\/research-tasks\/[a-zA-Z0-9-]+\/action$/.test(value.path))&&typeof value.body?.opId==='string'?value:null;}catch{return null;}}
export function retryResearch(){
 if(inFlight)return inFlight;const pending=pendingResearch();if(!pending)return Promise.reject(new Error('没有待恢复的调研操作。'));
 inFlight=(async()=>{try{const result=await api<{id:string}>(pending.path,{method:'POST',body:JSON.stringify(pending.body)});sessionStorage.removeItem(key);return result;}catch(error){if(error instanceof ApiError&&error.status>=400&&error.status<500)sessionStorage.removeItem(key);throw error;}finally{inFlight=null;window.dispatchEvent(new Event('research-request-change'));}})();return inFlight;
}
export function researchRequest(path:string,body:Record<string,unknown>){
 if(pendingResearch())return Promise.reject(new Error('上一项调研操作尚未收到确认，请先恢复该操作。'));
 const opId=Array.from(crypto.getRandomValues(new Uint8Array(16)),n=>n.toString(16).padStart(2,'0')).join('');
 try{sessionStorage.setItem(key,JSON.stringify({path,body:{...body,opId}}));}catch{return Promise.reject(new Error('浏览器无法保存操作编号，尚未提交。'));}
 window.dispatchEvent(new Event('research-request-change'));return retryResearch();
}
