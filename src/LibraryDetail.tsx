import {API_BASE} from './api';
import LibraryTaskPicker from './LibraryTaskPicker';
import LibraryMetadataEditor from './LibraryMetadataEditor';
import LibraryIndexStatus from './LibraryIndexStatus';
import {useEffect,useRef,useState} from 'react';
import {api} from './api';
import {Modal,ErrorBanner,Markdown} from './components';
import type {LibraryFileRow} from './useLibraryFiles';
export type LibraryLocation={id:string;title:string;revision?:number;start?:number;end?:number;text?:string};
export default function LibraryDetail({source,onClose,onDiscuss,onUpdated}:{onUpdated?:()=>void;source:LibraryLocation;onClose:()=>void;onDiscuss:(file:LibraryFileRow)=>void}){
 const [file,setFile]=useState<LibraryFileRow|null>(null),[error,setError]=useState(''),[attempt,setAttempt]=useState(0),[raw,setRaw]=useState(source.start!==undefined);
 const [editing,setEditing]=useState(false),[notice,setNotice]=useState('');
 const marker=useRef<HTMLElement>(null);
 useEffect(()=>{let active=true;setFile(null);setError('');void api<LibraryFileRow>('/library/'+encodeURIComponent(source.id)).then(value=>{if(active)setFile(value);}).catch(cause=>{if(active)setError(cause.message);});return()=>{active=false;};},[source.id,attempt]);
 const content=file?.content||'',requested=source.start!==undefined;
 const sameVersion=!!file&&source.revision===file.revision;
 const located=sameVersion&&Number.isInteger(source.start)&&Number.isInteger(source.end)&&source.start!>=0&&source.end!>source.start!&&source.end!<=content.length&&content.slice(source.start,source.end)===source.text;
 useEffect(()=>{if(located&&raw&&marker.current){marker.current.scrollIntoView({block:'center'});marker.current.focus({preventScroll:true});}},[file,located,raw]);
 return <Modal title={file?.title||source.title} onClose={onClose} wide><div className="phase-panel">
  <ErrorBanner message={error}/>{error&&<button className="btn secondary" onClick={()=>setAttempt(old=>old+1)}>重新加载资料</button>}
  {!file&&!error&&<p role="status">正在加载资料原文…</p>}
  {file&&<><p>{file.sourcePath} · 资料版本 {file.revision}</p><p>正文解析：{file.parse?.state==='failed'?'失败':file.parse?.state==='empty'?'未提取到正文':file.parse?.state==='unsupported'?'此格式待解析':file.status==='ready'?'已提取':'尚未完成'}{file.parse?.encoding?' · 编码 '+file.parse.encoding:''}</p>{(file.parse?.notice||file.parse?.error)&&<p role="status">{file.parse.notice||file.parse.error}</p>}<LibraryIndexStatus id={file.id} revision={file.revision} poll/>{notice&&<p role="status">{notice}</p>}<p>标签：{file.tags?.join('、')||'无'}</p>{editing&&<LibraryMetadataEditor key={file.id+':'+file.revision} file={file} onCancel={()=>setEditing(false)} onSaved={updated=>{setFile(updated);setEditing(false);setNotice('资料信息保存已确认。');onUpdated?.();}}/>}
   {file.status==='ready'&&<LibraryTaskPicker key={file.id+':'+file.revision} file={file}/>}
   {!requested&&source.revision!==undefined&&!sameVersion&&<p role="alert">资料已更新，当前正文与原关联版本不同。</p>}
   {requested&&!located&&<p role="alert">{!sameVersion?'资料版本已变化，以下显示当前正文；旧命中位置不再适用，请重新检索。':'命中片段与当前正文不一致，未作定位；请重新检索。'}</p>}
   {located&&<p role="status">已定位正文字符 {source.start!+1}–{source.end}。位置按提取文本计算，不代表原文件页码。</p>}
   <div className="phase-actions"><button className="btn secondary" onClick={()=>setEditing(true)}>编辑资料信息</button><button className="btn secondary" onClick={()=>onDiscuss(file)}>引用这份资料继续讨论</button>
    {file.copyName&&<a className="btn text" href={(API_BASE + "/library/")+encodeURIComponent(file.id)+'/file'}>下载副本</a>}
    <button className="btn text" onClick={()=>setRaw(value=>!value)}>{raw?'切换 Markdown 阅读':'查看提取原文'}</button>
    {located&&raw&&<button className="btn text" onClick={()=>{marker.current?.scrollIntoView({block:'center'});marker.current?.focus({preventScroll:true});}}>返回命中段落</button>}
   </div>
   {raw?<div className="preserve-text library-source-text">{located?<>{content.slice(0,source.start)}<mark ref={marker} tabIndex={-1} aria-label="命中段落">{content.slice(source.start,source.end)}</mark>{content.slice(source.end)}</>:content||'副本已保存，目前尚未解析正文。'}</div>:<Markdown>{content||'副本已保存，目前尚未解析正文。'}</Markdown>}
  </>}
 </div></Modal>;
}
