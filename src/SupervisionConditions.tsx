import {contractPost} from './api';
import type {components} from '../contracts/generated/types';
import {randomId} from './randomId';
import {useEffect,useState} from 'react';
import {ApiError} from './api';
import {ErrorBanner} from './components';
type Condition = components['schemas']['CompletionCondition'];
export type ConditionTask = components['schemas']['ConditionTask'];
type Pending={opId:string;planVersion:number;minutes:number;conditions:Condition[]};
const initial=(task:ConditionTask):Condition[]=>task.completionConditions||[{id:'result',kind:'evidence',required:true,description:task.requirement}];
export default function SupervisionConditions({task,locked,onSaved,onEditing}:{task:ConditionTask;locked:boolean;onSaved:()=>Promise<void>;onEditing:(value:boolean)=>void}){
 const key='shiguang-condition-edit:'+task.id;
 const [pending,setPending]=useState<Pending|null>(()=>{try{return JSON.parse(sessionStorage.getItem(key)||'null');}catch{return null;}});
 const [open,setOpen]=useState(!!pending),[conditions,setConditions]=useState<Condition[]>(pending?.conditions||initial(task)),[minutes,setMinutes]=useState(pending?.minutes??task.minutes),[version,setVersion]=useState(pending?.planVersion||task.planVersion||1),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{onEditing(open);return()=>onEditing(false);},[open,onEditing]);
 const reset=()=>{setConditions(initial(task));setMinutes(task.minutes);setVersion(task.planVersion||1);setError('');};
 async function submit(){setBusy(true);setError('');try{const body=pending||{opId:randomId(),planVersion:version,minutes,conditions};sessionStorage.setItem(key,JSON.stringify(body));setPending(body);await contractPost('postWorkTasksByIdConditions','/work-tasks/'+task.id+'/conditions',body);sessionStorage.removeItem(key);setPending(null);await onSaved();setOpen(false);}catch(e){if(e instanceof ApiError&&e.status>=400&&e.status<500){sessionStorage.removeItem(key);setPending(null);}setError((e as Error).message);}finally{setBusy(false);}}
 if(!open)return <button className="btn secondary" disabled={locked} onClick={()=>{reset();setOpen(true);}}>编辑完成条件</button>;
 return <form onSubmit={e=>{e.preventDefault();void submit();}}><h3>逐项完成条件</h3><p>{task.repeat==='daily'?'保存仅影响尚未生成的后续任务记录；今天和历史记录仍按原要求验收。':'开始前确认要求；开始后不能修改本次验收门槛。'}所有条件与最小时长必须同时满足。</p><ErrorBanner message={error}/>{pending&&<p role="status">有待确认的保存请求，重试会复用原操作，不会重复修改。</p>}<fieldset disabled={busy||!!pending}>{conditions.map((item,index)=><div key={item.id}><label>完成条件 {index+1}<textarea required maxLength={4000} rows={2} value={item.description} onChange={e=>setConditions(values=>values.map(value=>value.id===item.id?{...value,description:e.target.value}:value))}/></label><button type="button" className="btn text" disabled={conditions.length===1} onClick={()=>setConditions(values=>values.filter(value=>value.id!==item.id))}>移除条件 {index+1}</button></div>)}<button type="button" className="btn secondary" disabled={conditions.length>=20} onClick={()=>setConditions(values=>[...values,{id:randomId(),kind:'evidence',required:true,description:''}])}>添加完成条件</button><label>最少投入分钟<input type="number" min={0} max={1440} step="any" required value={minutes} onChange={e=>setMinutes(Number(e.target.value))}/></label><p>最多 20 条，正文合计不超过 8000 字。</p></fieldset><div className="phase-actions"><button className="btn primary" disabled={busy||(!pending&&locked)}>{pending?'重试保存完成条件':'确认保存完成条件'}</button><button type="button" className="btn text" disabled={busy||!!pending} onClick={()=>setOpen(false)}>取消编辑</button><button type="button" className="btn text" disabled={busy||!!pending} onClick={async()=>{await onSaved();setError('已刷新，请点击“采用最新条件”替换草稿。');}}>读取最新版本</button><button type="button" className="btn text" disabled={busy||!!pending} onClick={reset}>采用最新条件</button></div></form>;
}
