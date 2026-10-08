import {api,ApiError} from './api';
const key='shiguang-pending-run-timer';
type Pending={path:string;body:Record<string,unknown>};
let inFlight:Promise<unknown>|null=null;
const changed=()=>window.dispatchEvent(new Event('run-timer-change'));
export function pendingRunTimerRequest():Pending|null{try{const value=JSON.parse(sessionStorage.getItem(key)||'null');return value&&/^\/work-runs\/[a-zA-Z0-9-]+\/action$/.test(value.path)&&['start','stop','adjust','evidence','confirm','snooze','skip','retry-reminder'].includes(value.body?.action)&&typeof value.body?.opId==='string'?value:null;}catch{return null;}}
export function retryRunTimerRequest():Promise<unknown>{
 if(inFlight)return inFlight;
 const pending=pendingRunTimerRequest();if(!pending)return Promise.reject(new Error('没有待确认的任务操作。'));
 inFlight=(async()=>{try{const result=await api(pending.path,{method:'POST',body:JSON.stringify(pending.body)});sessionStorage.removeItem(key);return result;}catch(error){if(error instanceof ApiError&&((error.status>=400&&error.status<500)||(pending.body.action==='evidence'&&error.status===502)))sessionStorage.removeItem(key);throw error;}finally{inFlight=null;changed();}})();return inFlight;
}
export function runTimerRequest(path:string,body:Record<string,unknown>){
 const pending=pendingRunTimerRequest();
 if(pending){const {opId,...original}=pending.body;if(pending.path!==path||JSON.stringify(original)!==JSON.stringify(body))return Promise.reject(new Error('上一项任务操作尚未收到确认，请先重试未确认的任务操作。'));}
 else{const opId=Array.from(crypto.getRandomValues(new Uint8Array(16)),n=>n.toString(16).padStart(2,'0')).join('');try{sessionStorage.setItem(key,JSON.stringify({path,body:{...body,opId}}));}catch{return Promise.reject(new Error('无法保存操作编号，尚未发送，请检查浏览器存储设置。'));}changed();}
 return retryRunTimerRequest();
}
