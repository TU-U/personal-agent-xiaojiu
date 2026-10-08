import {useEffect,useState} from 'react';
import {pendingEventRequest,retryEventRequest} from './eventRequest';
import {ErrorBanner} from './components';
export default function EventActionRecovery({onRefresh}:{onRefresh:(request?:{path:string})=>Promise<void>}){
 const [pending,setPending]=useState(pendingEventRequest),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{const sync=()=>setPending(pendingEventRequest());window.addEventListener('event-action-change',sync);return()=>window.removeEventListener('event-action-change',sync);},[]);
 async function retry(){setBusy(true);setError('');try{const request=pendingEventRequest();await retryEventRequest();await onRefresh(request||undefined);}catch(e){setError((e as Error).message);}finally{setBusy(false);setPending(pendingEventRequest());}}
 return <><ErrorBanner message={error}/>{pending&&<div className="phase-card" role="status"><p>上一项要事操作尚未收到确认。原操作已保留，重试会复用原保存或检查操作，不重复新建要事、安排检查或复核。</p><button type="button" className="btn secondary" disabled={busy} onClick={()=>void retry()}>重试未确认的要事操作</button></div>}</>;
}
