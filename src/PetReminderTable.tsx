import {useCallback,useEffect,useRef,useState} from 'react';
import {api} from './api';

export type PetReminder={id:string;sourceKind:string;sourceId:string;sourceRevision:number;occurrenceKey:string;title:string;message:string;count:number;dueAt:string|null;actionTarget:{page:string;id:string;threadId?:string;runId?:string;history?:boolean;day?:string;occurrenceId?:string}};
type Snapshot={snapshot:string;cursor:number;total:number;items:PetReminder[]};
export function usePetReminders(cursor:number){
 const [data,setData]=useState<Snapshot|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(true);
 const epoch=useRef(0),controller=useRef<AbortController|null>(null),inFlight=useRef(false);
 const refresh=useCallback(async(invalidate=false)=>{
  if(!invalidate&&inFlight.current)return;
  inFlight.current=true;
  const version=++epoch.current;controller.current?.abort();controller.current=new AbortController();
  if(invalidate)setData(null);setLoading(true);
  try{const result=await api<Snapshot>('/pet/reminders',{signal:AbortSignal.any([controller.current.signal,AbortSignal.timeout(15000)])});if(version!==epoch.current)return;setData(result);setError('');}
  catch(cause){if(version===epoch.current)setError((cause as Error).message);}
  finally{if(version===epoch.current){inFlight.current=false;setLoading(false);}}
 },[]);
 useEffect(()=>{void refresh(true);},[cursor,refresh]);
 useEffect(()=>{
  const changed=()=>void refresh(true),visible=()=>{if(!document.hidden)void refresh();};
  const timer=window.setInterval(visible,10000);
  window.addEventListener('business-changed',changed);window.addEventListener('focus',visible);document.addEventListener('visibilitychange',visible);
  return()=>{++epoch.current;controller.current?.abort();clearInterval(timer);window.removeEventListener('business-changed',changed);window.removeEventListener('focus',visible);document.removeEventListener('visibilitychange',visible);};
 },[refresh]);
 return {data,error,loading,refresh};
}
export type PetSourceTarget=Pick<PetReminder,'sourceKind'|'sourceId'|'actionTarget'>;
export function openPetSource(item:PetSourceTarget){
 if(item.sourceKind==='conversation'){
  sessionStorage.setItem('memoryDiscussion',JSON.stringify({id:item.sourceId}));location.hash='assistant';window.dispatchEvent(new Event('memory-discussion'));
 }else{
  sessionStorage.setItem('petReminderTarget',JSON.stringify(item));location.hash=item.actionTarget.page;window.dispatchEvent(new Event('pet-reminder-target'));
 }
}
export const openPetReminder=openPetSource;
export default function PetReminderTable({state,onOpen}:{state:ReturnType<typeof usePetReminders>;onOpen:(item:PetReminder)=>void}){
 return <section className="pet-reminder-table" aria-label="小九提示表" aria-busy={state.loading}>
  <h3>小九的提示{state.data&&!state.error?` · ${state.data.total} 项`:''}</h3>
  {state.error&&<div role="alert"><p>提示暂时获取失败：{state.error}{state.data?' 下方是上次获取的内容，可能已变化。':''}</p><button type="button" className="btn secondary" onClick={()=>void state.refresh(true)}>重试提示</button></div>}
  {state.loading&&!state.data&&<p role="status">正在查看待处理事项…</p>}
  {state.data&&!state.error&&state.data.total===0&&<p>无</p>}
  <div className="pet-reminder-list">{state.data?.items.map(item=><article key={item.id} data-pet-reminder-id={item.id}>
   <strong>{item.title}</strong><p>小九：{item.message}</p>
   {item.dueAt&&<small>约定时间：{new Date(item.dueAt).toLocaleString('zh-CN')}</small>}
   <button type="button" className="btn secondary" disabled={!!state.error} onClick={()=>onOpen(item)}>查看：{item.title}</button>
  </article>)}</div>
 </section>;
}
