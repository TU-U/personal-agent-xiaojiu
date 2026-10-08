import {contractPost} from './api';
import MemoryProposalEditor from './MemoryProposalEditor';
import {useEffect,useState} from 'react';

import {ErrorBanner,Spinner} from './components';
import type {Conversation} from './types';

export default function MemoryReview({turn,onRefresh,onToast}:{turn:Conversation;onRefresh:()=>Promise<void>;onToast:(text:string)=>void}){
 const [editing,setEditing]=useState<number|null>(null);
 const [selected,setSelected]=useState<number[]>([]);
 const [choices,setChoices]=useState<Record<number,'new'|'existing'>>({});
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{setChoices({});},[turn.revision]);
 const proposals=turn.memoryProposals||[];
 if(turn.memoryReview!=='pending'||!proposals.length)return turn.memoryNotice?<p className="memory-review-note">{turn.memoryNotice}</p>:null;
 const ready=selected.every(index=>!!proposals[index]&&(!proposals[index].conflictId||!!choices[index]));
 async function submit(){setBusy(true);setError('');try{
  await contractPost('postConversationsByIdMemoryReview','/conversations/'+turn.id+'/memory-review',{revision:turn.revision,selected:selected.map(index=>({index,keep:choices[index]||'new'}))});
  await onRefresh();onToast(selected.length?'已按你的选择更新记忆':'本轮记忆建议已丢弃');
 }catch(e){setError((e as Error).message);await onRefresh().catch(()=>{});}finally{setBusy(false);}}
 return <section className="memory-review"><h3>这轮可以记住什么？</h3><p>只保存你选中的内容；确认后其余建议会丢弃。</p><ErrorBanner message={error}/>
 {proposals.map((proposal,index)=><div className="memory-review-item" key={index}><label><input type="checkbox" checked={selected.includes(index)} onChange={e=>setSelected(current=>e.target.checked?[...current,index]:current.filter(n=>n!==index))}/><span>{proposal.content}</span></label><p className="muted small-copy">来自本轮对话 · {proposal.scopeKind==='project'?'指定项目':proposal.scopeKind==='thread'?'指定话题':'全局'}{proposal.scopeId?' · '+proposal.scopeId.slice(0,8):''} · {proposal.scope||'通用'}</p>{editing===index?<MemoryProposalEditor turn={turn} index={index} proposal={proposal} onSaved={onRefresh} onClose={()=>setEditing(null)}/>:<button type="button" className="btn text" disabled={busy||editing!==null} onClick={()=>setEditing(index)}>编辑摘要和范围</button>}
 {proposal.conflictId&&<div className="memory-conflict"><strong>与已有记忆冲突，请选保留哪条</strong>{proposal.conflictRefs?.map(ref=><div key={ref.id}><p>{ref.content}</p><p>{ref.reason}</p></div>)}<label><input type="radio" name={'conflict-'+turn.id+'-'+index} checked={choices[index]==='existing'} onChange={()=>setChoices(c=>({...c,[index]:'existing'}))}/>保留已有：{proposal.conflictRefs?.length?'上述全部记忆':proposal.conflictContent}</label><label><input type="radio" name={'conflict-'+turn.id+'-'+index} checked={choices[index]==='new'} onChange={()=>setChoices(c=>({...c,[index]:'new'}))}/>保留本轮新记忆</label></div>}</div>)}
 <button className="btn primary small" onClick={()=>void submit()} disabled={busy||!ready||editing!==null}>{busy?<Spinner label="更新记忆中"/>:selected.length?'确认所选，丢弃其余':'全部丢弃'}</button></section>;
}
