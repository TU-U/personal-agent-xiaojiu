import {useEffect,useRef,useState} from 'react';
import {api} from './api';
import {ErrorBanner} from './components';
type Entry={id:string;state:string;finishedAt:string|null;inputEvidenceRevision:number;status?:string;error:string;notice:string};
type Page={items:Entry[];nextBefore:number|null};
type Detail=Entry&{evidence:string;requirements?:{minimumSeconds:number;conditions:{id:string;description:string}[]};sources:{id:string;title?:string;revision?:number;content:string;sourceState?:string}[];assessment?:{reason:string;results?:{conditionId:string;status:string;reason:string;evidence:{sourceId:string;quote:string;start:number;end:number}[]}[]}};
const labels:Record<string,string>={accepted:'检查结果已保存',failed:'检查失败',superseded:'结果已失效，未采用',legacy:'升级前检查结果',satisfied:'满足',missing:'缺少',unclear:'无法判断'};
export default function RunEvidenceHistory({runId}:{runId:string}){
 const [open,setOpen]=useState(false),[page,setPage]=useState<Page|null>(null),[detail,setDetail]=useState<Detail|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const generation=useRef(0);
 useEffect(()=>()=>{generation.current++;},[runId]);
 async function load(append=false){const request=++generation.current;setBusy(true);setError('');if(!append)setDetail(null);
  try{const next=await api<Page>(`/work-runs/${runId}/evidence-history${append&&page?.nextBefore?'?before='+page.nextBefore:''}`);if(request===generation.current)setPage(previous=>({...next,items:append?[...(previous?.items||[]),...next.items]:next.items}));}
  catch(e){if(request===generation.current)setError((e as Error).message);}finally{if(request===generation.current)setBusy(false);}
 }
 async function inspect(id:string){const request=++generation.current;setBusy(true);setError('');setDetail(null);
  try{const value=await api<Detail>(`/work-runs/${runId}/evidence-history/${id}`);if(request===generation.current)setDetail(value);}
  catch(e){if(request===generation.current)setError((e as Error).message);}finally{if(request===generation.current)setBusy(false);}
 }
 return <details onToggle={e=>{const expanded=e.currentTarget.open;setOpen(expanded);if(expanded&&!page&&!busy)void load();}}><summary>证据检查历史</summary>{open&&<div aria-label="证据检查历史">
  <p>保留已返回的检查结果与当时材料。查看历史不会重新检查或确认完成；当前有效结论以任务卡片为准。</p>
  <ErrorBanner message={error}/><button className="btn text" disabled={busy} onClick={()=>void load()}>刷新检查历史</button>
  {busy&&<p role="status">正在读取检查历史…</p>}{page&&!page.items.length&&<p>暂无已保存的检查历史。升级前的当前结论仍在任务卡片中。</p>}
  {page?.items.map(item=><p key={item.id}><button className="btn text" disabled={busy} onClick={()=>void inspect(item.id)}>{item.finishedAt?new Date(item.finishedAt).toLocaleString('zh-CN'):'时间未记录'} · {labels[item.state]||item.state} · 提交时证据版本 {item.inputEvidenceRevision}{item.status?' · '+(labels[item.status]||item.status):''}</button></p>)}
  {page?.nextBefore&&<button className="btn secondary" disabled={busy} onClick={()=>void load(true)}>加载更早的检查</button>}
  {detail&&<section key={detail.id} aria-label="检查历史详情"><h3>{labels[detail.state]||detail.state}</h3>{detail.notice&&<p>{detail.notice}</p>}{detail.error&&<p>{detail.error}</p>}
   <h4>当时的完成要求</h4>{detail.requirements?<><p>至少投入 {detail.requirements.minimumSeconds/60} 分钟</p><ul>{detail.requirements.conditions.map(condition=><li key={condition.id}>{condition.description}</li>)}</ul></>:<p>旧记录未保存条件快照。</p>}
   <details><summary>当时提交的文字</summary><p style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{detail.evidence||'未填写文字说明'}</p></details>
   {detail.sources.filter(source=>source.id!=='text').map(source=><details key={source.id}><summary>{source.title||'引用材料'} · 版本 {source.revision}{source.sourceState==='changed'?' · 来源已修改，以下为当时快照':source.sourceState==='deleted'?' · 来源已删除，以下为当时快照':' · 当时快照'}</summary><p style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{source.content}</p></details>)}
   {detail.assessment&&<><h4>当时的检查结论</h4><p>{detail.assessment.reason}</p>{detail.assessment.results?.map(result=><details key={result.conditionId}><summary>{detail.requirements?.conditions.find(condition=>condition.id===result.conditionId)?.description||result.conditionId} · {labels[result.status]||result.status}</summary><p>{result.reason}</p>{result.evidence.map((citation,index)=><p key={index}>证据第 {citation.start+1}–{citation.end} 字：{citation.quote}</p>)}</details>)}</>}
  </section>}
 </div>}</details>;
}
