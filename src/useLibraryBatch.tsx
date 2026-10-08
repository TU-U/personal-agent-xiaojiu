import {contractPost} from './api';
import {useRef,useState} from 'react';
import {ApiError} from './api';
import {ErrorBanner} from './components';
import type {LibraryFileRow} from './useLibraryFiles';
type Action='copy'|'skip';
type Selection=Pick<LibraryFileRow,'id'|'revision'|'title'|'sourcePath'|'availableActions'>;
type Pending={opId:string;action:Action;items:{id:string;revision:number}[]};
const storage='library-batch-pending-v1';
function recover():{selected:Selection[];pending:Pending|null}{
 try{const value=JSON.parse(sessionStorage.getItem(storage)||'null');
  if(value&&Array.isArray(value.selected)&&value.selected.length<=100&&value.selected.every((f:Selection)=>typeof f.id==='string'&&Number.isInteger(f.revision)&&typeof f.title==='string'&&Array.isArray(f.availableActions))&&typeof value.pending?.opId==='string'&&['copy','skip'].includes(value.pending.action)&&Array.isArray(value.pending.items))return value;
 }catch{/* malformed local state must not submit a request */}
 return {selected:[],pending:null};
}
export function useLibraryBatch(files:LibraryFileRow[],onDone:()=>Promise<void>){
 const [initial]=useState(recover),[selected,setSelected]=useState<Selection[]>(initial.selected),[pending,setPending]=useState<Pending|null>(initial.pending);
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[invalid,setInvalid]=useState<Record<string,string>>({});
 const lock=useRef(false);
 function toggle(file:LibraryFileRow){if(pending||lock.current)return;setError('');setNotice('');setInvalid({});setSelected(old=>old.some(f=>f.id===file.id)?old.filter(f=>f.id!==file.id):old.length<100?[...old,snapshot(file)]:old);if(!selected.some(f=>f.id===file.id)&&selected.length===100)setError('每批最多100份资料，请先处理已选项。');}
 function snapshot(file:LibraryFileRow):Selection{return {id:file.id,revision:file.revision,title:file.title,sourcePath:file.sourcePath,availableActions:file.availableActions||[]};}
 function chooseLoaded(){if(pending||lock.current)return;const additions=files.filter(f=>f.availableActions?.length&&!selected.some(s=>s.id===f.id));const available=100-selected.length;setSelected([...selected,...additions.slice(0,available).map(snapshot)]);setNotice(additions.length>available?`本批最多100份，另有${additions.length-available}份已加载资料未选中。`:'已选择已加载的可处理资料；未加载的文件不会自动加入。');setError('');}
 async function submit(action:Action){
  if(lock.current)return;
  const request=pending||{opId:Array.from(crypto.getRandomValues(new Uint8Array(16)),byte=>byte.toString(16).padStart(2,'0')).join(''),action,items:selected.map(({id,revision})=>({id,revision}))};
  if(!request.items.length)return;
  // Persist before sending: refresh after a lost response must reuse this opId.
  try{sessionStorage.setItem(storage,JSON.stringify({selected,pending:request}));}catch{setError('浏览器无法保存重试信息，请检查存储空间后重试；本批尚未提交。');return;}
  lock.current=true;setBusy(true);setError('');setNotice('');setPending(request);
  try{
   await contractPost('postLibraryDecisions','/library/decisions',request);setSelected([]);setPending(null);setInvalid({});sessionStorage.removeItem(storage);
   setNotice(request.action==='copy'?`已保留${request.items.length}份资料，等待复制与解析。`:`已跳过${request.items.length}份资料。`);
   await onDone();
  }catch(cause){
   const failure=cause as ApiError;setError(failure.message);
   if(failure.status>=400&&failure.status<500){setPending(null);sessionStorage.removeItem(storage);const details=failure.current as {invalid?:{id:string;reason:string}[]}|undefined;setInvalid(Object.fromEntries((details?.invalid||[]).map(item=>[item.id,item.reason])));}
  }finally{lock.current=false;setBusy(false);}
 }
 const can=(action:Action)=>!!selected.length&&selected.every(file=>file.availableActions?.includes(action));
 const bar=<section aria-label="资料批量处理" className="phase-card">
  <div className="phase-actions"><strong>已选 {selected.length} 份资料</strong><button className="btn secondary" disabled={busy||!!pending} onClick={chooseLoaded}>选择已加载可处理项</button><button className="btn text" disabled={busy||!!pending||!selected.length} onClick={()=>{setSelected([]);setInvalid({});setError('');}}>清空选择</button></div>
  <ErrorBanner message={error}/>{notice&&<p role="status">{notice}</p>}
  {pending&&<p role="status">{busy?'正在提交整批操作…':'上次提交结果尚未确认，重试会使用同一操作编号，不会重复处理。'}</p>}
  {!!selected.length&&<><details open={!!Object.keys(invalid).length}><summary>查看已选资料（包括其他筛选范围中的选择）</summary>{selected.map(file=><div key={file.id} className="phase-card"><strong>{file.title}</strong><small>{file.sourcePath} · 版本 {file.revision}</small>{invalid[file.id]&&<p role="alert">{invalid[file.id]}</p>}<button className="btn text" disabled={busy||!!pending} onClick={()=>{setSelected(old=>old.filter(item=>item.id!==file.id));setInvalid(old=>{const next={...old};delete next[file.id];return next;});}}>移除 {file.title}</button></div>)}</details><div className="phase-actions">
   {pending?<button className="btn primary" disabled={busy} onClick={()=>void submit(pending.action)}>重试确认上次操作</button>:<><button className="btn primary" disabled={busy||!can('copy')} onClick={()=>void submit('copy')}>批量保留并复制</button><button className="btn secondary" disabled={busy||!can('skip')} onClick={()=>void submit('skip')}>批量跳过</button></>}
  </div>{!pending&&(!can('copy')||!can('skip'))&&<p>部分所选状态不支持同一种操作，可在已选清单中移除后再处理。</p>}</>}
 </section>;
 return {bar,busy,locked:busy||!!pending,selected,toggle};
}
