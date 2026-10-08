import {AsyncLocalStorage} from 'node:async_hooks';
const scope=new AsyncLocalStorage();
export const executionContext=()=>scope.getStore();
export const withExecutionContext=(value,fn)=>scope.run(value,fn);
export function executionSignal(signal){const current=scope.getStore()?.signal;return current&&signal?AbortSignal.any([current,signal]):current||signal;}
