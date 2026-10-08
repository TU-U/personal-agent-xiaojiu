import {contractPost,contractPatch} from './api';
import {contractGet} from './api';
import type {components} from '../contracts/generated/types';
import {useEffect,useRef,useState} from 'react';

import {ErrorBanner} from './components';
import type {Note,Transcript} from './types';
type AudioNote = components['schemas']['AudioNote'];
type State = components['schemas']['TranscriptionState'];
const time=(ms:number)=>`${Math.floor(ms/60000)}:${((ms/1000)%60).toFixed(1).padStart(4,'0')}`;
export default function TranscriptPanel({note,onUpdated}:{note:Note;onUpdated:(note:Note)=>void}){
 const [state,setState]=useState<State|null>(null),[error,setError]=useState(''),[pollError,setPollError]=useState(''),[busy,setBusy]=useState(false),[editing,setEditing]=useState(false),[texts,setTexts]=useState<string[]>([]),[speakerIds,setSpeakerIds]=useState<(string|null)[]>([]),[baseline,setBaseline]=useState<AudioNote|null>(null),[language,setLanguage]=useState<''|'zh'|'en'>(''),[speakers,setSpeakers]=useState(-1);
 const [history,setHistory]=useState<{id:string;transcript:Transcript;original?:Transcript}[]>([]),[historyOpen,setHistoryOpen]=useState(false),[historyNext,setHistoryNext]=useState<number|null>(null),[historyBusy,setHistoryBusy]=useState(false);
 async function loadHistory(offset=0){setHistoryBusy(true);setError('');try{const result=await contractGet('getNotesByIdTranscriptHistory',`/notes/${note.id}/transcript-history?offset=${offset}`);setHistory(old=>offset?[...old,...result.versions]:result.versions);setHistoryNext(result.nextOffset);setHistoryOpen(true);}catch(e){setError((e as Error).message);}finally{setHistoryBusy(false);}}
 const callback=useRef(onUpdated);callback.current=onUpdated;
 const draftKey='shiguang-transcript-'+note.id;
 useEffect(()=>{if(!editing||!baseline)return;try{localStorage.setItem(draftKey,JSON.stringify({baseline,texts,speakerIds}));}catch{setError('此浏览器无法保存转写草稿，请先复制修订内容。');}},[editing,baseline,texts,speakerIds,draftKey]);
 function beginEdit(){let base=state!.note,values=base.transcript!.segments.map(s=>s.text),ids=base.transcript!.segments.map(s=>s.speakerId);try{const draft=JSON.parse(localStorage.getItem(draftKey)||'null');if(draft?.baseline?.id===note.id&&Array.isArray(draft.texts)&&draft.texts.every((t:unknown)=>typeof t==='string')&&draft.texts.length===draft.baseline?.transcript?.segments?.length){base=draft.baseline;values=draft.texts;ids=Array.isArray(draft.speakerIds)&&draft.speakerIds.length===values.length?draft.speakerIds:base.transcript!.segments.map(s=>s.speakerId);}}catch{}setBaseline(base);setTexts(values);setSpeakerIds(ids);setEditing(true);}

 useEffect(()=>{
  if(busy)return;
  let active=true,inFlight=false;
  const controller=new AbortController();
  const load=async()=>{
   if(inFlight)return;inFlight=true;
   try{
    const next=await contractGet('getNotesByIdTranscription',`/notes/${note.id}/transcription`,{signal:AbortSignal.any([controller.signal,AbortSignal.timeout(15000)])});
    if(!active)return;
    setState(next);setPollError('');
    if(!editing&&next.note.revision>note.revision)callback.current(next.note);
   }catch(e){if(active)setPollError((e as Error).message);}
   finally{inFlight=false;}
  };
  void load();const timer=setInterval(()=>void load(),2000);
  return()=>{active=false;controller.abort();clearInterval(timer);};
 },[note.id,note.revision,editing,busy]);
 async function action(action:'start'|'cancel'){if(action==='start'&&state?.note.transcript&&!window.confirm('重新转写会替换当前显示版本，现有修订将保留在转写历史中。继续吗？'))return;setBusy(true);setError('');try{await contractPost('postNotesByIdTranscription',`/notes/${note.id}/transcription`,{revision:note.revision,action,...(action==='start'?{options:{...(language?{language}:{}),speakers}}:{})});const next=await contractGet('getNotesByIdTranscription',`/notes/${note.id}/transcription`);setState(next);callback.current(next.note);}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 async function save(){if(!baseline?.transcript)return;setBusy(true);setError('');try{const updated=await contractPatch('patchNotesByIdTranscript',`/notes/${note.id}/transcript`,{revision:baseline.revision,transcriptRevision:baseline.transcript.transcriptRevision,texts,speakerIds});try{localStorage.removeItem(draftKey);}catch{}setEditing(false);callback.current(updated);setState(old=>old?{...old,note:updated}:old);}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 const transcript=state?.note.transcript,job=state?.job,running=job&&['pending','running'].includes(job.state);
 const labels:Record<string,string>={pending:'等待本地转写',running:'正在处理录音',failed:'转写失败，原件仍保留',cancelled:'已取消转写',completed:'转写任务已结束'};
 const stages:Record<string,string>={decoding:'读取音轨',transcribing:'识别文字',diarizing:'区分说话人'};
 return <section className="transcript-panel" aria-label="录音转写"><h2>录音转写</h2><ErrorBanner message={error}/><ErrorBanner message={pollError?`转写状态暂时无法刷新：${pollError}。下方可能仍是上次状态，正在重试。`:''}/><p>本地处理，当前单段上限 30 分钟。文字和说话人均需核对；也可选择已知人数帮助分离。</p>
 {job&&<p role="status">{labels[job.state]}{job.progress&&` · ${stages[job.progress.stage]||job.progress.stage}`}{job.progress?.processedMs!==undefined&&` ${time(job.progress.processedMs)}`}</p>}{job?.error&&<p role="alert">{job.error}</p>}
 {!running&&!editing&&<div className="transcript-controls"><label>识别语言<select value={language} onChange={e=>{const value=e.target.value;if(value===''||value==='zh'||value==='en')setLanguage(value);}}><option value="">自动识别</option><option value="zh">中文</option><option value="en">英文</option></select></label><label>说话人数<select value={speakers} onChange={e=>setSpeakers(Number(e.target.value))}><option value={-1}>自动区分</option>{Array.from({length:20},(_,i)=><option key={i+1} value={i+1}>{i+1} 人</option>)}</select></label><button className="btn secondary" disabled={busy||!state?.capability.available} onClick={()=>void action('start')}>{transcript?'重新转写':'开始转写'}</button>{state&&!state.capability.available&&<span>本地语音模型尚未准备好，原件已保留。</span>}</div>}
 {running&&<button className="btn secondary" disabled={busy} onClick={()=>void action('cancel')}>取消转写</button>}
 {transcript&&<><p>{transcript.edited?'人工修订':'模型转写'} · {time(transcript.durationMs)} · 版本 {transcript.transcriptRevision}</p>{transcript.diarization.error&&<p role="alert">{transcript.diarization.error}</p>}{state?.note.summaryStale&&<p role="status">转写已更新，已有 AI 总结已过期，请重新归纳。</p>}
 <div className="transcript-segments">{(editing?baseline?.transcript:transcript)?.segments.map((segment,i)=><div className="transcript-segment" key={i}><small>{time(segment.startMs)}–{time(segment.endMs)} · {segment.speakerId?segment.speakerId.replace('speaker_','说话人 '):'说话人待核对'}</small>{editing?<><label>说话人<select aria-label={`第 ${i+1} 段说话人`} value={speakerIds[i]||''} onChange={e=>setSpeakerIds(old=>old.map((s,j)=>i===j?e.target.value||null:s))}><option value="">待核对</option>{[...new Set([...Array.from({length:20},(_,n)=>'speaker_'+(n+1)),...speakerIds.filter((s):s is string=>!!s)])].map(id=><option key={id} value={id}>{id.replace('speaker_','说话人 ')}</option>)}</select></label><textarea aria-label={`第 ${i+1} 段转写`} value={texts[i]} maxLength={10000} onChange={e=>setTexts(old=>old.map((t,j)=>i===j?e.target.value:t))}/></>:<p>{segment.text}</p>}</div>)}</div>
 {editing?<div className="transcript-controls"><button className="btn primary" disabled={busy||texts.some(t=>!t.trim())} onClick={()=>void save()}>保存转写修订</button><button className="btn secondary" disabled={busy} onClick={()=>{try{localStorage.removeItem(draftKey);}catch{}setEditing(false);}}>放弃修订</button></div>:<button className="btn secondary" disabled={busy||!!running} onClick={beginEdit}>修订转写与说话人</button>}</>}
 <button className="btn secondary" disabled={historyBusy} onClick={()=>historyOpen?setHistoryOpen(false):void loadHistory()}>{historyBusy?'读取历史…':historyOpen?'收起转写历史':'查看转写历史'}</button>
 {historyOpen&&<section aria-label="转写历史"><p>旧版本只供核对，不会自动替换当前转写。</p>{!history.length&&<p>暂无历史版本。后续修订或重新转写时会保留当前版本。</p>}{history.map(version=><details key={version.id}><summary>版本 {version.transcript.transcriptRevision} · {version.transcript.edited?'人工修订':'模型转写'}</summary><div className="transcript-segments">{version.transcript.segments.map((s,i)=><p key={i} style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{time(s.startMs)}–{time(s.endMs)} · {s.speakerId?.replace('speaker_','说话人 ')||'说话人待核对'}<br/>{s.text}</p>)}</div>{version.original&&version.transcript.edited&&<details><summary>对应模型原始转写</summary><div className="transcript-segments">{version.original.segments.map((s,i)=><p key={i} style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{time(s.startMs)}–{time(s.endMs)} · {s.text}</p>)}</div></details>}</details>)}{historyNext!==null&&<button className="btn secondary" disabled={historyBusy} onClick={()=>void loadHistory(historyNext)}>更早版本</button>}</section>}
 </section>;
}
