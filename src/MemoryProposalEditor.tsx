import {useState} from 'react';
import {patch} from './api';
import {ErrorBanner} from './components';
import MemoryScopeFields,{type MemoryScopeKind} from './MemoryScopeFields';
import type {Conversation,MemoryProposal} from './types';
export default function MemoryProposalEditor({turn,index,proposal,onSaved,onClose}:{turn:Conversation;index:number;proposal:MemoryProposal;onSaved:()=>Promise<void>;onClose:()=>void}){
 const [content,setContent]=useState(proposal.content),[kind,setKind]=useState<MemoryScopeKind>(proposal.scopeKind||'global'),[id,setId]=useState(proposal.scopeId||''),[scope,setScope]=useState(proposal.scope||'通用'),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function submit(){setBusy(true);setError('');try{await patch('/conversations/'+turn.id+'/memory-proposals/'+index,{revision:turn.revision,content,scope,scopeKind:kind,scopeId:id});await onSaved();onClose();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 return <form className="phase-card" aria-label="编辑记忆候选" onSubmit={e=>{e.preventDefault();void submit();}}><ErrorBanner message={error}/><label>候选摘要<textarea value={content} maxLength={2000} rows={4} disabled={busy} onChange={e=>setContent(e.target.value)}/></label><MemoryScopeFields kind={kind} id={id} disabled={busy} onChange={(value,scopeId)=>{setKind(value);setId(scopeId);}}/><label>用途限制<select value={scope} disabled={busy} onChange={e=>setScope(e.target.value)}><option>通用</option><option>周报</option><option>文章</option></select></label><p>保存仍是候选，旧冲突结论会清除；原五轮期限不延长。</p><button className="btn primary small" disabled={busy||!content.trim()||(kind!=='global'&&!id)}>{busy?'正在保存…':'保存候选修改'}</button><button className="btn text" type="button" disabled={busy} onClick={onClose}>取消编辑</button></form>;
}
