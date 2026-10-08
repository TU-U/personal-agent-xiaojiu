import {contractPost} from './api';
import {contractGet} from './api';
import type {components} from '../contracts/generated/types';
import {useEffect,useState} from 'react';

import {ErrorBanner,Spinner} from './components';
type Pricing = components['schemas']['ResearchSearchPricing'];
export default function ResearchSearchPricing(){
 const [config,setConfig]=useState<Pricing|null>(null),[cost,setCost]=useState(''),[until,setUntil]=useState(''),[ack,setAck]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 async function load(){try{const value=await contractGet('getResearchSearchSettings','/research-search-settings');setConfig(value);setCost(value.maxCostMicros===undefined?'':(value.maxCostMicros/1e6).toFixed(6));if(value.reviewUntil){const date=new Date(value.reviewUntil);setUntil(new Date(date.getTime()-date.getTimezoneOffset()*60000).toISOString().slice(0,16));}else setUntil('');setAck(false);setError('');}catch(e){setError((e as Error).message);}}
 useEffect(()=>{void load();},[]);
 async function save(enabled:boolean){if(enabled&&!ack){setError('请先确认已核对搜索费用。');return;}if(!config)return;setBusy(true);setError('');setMessage('');try{
  if(enabled&&!/^\d+(?:\.\d{1,6})?$/.test(cost))throw new Error('请输入最多6位小数的人民币金额。');
  const parts=cost.split('.'),maxCostMicros=Number(parts[0]||0)*1e6+Number((parts[1]||'').padEnd(6,'0'));
  const value=await contractPost('postResearchSearchSettings','/research-search-settings',enabled?{revision:config.revision,enabled:true,maxCostMicros,reviewUntil:new Date(until).toISOString(),acknowledged:true as const}:{revision:config.revision,enabled:false});setConfig(value);setAck(false);setMessage(enabled?'费用上限已保存；调研仍需先确认计划。':'已停用调研自动付费搜索，仍可使用知识回答和网页接力。');
 }catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 return <details><summary>调研自动搜索的人民币费用上限</summary><p>先保存搜索密钥，再按该账户的价格、汇率及费用核对每次请求的人民币上限。系统以此预留和保守计费，不把免费额度或中断请求当作退款，也不把这个数值当实际账单。</p><ErrorBanner message={error}/>{message&&<p role="status">{message}</p>}{config?.notice&&<p>{config.notice}</p>}<button type="button" className="btn text" disabled={busy} onClick={()=>void load()}>重新读取搜索费用设置</button>
 {!config?<Spinner label="读取搜索费用配置…"/>:<form onSubmit={e=>{e.preventDefault();void save(true);}}><fieldset disabled={busy} style={{border:0,padding:0,minWidth:0}}><label>每次搜索费用上限（人民币）<input required inputMode="decimal" value={cost} onChange={e=>{setCost(e.target.value);setAck(false);}} placeholder="按账户实际计费核对后填写"/></label><label>价格复核期限（未来31天内）<input required type="datetime-local" value={until} onChange={e=>{setUntil(e.target.value);setAck(false);}}/></label><label className="check-row"><input type="checkbox" required checked={ack} onChange={e=>setAck(e.target.checked)}/><span>我已核对当前搜索账户的人民币单次费用上限</span></label><p>更换密钥或超过复核期限后，调研会停止新付费搜索，继续使用已有材料和模型知识。</p><button className="btn primary" disabled={busy||!ack}>保存已核对的搜索费用</button>{config.enabled&&<button type="button" className="btn text" onClick={()=>void save(false)}>停用调研付费搜索</button>}</fieldset></form>}</details>;
}
