import {AsyncLocalStorage} from 'node:async_hooks';
const contexts=new AsyncLocalStorage();
// Context is diagnostic metadata only; never use it for authorization or retrieval.
const fields=new Set(['requestId','method','endpoint','jobId','jobKind','entityId','revision','attempt','threadId','taskId','sourceId']);
function clean(value){return Object.fromEntries(Object.entries(value||{}).filter(([key,item])=>fields.has(key)&&((typeof item==='string'&&item.length<=500)||(Number.isSafeInteger(item)&&item>=0))));}
export function aiContext(){return {...contexts.getStore()};}
export function withAiContext(context,work){return contexts.run({...aiContext(),...clean(context)},work);}
export function updateAiContext(context){const current=contexts.getStore();if(current)Object.assign(current,clean(context));}
