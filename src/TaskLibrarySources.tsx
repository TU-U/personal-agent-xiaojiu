import {useEffect,useState} from 'react';
import {api,del} from './api';
import {ErrorBanner} from './components';
import LibraryDetail,{type LibraryLocation} from './LibraryDetail';
type Reference=LibraryLocation&{available:boolean;issue:string;sourcePath:string};
export default function TaskLibrarySources({taskId,revision,onChanged}:{taskId:string;revision:number;onChanged:()=>void}){
 const [data,setData]=useState<{items:Reference[];revision:number;editable:boolean}|null>(null),[error,setError]=useState(''),[attempt,setAttempt]=useState(0),[busy,setBusy]=useState(false),[detail,setDetail]=useState<Reference|null>(null);
 useEffect(()=>{let active=true;setError('');void api<typeof data>('/work-tasks/'+encodeURIComponent(taskId)+'/library').then(value=>{if(active)setData(value);}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[taskId,revision,attempt]);
 async function unlink(id:string){if(!data)return;setBusy(true);setError('');try{await del('/work-tasks/'+encodeURIComponent(taskId)+'/library/'+encodeURIComponent(id),data.revision);setAttempt(n=>n+1);onChanged();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 return <section><h3>关联资料</h3><ErrorBanner message={error}/>{error&&<button className="btn text" onClick={()=>setAttempt(n=>n+1)}>重新加载关联资料</button>}
  {!data&&!error&&<p role="status">正在加载关联资料…</p>}{data&&!data.items.length&&<p>尚未关联资料，可从资料库详情添加。</p>}
  {data?.items.map(ref=><article className="phase-card" key={ref.id}><strong>{ref.title} · 关联版本 {ref.revision}</strong><small>{ref.sourcePath}</small>{ref.issue&&<p role="alert">{ref.issue}</p>}<div className="phase-actions"><button className="btn text" onClick={()=>setDetail(ref)}>查看资料当前正文</button><button className="btn text" disabled={busy||!data.editable} onClick={()=>void unlink(ref.id)}>移除资料关联</button></div></article>)}
  {detail&&<LibraryDetail source={detail} onClose={()=>setDetail(null)} onDiscuss={file=>{sessionStorage.setItem('libraryDiscussion',JSON.stringify({id:file.id,kind:'libraryFile',title:file.title,revision:file.revision}));location.hash='assistant';}}/>}
 </section>;
}
