import ImportCategory from './ImportCategory';
import {useEffect,useState,useRef} from 'react';
import {ArrowLeft,FileText,Folder,FolderOpen,Search} from 'lucide-react';
import {api,post,ApiError} from './api';
import {Modal,ErrorBanner,Spinner} from './components';
import type {Note} from './types';

type ComputerItem={name:string;path:string;kind:'directory'|'file'};
type ComputerListing={root:string;path:string;items:ComputerItem[];truncated:boolean};

export default function ComputerFiles({onClose,onImported}:{onClose:()=>void;onImported:(note:Note)=>Promise<void>}){
 const importOperations=useRef(new Map<string,string>());
 const [category,setCategory]=useState(''),[categoryLocked,setCategoryLocked]=useState(false);
 const [folder,setFolder]=useState(''),[query,setQuery]=useState(''),[listing,setListing]=useState<ComputerListing|null>(null);
 const [busy,setBusy]=useState(false),[importing,setImporting]=useState(''),[error,setError]=useState('');
 async function load(path:string,search=''){
  setBusy(true);setError('');
  try{const result=await api<ComputerListing>('/computer-files?path='+encodeURIComponent(path)+(search?'&q='+encodeURIComponent(search):''));setFolder(path);setListing(result);}
  catch(cause){setError((cause as Error).message);}
  finally{setBusy(false);}
 }
 useEffect(()=>{void load('');},[]);
 async function importItem(item:ComputerItem){
  setImporting(item.path);setCategoryLocked(true);setError('');
  try{const opId=importOperations.current.get(item.path)||crypto.randomUUID();importOperations.current.set(item.path,opId);const note=await post<Note>('/computer-files/import',{path:item.path,opId,...(category?{categoryId:category}:{})});await onImported(note);onClose();}
  catch(cause){setError((cause as Error).message);if(cause instanceof ApiError&&[400,404,413,415,422].includes(cause.status))setCategoryLocked(false);}
  finally{setImporting('');}
 }
 const parent=folder.split('/').slice(0,-1).join('/');
 return <Modal title="从电脑文件导入" onClose={()=>{if(!importing)onClose();}} closeDisabled={!!importing} wide><div className="computer-files"><p className="computer-files-intro">浏览已映射的电脑目录（默认 E 盘），选择文件后才会复制到拾光。原文件不会移动或修改；导入的记录会保留原路径。</p><ErrorBanner message={error}/><ImportCategory value={category} onChange={setCategory} disabled={!!importing||categoryLocked}/>{categoryLocked&&<p>本次导入沿用所选类别，保存后可在记录详情调整。</p>}
 <form className="computer-files-search" onSubmit={event=>{event.preventDefault();void load(folder,query.trim());}}><input aria-label="搜索电脑文件名" placeholder="搜索当前文件夹及子文件夹的文件名" value={query} onChange={event=>setQuery(event.target.value)} maxLength={100}/><button className="btn secondary" disabled={busy||!!importing||!query.trim()}><Search size={16}/>查找文件</button>{query&&<button type="button" className="btn text" onClick={()=>{setQuery('');void load(folder);}} disabled={busy||!!importing}>清除</button>}</form>
 <div className="computer-files-location"><button className="btn text" onClick={()=>{setQuery('');void load(parent);}} disabled={busy||!!importing||!folder} aria-label="返回上级文件夹"><ArrowLeft size={17}/>返回上级</button><span title={folder}>{listing?.root||'电脑文件'}{folder?' / '+folder:''}</span></div>
 {busy?<div className="computer-files-status"><Spinner label="正在读取文件列表…"/></div>:listing?.items.length?<div className="computer-files-list">{listing.items.map(item=><div className="computer-file-row" key={item.path}><span className="computer-file-icon">{item.kind==='directory'?<Folder size={18}/>:<FileText size={18}/>}</span><span className="computer-file-name" title={item.path}><strong>{item.name}</strong>{item.path!==item.name&&<small>{item.path}</small>}</span>{item.kind==='directory'?<button className="btn secondary small" disabled={!!importing} onClick={()=>{setQuery('');void load(item.path);}}><FolderOpen size={14}/>打开</button>:<button className="btn primary small" disabled={!!importing} onClick={()=>void importItem(item)}>{importing===item.path?<Spinner label="导入中…"/>:'导入并分析'}</button>}</div>)}</div>:<div className="computer-files-status">{listing?'这里没有可导入的文件。':'无法读取文件列表。'}</div>}
 {listing?.truncated&&<p className="computer-files-hint">结果已限制数量；可进入具体文件夹或缩小文件名关键词继续查找。</p>}<p className="computer-files-hint">支持文字、Markdown、PDF、DOCX、图片和音频，单文件最多 25 MB。扫描件暂需补充描述；音频可在详情中发起本地转写。</p></div></Modal>;
}
