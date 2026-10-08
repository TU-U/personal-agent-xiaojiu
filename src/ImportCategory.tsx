import {contractGet} from './api';
import {useEffect,useState} from 'react';

import {ErrorBanner} from './components';
export default function ImportCategory({value,onChange,disabled=false}:{value:string;onChange:(id:string)=>void;disabled?:boolean}){
 const [items,setItems]=useState<{id:string;name:string}[]>([]),[error,setError]=useState(''),[attempt,setAttempt]=useState(0);
 useEffect(()=>{let active=true;void contractGet('getCategories','/categories').then(r=>{if(active){setItems(r.items);setError('');}}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[attempt]);
 return <><label>导入记录类别<select aria-label="导入记录类别" value={value} disabled={disabled} onChange={e=>onChange(e.target.value)}><option value="">由 AI 自动分类</option>{items.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><ErrorBanner message={error}/>{error&&<button type="button" className="btn secondary" disabled={disabled} onClick={()=>setAttempt(v=>v+1)}>重试加载类别</button>}</>;
}
