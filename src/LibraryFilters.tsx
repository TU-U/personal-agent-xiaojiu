import {useEffect,useState} from 'react';
import {api} from './api';
import {ErrorBanner} from './components';

export function LibraryFilters({onApply}:{onApply:(filters:Record<string,string>)=>void}){
 const [projects,setProjects]=useState<{id:string;title?:string;name?:string}[]>([]),[error,setError]=useState('');
 const [draft,setDraft]=useState({projectId:'',directory:'',extension:'',dateFrom:'',dateTo:''});
 const [applied,setApplied]=useState(JSON.stringify(draft));
 async function load(){try{const result=await api<{items:typeof projects}>('/projects');setProjects(result.items);setError('');}catch(e){setError((e as Error).message);}}
 useEffect(()=>{void load();},[]);
 const field=(name:keyof typeof draft,value:string)=>setDraft(old=>({...old,[name]:value}));
 return <details><summary>项目、目录、文件类型与入库日期筛选</summary>
  <p>应用后同时限定资料清单和正文检索；入库日期按北京时间计算。正文检索仅包含已解析资料。</p>
  <ErrorBanner message={error}/>{error&&<button className="btn text" onClick={()=>void load()}>重新加载项目</button>}
  <form onSubmit={e=>{e.preventDefault();onApply(draft);setApplied(JSON.stringify(draft));}}>
   <div className="phase-actions">
    <label>项目筛选<select aria-label="项目筛选" value={draft.projectId} onChange={e=>field('projectId',e.target.value)}><option value="">全部项目</option>{projects.map(p=><option key={p.id} value={p.id}>{p.title||p.name||'未命名项目'} · {p.id.slice(0,8)}</option>)}</select></label>
    <label>目录筛选<input placeholder="E 盘相对目录，包含子目录" value={draft.directory} onChange={e=>field('directory',e.target.value)}/></label>
    <label>文件扩展名<input placeholder="如 .pdf、.md" value={draft.extension} onChange={e=>field('extension',e.target.value)}/></label>
    <label>入库开始日期<input type="date" value={draft.dateFrom} onChange={e=>field('dateFrom',e.target.value)} max={draft.dateTo||undefined}/></label>
    <label>入库结束日期<input type="date" value={draft.dateTo} onChange={e=>field('dateTo',e.target.value)} min={draft.dateFrom||undefined}/></label>
   </div>
   <div className="phase-actions"><button className="btn secondary">应用筛选</button><button type="button" className="btn text" onClick={()=>{const empty={projectId:'',directory:'',extension:'',dateFrom:'',dateTo:''};setDraft(empty);setApplied(JSON.stringify(empty));onApply(empty);}}>清空组合筛选</button>{JSON.stringify(draft)!==applied&&<span role="status">有尚未应用的筛选条件</span>}</div>
  </form>
 </details>;
}
