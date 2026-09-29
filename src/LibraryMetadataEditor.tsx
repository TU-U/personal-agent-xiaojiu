import {useEffect,useRef,useState} from 'react';
import {api,patch,ApiError} from './api';
import {ErrorBanner} from './components';
import type {LibraryFileRow} from './useLibraryFiles';
export default function LibraryMetadataEditor({file,onSaved,onCancel}:{file:LibraryFileRow;onSaved:(file:LibraryFileRow)=>void;onCancel:()=>void}){
 const [title,setTitle]=useState(file.title),[tags,setTags]=useState((file.tags||[]).join('\n')),[projectId,setProjectId]=useState(file.projectId||'');
 const [projects,setProjects]=useState<{id:string;name:string}[]>([]),[projectError,setProjectError]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[uncertain,setUncertain]=useState(false);
 const request=useRef<{opId:string;revision:number;title:string;tags:string[];projectId:string}|null>(null),lock=useRef(false);
 const loadProjects=async()=>{try{setProjects((await api<{items:{id:string;name:string}[]}>('/projects')).items);setProjectError('');}catch(e){setProjectError((e as Error).message);}};
 useEffect(()=>{void loadProjects();},[]);
 async function submit(){
  if(lock.current)return;lock.current=true;setBusy(true);setError('');
  const body=request.current||{opId:Array.from(crypto.getRandomValues(new Uint8Array(16)),b=>b.toString(16).padStart(2,'0')).join(''),revision:file.revision,title,tags:tags.split('\n').map(tag=>tag.trim()).filter(Boolean),projectId};request.current=body;
  try{const result=await patch<{file:LibraryFileRow;savedRevision:number}>('/library/'+encodeURIComponent(file.id)+'/metadata',body);setUncertain(false);onSaved(result.file);}
  catch(e){const failure=e as ApiError;setError(failure.message);if(!failure.status||failure.status>=500)setUncertain(true);else{request.current=null;setUncertain(false);}}
  finally{lock.current=false;setBusy(false);}
 }
 return <form className="phase-card" onSubmit={e=>{e.preventDefault();void submit();}} aria-label="编辑资料信息">
  <p>只修改拾光中的资料信息。来源路径、原文件名和正文不变；旧项目标签“{file.project||'无'}”单独保留。</p>
  <ErrorBanner message={error}/><ErrorBanner message={projectError}/>{projectError&&<button type="button" className="btn text" onClick={()=>void loadProjects()}>重新加载项目</button>}
  <label>资料标题<input required maxLength={200} value={title} disabled={busy||uncertain} onChange={e=>setTitle(e.target.value)}/></label>
  <label>资料标签（每行一个，最多20个）<textarea aria-label="资料标签（每行一个，最多20个）" rows={3} value={tags} disabled={busy||uncertain} onChange={e=>setTags(e.target.value)}/></label>
  <label>关联项目<select aria-label="资料关联项目" value={projectId} disabled={busy||uncertain} onChange={e=>setProjectId(e.target.value)}><option value="">不关联项目</option>{projectId&&!projects.some(p=>p.id===projectId)&&<option value={projectId}>当前关联未加载或已失效（{projectId.slice(0,8)}）</option>}{projects.map(p=><option key={p.id} value={p.id}>{p.name} · {p.id.slice(0,8)}</option>)}</select></label>
  {uncertain&&<p role="status">保存结果尚未确认，请重试同一次保存。当前输入已保留。</p>}
  <div className="phase-actions"><button className="btn primary" disabled={busy||!title.trim()}>{busy?'正在保存…':uncertain?'重试确认保存':'保存资料信息'}</button><button type="button" className="btn text" disabled={busy} onClick={onCancel}>返回资料</button></div>
 </form>;
}
