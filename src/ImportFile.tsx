import {randomId} from './randomId';
import {useState,useRef} from 'react';
import {api,ApiError} from './api';
import {Modal,ErrorBanner,Spinner} from './components';
import ImportCategory from './ImportCategory';
import type {Note} from './types';
export default function ImportFile({file,onClose,onImported}:{file:File;onClose:()=>void;onImported:(note:Note)=>Promise<void>}){
 const [category,setCategory]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[attempted,setAttempted]=useState(false),[saved,setSaved]=useState<Note|null>(null);const op=useRef(randomId());
 async function upload(){if(busy)return;setBusy(true);setError('');setAttempted(true);try{let note=saved;if(!note){const form=new FormData();form.append('file',file);form.append('opId',op.current);if(category)form.append('categoryId',category);note=await api<Note>('/import',{method:'POST',body:form});setSaved(note);}await onImported(note);onClose();}catch(e){setError((e as Error).message);if(e instanceof ApiError&&[400,404,413,415,422].includes(e.status)&&!saved)setAttempted(false);}finally{setBusy(false);}}
 return <Modal title="导入记录" onClose={()=>{if(!busy)onClose();}} closeDisabled={busy}><div className="phase-panel"><h3>{file.name}</h3><p>{(file.size/1024).toFixed(1)} KB · 保存原件副本</p><ImportCategory value={category} onChange={setCategory} disabled={busy||attempted}/>{attempted&&!saved&&<p>重试会沿用本次文件和类别，避免重复导入。保存后仍可修改分类。</p>}<ErrorBanner message={error}/>{saved&&<p role="status">原件已保存，正在打开记录…</p>}<button className="btn primary" disabled={busy} onClick={()=>void upload()}>{busy?<Spinner label={saved?'正在整理记录…':'正在保存原件…'}/>:attempted?'重试导入':'保存并导入'}</button></div></Modal>;
}
