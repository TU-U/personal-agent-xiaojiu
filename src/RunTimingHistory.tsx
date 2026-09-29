export type TimingRecord={timerSessions?:{id:string;startedAt:string;endedAt?:string;seconds:number;endReason?:string;basis?:string}[];manualAdjustments?:{id:string;minutes:number;reason:string;at:string}[];adjustments?:{minutes:number;reason:string;at:string}[]};
const date=(value:string)=>Number.isFinite(Date.parse(value))?new Date(value).toLocaleString('zh-CN'):'时间未记录';
export default function RunTimingHistory({run}:{run:TimingRecord}){
 const sessions=run.timerSessions||[],manual=[...(run.adjustments||[]),...(run.manualAdjustments||[])];
 if(!sessions.length&&!manual.length)return null;
 return <details><summary>投入记录 · {sessions.length} 段计时 / {manual.length} 次补记</summary>
  {sessions.map(session=><p key={session.id}>{date(session.startedAt)} → {session.endedAt?date(session.endedAt):'计时中'} · 已保存 {Math.round(session.seconds*1000)/1000} 秒{session.endReason==='server-restart'?' · 服务重启，停在已保存时间':''}{session.basis==='legacy-checkpoint'?' · 旧计时检查点，未还原更早分段':''}</p>)}
  {manual.map((item,index)=><p key={index}>补记 {item.minutes} 分钟 · {date(item.at)} · 原因：{item.reason}</p>)}
 </details>;
}
