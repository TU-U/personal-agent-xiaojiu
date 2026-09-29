import {useEffect,useState} from 'react';
import {pendingRunTimerRequest,retryRunTimerRequest} from './runTimerRequest';
export default function RunTimerRecovery({onRecovered,onError}:{onRecovered:()=>Promise<void>;onError:(message:string)=>void}){
 const [pending,setPending]=useState(pendingRunTimerRequest),[busy,setBusy]=useState(false);
 useEffect(()=>{const update=()=>setPending(pendingRunTimerRequest());window.addEventListener('run-timer-change',update);return()=>window.removeEventListener('run-timer-change',update);},[]);
 if(!pending)return null;
 return <div role="status" className="phase-card"><p>上一项任务操作尚未收到确认。重试同一操作不会重复保存结果。</p><button className="btn secondary" disabled={busy} onClick={async()=>{setBusy(true);try{await retryRunTimerRequest();await onRecovered();}catch(error){onError((error as Error).message);}finally{setBusy(false);}}}>重试任务操作</button></div>;
}
