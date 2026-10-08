import {contractGet} from './api';
import type {components} from '../contracts/generated/types';
import {eventRequest} from './eventRequest';
import EventActionRecovery from './EventActionRecovery';
import {useState} from 'react';

import {ErrorBanner,Modal,Markdown} from './components';
import type {EventRecord} from './types';
type Review = components['schemas']['EventReview'];
type Check = components['schemas']['EventCheck'];
const actions:Record<string,string>={snoozed:'调整约定时间',retry_requested:'请求重新复核',review_replaced:'更新复核结果',event_edited:'编辑要事后重新检查'};
function ReviewDetails({review}:{review:Review}){return <>{review.reviewedAt&&<p>复核于 {new Date(review.reviewedAt).toLocaleString('zh-CN')}</p>}{review.reviewText?<Markdown>{review.reviewText}</Markdown>:review.reviewNotice?<p className="preserve-text">{review.reviewNotice}</p>:<p>此时没有复核建议。</p>}{review.reviewSnapshot&&<details><summary>当时的复核依据</summary><p>以下是当时保存的来源版本，不代表目前仍有效。</p>{review.reviewSnapshot.sources.map((source,i)=><p key={source.kind+source.id+i}>{source.title} · {source.issue||(source.missing?'当时来源缺失':'版本 '+source.revision)}</p>)}</details>}</>;}

export default function EventChecks({event,onRefresh}:{event:EventRecord;onRefresh:()=>Promise<void>}){
 const [open,setOpen]=useState(false),[items,setItems]=useState<Check[]>([]),[error,setError]=useState(''),[busy,setBusy]=useState(false),[date,setDate]=useState('');
 async function load(){setBusy(true);setError('');try{setItems((await contractGet('getEventsByIdChecks','/events/'+event.id+'/checks')).items);}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 async function action(name:string){setBusy(true);setError('');try{await eventRequest('/events/'+event.id+'/'+name,{revision:event.revision,...(name==='end'?{}:{dueAt:new Date(date).toISOString(),...(name==='snooze'?{occurrenceId:event.currentOccurrenceId}:{})})});await onRefresh();setDate('');await load();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 const pending=event.status==='open'&&!!event.currentOccurrenceId;
 return <><button className="btn secondary small" onClick={()=>{setOpen(true);void load();}}>检查历史 / 安排</button>{open&&<Modal title="检查历史与安排" closeDisabled={busy} onClose={()=>setOpen(false)}><div className="form-body"><EventActionRecovery onRefresh={async()=>{await onRefresh();await load();}}/><ErrorBanner message={error}/><p>{event.title} · {event.lifecycleStatus==='ended'?'已结束':'进行中'}</p>{busy?<p role="status">处理中…</p>:<>{error&&<button className="btn secondary" onClick={()=>void load()}>重试加载</button>}{!error&&items.length===0&&<p>尚无约定检查。</p>}{items.map(check=><article className="phase-card" key={check.id}><p>{new Date(check.dueAt).toLocaleString('zh-CN')} · {({pending:'待确认',confirmed:'已确认',cancelled:'已取消'})[check.status]||check.status}</p>{check.confirmedAt&&<p>确认于 {new Date(check.confirmedAt).toLocaleString('zh-CN')}</p>}{check.cancelledAt&&<p>取消于 {new Date(check.cancelledAt).toLocaleString('zh-CN')} · {check.cancelReason||'未记录原因'}</p>}<ReviewDetails review={check}/>{(check.history||[]).map((entry,i)=><details key={i}><summary>{actions[entry.action]||entry.action}{entry.at?' · '+new Date(entry.at).toLocaleString('zh-CN'):''}</summary><p>调整前约定：{new Date(entry.dueAt).toLocaleString('zh-CN')}</p><p>以下为保留的历史结果，不是当前检查结论。</p><ReviewDetails review={entry}/></details>)}</article>)}</>}{event.lifecycleStatus!=='ended'&&<><label>{pending?'稍后检查时间':'下一次检查时间'}<input disabled={busy} type="datetime-local" value={date} onChange={e=>setDate(e.target.value)}/></label><button className="btn primary" disabled={busy||!date} onClick={()=>void action(pending?'snooze':'schedule')}>{pending?'确认改期':'安排下一次检查'}</button><p>确认检查只关闭本次提醒。结束要事会取消尚未确认的检查。</p><button className="btn secondary" disabled={busy} onClick={()=>{if(window.confirm('结束这件要事并取消待处理检查？历史记录会保留。'))void action('end');}}>结束要事</button></>}</div></Modal>}</>;
}
