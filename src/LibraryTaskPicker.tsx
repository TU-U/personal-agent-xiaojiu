import {contractPost} from './api';
import {contractGet} from './api';
import type {components} from '../contracts/generated/types';
import {useEffect,useRef,useState} from 'react';
import {ApiError} from './api';
import {ErrorBanner} from './components';
import type {LibraryFileRow} from './useLibraryFiles';
type Task = components['schemas']['LibraryTaskCandidate'];

export default function LibraryTaskPicker({file}:{file:LibraryFileRow}){
 const [tasks,setTasks]=useState<Task[]>([]),[selected,setSelected]=useState<Task|null>(null),[cursor,setCursor]=useState<string|null>(null),[error,setError]=useState(''),[notice,setNotice]=useState(''),[loading,setLoading]=useState(false),[busy,setBusy]=useState(false),[uncertain,setUncertain]=useState(false);
 const epoch=useRef(0),pending=useRef<import('./api').ContractInput<'postLibraryByIdTasks'>|null>(null),lock=useRef(false);
 async function load(next?:string){const ticket=++epoch.current;setLoading(true);setError('');try{const result=await contractGet('getLibraryByIdTasks','/library/'+encodeURIComponent(file.id)+'/tasks?limit=30'+(next?'&cursor='+encodeURIComponent(next):''));if(ticket!==epoch.current)return;setTasks(old=>next?[...new Map([...old,...result.items].map(t=>[t.id,t])).values()]:result.items);setCursor(result.nextCursor);}catch(e){if(ticket===epoch.current)setError((e as Error).message);}finally{if(ticket===epoch.current)setLoading(false);}}
 useEffect(()=>{void load();return()=>{epoch.current++;};},[file.id]);
 async function attach(){
  if(!selected||lock.current)return;lock.current=true;setBusy(true);setError('');setNotice('');
  const body=pending.current||{opId:Array.from(crypto.getRandomValues(new Uint8Array(16)),b=>b.toString(16).padStart(2,'0')).join(''),taskId:selected.id,taskRevision:selected.revision,sourceRevision:file.revision};pending.current=body;
  try{await contractPost('postLibraryByIdTasks','/library/'+encodeURIComponent(file.id)+'/tasks',body);pending.current=null;setUncertain(false);setSelected(null);setNotice('已关联到任务，尚未启动任务或确认完成。');await load();}
  catch(e){const failure=e as ApiError;setError(failure.message);if(!failure.status||failure.status>=500)setUncertain(true);else{pending.current=null;setUncertain(false);}}
  finally{lock.current=false;setBusy(false);}
 }
 return <details className="phase-card"><summary>关联已有任务</summary><p>只列出尚可修改的任务。执行中的任务请先暂停；关联不会自动启动或完成任务。</p><ErrorBanner message={error}/>{notice&&<p role="status">{notice}</p>}
  <button className="btn text" disabled={loading||busy||uncertain} onClick={()=>void load()}>刷新可关联任务</button>
  {loading&&<p role="status">正在加载任务…</p>}{!loading&&!error&&!tasks.length&&<p>暂无可关联任务，请先在任务页创建并确认目标。</p>}
  {tasks.map(task=><label key={task.id} className="library-batch-check"><input type="radio" name="library-task" aria-label={'选择任务 '+task.title} disabled={busy||uncertain} checked={selected?.id===task.id} onChange={()=>setSelected(task)}/>{task.title} · {task.id.slice(0,8)}</label>)}
  {cursor&&<button className="btn secondary" disabled={loading} onClick={()=>void load(cursor)}>加载更多任务</button>}
  {selected&&<p>已选：{selected.title}（任务版本 {selected.revision}）<button className="btn text" disabled={busy||uncertain} onClick={()=>setSelected(null)}>清除任务选择</button></p>}
  {uncertain&&<p role="status">关联结果尚未确认，重试会继续同一次操作。</p>}
  <button className="btn primary" disabled={!selected||busy} onClick={()=>void attach()}>{busy?'正在关联…':uncertain?'重试确认关联':'关联所选任务'}</button>
 </details>;
}
