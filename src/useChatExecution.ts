import {useEffect,useRef,useState} from 'react';
import {contractGet,contractPatch} from './api';
import type {components} from '../contracts/generated/types';
export type ChatRun=components['schemas']['ChatRun'];
export function useChatPolicy(threadId:string|null,ensureThread:()=>Promise<string>){
 const [policy,setPolicy]=useState({threadId,webSearch:false,revision:0}),[loading,setLoading]=useState(false),[saving,setSaving]=useState(false),[error,setError]=useState(''),[refresh,setRefresh]=useState(0);
 const current=useRef(threadId);current.current=threadId;
 useEffect(()=>{let valid=true;setError('');setLoading(!!threadId);setPolicy({threadId,webSearch:false,revision:0});if(threadId)void contractGet('getThreadsByIdWebPolicy',`/threads/${threadId}/web-policy`).then(value=>{if(valid)setPolicy({threadId,...value});}).catch(e=>{if(valid)setError(e.message);}).finally(()=>{if(valid)setLoading(false);});return()=>{valid=false;};},[threadId,refresh]);
 async function change(webSearch:boolean){if(saving||loading)return;setSaving(true);setError('');try{const id=await ensureThread();const latest=await contractGet('getThreadsByIdWebPolicy',`/threads/${id}/web-policy`);const next=await contractPatch('patchThreadsByIdWebPolicy',`/threads/${id}/web-policy`,{revision:latest.revision,webSearch});if(current.current===id){setPolicy({threadId:id,...next});setRefresh(v=>v+1);}}catch(e){setError((e as Error).message);}finally{setSaving(false);}}
 return {webSearch:policy.threadId===threadId&&policy.webSearch,loading,saving,error,change};
}
export function useChatProgress(id:string|null,busy:boolean){
 const [run,setRun]=useState<ChatRun|null>(null),[error,setError]=useState('');
 useEffect(()=>{setRun(null);setError('');if(!id||!busy)return;let valid=true,timer:ReturnType<typeof setTimeout>;const poll=async()=>{try{const value=await contractGet('getChatRunsById','/chat-runs/'+encodeURIComponent(id));if(valid){setRun(value);setError('');}}catch(e){if(valid&&!String((e as Error).message).includes('不存在'))setError('进度暂时无法读取，回答仍在处理中。');}finally{if(valid)timer=setTimeout(()=>void poll(),1500);}};void poll();return()=>{valid=false;clearTimeout(timer);};},[id,busy]);
 return {run,error};
}
