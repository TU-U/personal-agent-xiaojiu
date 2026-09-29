import {useEffect,useRef,useState} from 'react';
import {api,post} from './api';
import {ErrorBanner} from './components';
export type FileIndexState={state:string;sourceRevision:number;indexedRevision?:number;completedChunks?:number;retryable:boolean;message:string};
export default function LibraryIndexStatus({id,revision,initial,poll=false}:{id:string;revision:number;initial?:FileIndexState;poll?:boolean}){
 const sequence=useRef(0),running=useRef(false);
 const [state,setState]=useState(initial),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>setState(initial),[initial,id]);
 useEffect(()=>{
  if(!poll)return;let active=true,fetching=false;
  const load=async()=>{if(running.current||fetching)return;fetching=true;const ticket=++sequence.current;try{const next=await api<FileIndexState>('/library/'+encodeURIComponent(id)+'/index');if(active&&ticket===sequence.current){setState(next);setError('');}}catch(e){if(active&&ticket===sequence.current)setError((e as Error).message);}finally{fetching=false;}};
  void load();const timer=setInterval(()=>void load(),3000);return()=>{active=false;sequence.current++;clearInterval(timer);};
 },[id,poll]);
 async function retry(){if(running.current)return;running.current=true;const ticket=++sequence.current;setBusy(true);setError('');try{const next=await post<FileIndexState>('/library/'+encodeURIComponent(id)+'/index',{revision});if(ticket===sequence.current)setState(next);}catch(e){if(ticket===sequence.current)setError((e as Error).message);}finally{running.current=false;if(ticket===sequence.current)setBusy(false);}}
 return <div aria-label="资料索引状态"><ErrorBanner message={error}/>{state?<><p role="status">向量索引：{state.message}{state.completedChunks!==undefined?` · 已处理 ${state.completedChunks} 段`:''}{state.indexedRevision?` · 索引版本 ${state.indexedRevision}`:''}</p>{state.sourceRevision!==revision?<p role="alert">资料已更新，请重新打开详情或刷新清单。</p>:state.retryable&&<button className="btn secondary" disabled={busy} onClick={()=>void retry()}>{busy?'正在提交…':'重试此文件索引'}</button>}</>:poll&&<p role="status">正在读取索引状态…</p>}</div>;
}
