import { useCallback, useEffect, useState } from 'react';
import { RefreshCw, Terminal } from 'lucide-react';
import { api } from './api';

type AiEvent = {at:string;stage?:string;kind?:string;callId?:string;model?:string;error?:string;finishReason?:string;[key:string]:unknown};

export default function AiLogs(){
 const [items,setItems]=useState<AiEvent[]>([]),[file,setFile]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const load=useCallback(async()=>{
  setBusy(true);
  try{const result=await api<{items:AiEvent[];file:string}>('/ai/logs');setItems(result.items);setFile(result.file);setError('');}
  catch(e){setError((e as Error).message);}finally{setBusy(false);}
 },[]);
 useEffect(()=>{void load();const timer=setInterval(()=>void load(),5000);return()=>clearInterval(timer);},[load]);
 return <section className="settings-panel ai-log-panel"><h2><Terminal size={20}/>后端 AI 调用日志</h2><p className="panel-description">每 5 秒更新。可查看发送给模型的输入、返回正文、token 用量及错误；密钥会被遮盖。完整终端日志同时保存在电脑端。</p><div className="button-row"><button className="btn secondary" onClick={()=>void load()} disabled={busy}><RefreshCw size={15}/>{busy?'读取中…':'刷新日志'}</button><span className="field-help">最近 {items.length} 条</span></div>{file&&<p className="field-help">AI 日志文件：<code>{file}</code></p>}{error&&<p role="alert" className="field-help">读取失败：{error}</p>}{!items.length&&!error&&<p className="field-help">还没有 AI 调用记录。测试模型连接或生成周报后，这里会出现日志。</p>}<div className="ai-log-list">{items.map((item,index)=><details key={`${item.callId||item.at}-${item.stage}-${index}`}><summary><time>{new Date(item.at).toLocaleString('zh-CN')}</time><strong>{item.kind||'AI'} · {item.stage||'event'}</strong>{item.model&&<span>{item.model}</span>}{item.error&&<span className="ai-log-error">{item.error}</span>}</summary><pre>{JSON.stringify(item,null,2)}</pre></details>)}</div></section>;
}
