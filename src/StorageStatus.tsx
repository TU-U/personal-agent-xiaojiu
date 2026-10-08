import {contractGet} from './api';
import type {components} from '../contracts/generated/types';
import {useEffect,useState} from 'react';

import {ErrorBanner} from './components';
type Storage = components['schemas']['StorageStatus'];
const size=(value?:string)=>value===undefined?'未知':(Number(value)/1024**3).toLocaleString('zh-CN',{maximumFractionDigits:1})+' GB';
const state:Record<string,string>={present:'已存在',missing:'尚未创建',linked:'符号链接，未检查目标',unavailable:'无法读取'};
export default function StorageStatus(){
 const [data,setData]=useState<Storage|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[attempt,setAttempt]=useState(0);
 useEffect(()=>{let current=true;setBusy(true);setError('');void contractGet('getSettingsStorage','/settings/storage').then(value=>{if(current)setData(value);}).catch(e=>{if(current)setError(e.message);}).finally(()=>{if(current)setBusy(false);});return()=>{current=false;};},[attempt]);
 return <details><summary>查看数据位置与磁盘空间</summary><div aria-busy={busy}>
 <ErrorBanner message={error}/><button className="btn secondary" disabled={busy} onClick={()=>setAttempt(value=>value+1)}>{busy?'正在读取存储状态…':'刷新存储状态'}</button>
 {data&&<><p>读取时间：{new Date(data.checkedAt).toLocaleString('zh-CN')}{busy||error?'（上次结果）':''}</p><p style={{overflowWrap:'anywhere'}}>数据目录：{data.dataDir}</p>
 <p role="status">{data.disk.available?`磁盘可用 ${size(data.disk.freeBytes)} / 总容量 ${size(data.disk.totalBytes)}`:data.disk.notice}</p><p className="field-help">{data.diskNotice}</p>
 <dl>{data.items.map(item=><div key={item.name}><dt><strong>{item.label}</strong> · {state[item.state]||'未知状态'}</dt><dd style={{marginInlineStart:0,overflowWrap:'anywhere'}}>{item.path}<p>{item.description}</p></dd></div>)}</dl><p>{data.indexNotice}</p></>}
 </div></details>;
}
