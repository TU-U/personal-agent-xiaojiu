import {contractPost} from './api';
import {contractGet} from './api';
import type {components} from '../contracts/generated/types';
import {randomId} from './randomId';
import {useEffect,useRef,useState} from 'react';

import {ErrorBanner} from './components';
import type {Note} from './types';
import type {NoteCategory} from './CategoryTools';
type State = components['schemas']['ClassificationState'];
export default function ClassificationStatus({note,onUpdated}:{note:Note;onUpdated:(n:Note)=>void}){
 const [state,setState]=useState<State|null>(null),[categories,setCategories]=useState<NoteCategory[]>([]),[choice,setChoice]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);const callback=useRef(onUpdated),operation=useRef(randomId());callback.current=onUpdated;
 useEffect(()=>{let active=true;async function load(){try{const [next,list]=await Promise.all([contractGet('getNotesByIdClassification',`/notes/${note.id}/classification`),contractGet('getCategories','/categories')]);if(!active)return;setState(next);setCategories(list.items);if(next.note.revision>note.revision)callback.current(next.note);}catch(e){if(active)setError((e as Error).message);}}void load();const timer=setInterval(()=>void load(),3000);return()=>{active=false;clearInterval(timer);};},[note.id,note.revision]);
 async function update(manual:boolean){setBusy(true);setError('');try{if(manual)await contractPost('postNotesCategories','/notes/categories',{opId:operation.current,categoryId:choice,notes:[{id:note.id,revision:note.revision}]});else await contractPost('postNotesByIdClassification',`/notes/${note.id}/classification`,{revision:note.revision});const next=await contractGet('getNotesByIdClassification',`/notes/${note.id}/classification`);setState(next);callback.current(next.note);setChoice('');operation.current=randomId();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 const manual=state?.note.classification?.state==='manual',category=categories.find(c=>c.id===(state?.note.categoryId||note.categoryId)),job=state?.job;
 return <section className="subtle-notice" aria-label="记录分类状态"><p>类别：{category?.name||'待分类'}{manual?' · 人工选择':state?.note.classification?.state==='ai'?' · AI 自动归类':''}</p>{!manual&&job&&<p role="status">{job.state==='pending'?'等待自动分类':job.state==='running'?'正在自动分类':job.state==='failed'?`自动分类未完成：${job.error}`:''}</p>}<ErrorBanner message={error}/>{state?.note.classification?.reason&&!manual&&<p>{state.note.classification.reason}</p>}<div className="transcript-controls"><label>调整记录类别<select aria-label="调整记录类别" value={choice} disabled={busy} onChange={e=>{setChoice(e.target.value);operation.current=randomId();}}><option value="">选择类别</option>{categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><button className="btn secondary" disabled={busy||!choice} onClick={()=>void update(true)}>保存分类调整</button>{!manual&&(!job||job.state==='failed')&&<button className="btn secondary" disabled={busy} onClick={()=>void update(false)}>重试自动分类</button>}</div></section>;
}
