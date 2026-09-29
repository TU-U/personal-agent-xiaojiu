import {useEffect,useRef,useState} from 'react';
import {api,post} from './api';
import {ErrorBanner} from './components';
import type {Note} from './types';
type State={note:Note;job:null|{id:string;state:string;attempts:number;error?:string}};
export default function ProcessingStatus({note,onUpdated}:{note:Note;onUpdated:(note:Note)=>void}){
 const [state,setState]=useState<State|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const callback=useRef(onUpdated);callback.current=onUpdated;
 useEffect(()=>{let active=true;const load=async()=>{try{const result=await api<State>(`/notes/${note.id}/processing`);if(!active)return;setState(result);setError('');if(result.job?.state==='completed'&&result.note.revision>note.revision)callback.current(result.note);}catch(e){if(active)setError((e as Error).message);}};void load();const timer=setInterval(()=>void load(),2000);return()=>{active=false;clearInterval(timer);};},[note.id,note.revision]);
 async function action(action:string){setBusy(true);setError('');try{await post(`/notes/${note.id}/processing`,{action,revision:note.revision});const next=await api<State>(`/notes/${note.id}/processing`);setState(next);callback.current(next.note);}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 if(!state?.job&&!error)return null;
 const status=state?.job?.state;
 const labels:Record<string,string>={pending:'原件已保存，等待后台解析。队列离线时任务会保留。',running:'正在解析原件…',failed:'解析失败，原件仍可下载。',cancelled:'已取消解析，原件仍保留。',completed:'原件解析已完成。'};
 return <section className="subtle-notice" aria-label="原件解析状态"><p role="status">{status&&labels[status]}</p>{state?.job?.error&&<p>{state.job.error}</p>}<ErrorBanner message={error}/>{['pending','running'].includes(status||'')&&<button className="btn secondary" disabled={busy} onClick={()=>void action('cancel')}>取消解析</button>}{['failed','cancelled'].includes(status||'')&&<button className="btn secondary" disabled={busy} onClick={()=>void action('retry')}>重试解析</button>}</section>;
}
