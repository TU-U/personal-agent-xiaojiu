import {useEffect,useState} from 'react';
import {api} from './api';
import {ErrorBanner} from './components';
import useThreadDirectory from './useThreadDirectory';
export type MemoryScopeKind='global'|'project'|'thread';
export default function MemoryScopeFields({kind,id,onChange,disabled=false}:{kind:MemoryScopeKind;id:string;onChange:(kind:MemoryScopeKind,id:string)=>void;disabled?:boolean}){
 const [projects,setProjects]=useState<{id:string;name:string}[]>([]),[error,setError]=useState(''),[attempt,setAttempt]=useState(0);
 const threads=useThreadDirectory(0);
 useEffect(()=>{let valid=true;void api<{items:{id:string;name:string}[]}>('/projects').then(result=>{if(valid){setProjects(result.items);setError('');}}).catch(e=>{if(valid)setError(e.message);});return()=>{valid=false;};},[attempt]);
 const items=kind==='project'?projects.map(p=>({id:p.id,label:p.name})):threads.items.map(t=>({id:t.threadId||t.id,label:t.threadTitle||t.query||'未命名话题'}));
 return <fieldset disabled={disabled}><legend>适用范围</legend><label>范围类型<select value={kind} onChange={e=>onChange(e.target.value as MemoryScopeKind,'')}><option value="global">全局</option><option value="project">指定项目</option><option value="thread">指定话题</option></select></label>{kind!=='global'&&<>
 <ErrorBanner message={kind==='project'?error:threads.error}/>{(kind==='project'?error:threads.error)&&<button className="btn text" type="button" onClick={()=>kind==='project'?setAttempt(v=>v+1):threads.reload()}>重试加载范围</button>}
 <label>{kind==='project'?'所属项目':'所属话题'}<select value={id} onChange={e=>onChange(kind,e.target.value)}><option value="">请选择</option>{id&&!items.some(item=>item.id===id)&&<option value={id}>当前范围未加载或已失效 · {id.slice(0,8)}</option>}{items.map(item=><option key={item.id} value={item.id}>{item.label} · {item.id.slice(0,8)}</option>)}</select></label>
 {kind==='thread'&&threads.hasMore&&<button className="btn secondary" type="button" disabled={threads.loading} onClick={()=>void threads.more()}>{threads.loading?'正在加载…':'加载更多话题'}</button>}
 </>}<p className="muted small-copy">范围决定在哪些上下文使用；下方用途限制仍独立保留。修改已生效记忆的范围后，需要重新确认。</p></fieldset>;
}
