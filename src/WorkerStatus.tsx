import {contractGet} from './api';
import type {components} from '../contracts/generated/types';
import {useEffect,useState} from 'react';

import {ErrorBanner} from './components';
type Status = components['schemas']['WorkerStatus'];
const labels:Record<string,string>={disabled:'当前服务未启用后台进程',stopped:'后台进程已停止，等待服务恢复',starting:'后台进程启动中',unresponsive:'后台心跳超时，状态尚未确认',degraded:'后台队列连接或处理异常',ready:'后台进程心跳正常，队列连接就绪'};
export default function WorkerStatus(){
 const [open,setOpen]=useState(false),[data,setData]=useState<Status|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[attempt,setAttempt]=useState(0);
 useEffect(()=>{if(!open)return;let current=true;const load=async()=>{setBusy(true);try{const value=await contractGet('getSettingsWorker','/settings/worker');if(current){setData(value);setError('');}}catch(e){if(current)setError((e as Error).message);}finally{if(current)setBusy(false);}};void load();const timer=setInterval(()=>setAttempt(value=>value+1),10000);return()=>{current=false;clearInterval(timer);};},[open,attempt]);
 return <details onToggle={e=>setOpen(e.currentTarget.open)}><summary>后台进程与任务状态</summary><ErrorBanner message={error}/><button className="btn secondary" disabled={busy} onClick={()=>setAttempt(value=>value+1)}>{busy?'正在读取…':'刷新后台状态'}</button>{data&&<><p role="status">{labels[data.state]||'未知状态'}{error?'（上次结果）':''}</p><p>读取于 {new Date(data.checkedAt).toLocaleString('zh-CN')}{data.heartbeatAt&&<> · 最近心跳 {new Date(data.heartbeatAt).toLocaleString('zh-CN')}</>}</p><p>数据库中的任务：待处理（含预约）{data.counts.pending||0} · 处理中 {data.counts.running||0} · 失败 {data.counts.failed||0} · 已处理 {data.counts.completed||0} · 已取消 {data.counts.cancelled||0}</p></>}<p className="field-help">每10秒刷新。进程在线不代表任务已完成；数据库里的处理中状态可能等待租约恢复。具体失败原因和重试请到对应记录、要事或调研任务查看。</p></details>;
}
