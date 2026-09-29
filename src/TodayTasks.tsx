import {useEffect,useState} from 'react';
import {api} from './api';
import {PetSourcePrompt} from './PetReminderContext';
import {openPetSource} from './PetReminderTable';
type Item={id:string;taskId:string;title:string;status:string};
export default function TodayTasks(){
 const [items,setItems]=useState<Item[]>([]),[error,setError]=useState('');
 useEffect(()=>{
  let alive=true,epoch=0;
  async function load(){const request=++epoch;try{
   const d=await api<{tasks:{id:string;title:string;status:string}[];runs:{id:string;taskId:string;day:string;status:string}[]}>('/work-tasks');
   const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
   if(alive&&request===epoch){setItems(d.runs.filter(r=>r.day===today&&!['completed','skipped'].includes(r.status)&&d.tasks.some(t=>t.id===r.taskId&&t.status!=='cancelled')).map(r=>({id:r.id,taskId:r.taskId,title:d.tasks.find(t=>t.id===r.taskId)?.title||'',status:r.status})));setError('');}
  }catch(cause){if(alive&&request===epoch)setError((cause as Error).message);}}
  const changed=()=>void load();void load();const timer=setInterval(changed,30000);window.addEventListener('business-changed',changed);
  return()=>{alive=false;++epoch;clearInterval(timer);window.removeEventListener('business-changed',changed);};
 },[]);
 return error?<p role="status">今日任务暂时无法刷新：{error}</p>:items.length?<section className="home-todos" aria-label="今日任务"><h2>今日任务</h2>{items.map(item=><div key={item.id}>
  <button onClick={()=>openPetSource({sourceKind:'workRun',sourceId:item.id,actionTarget:{page:'workTasks',id:item.taskId,runId:item.id}})}><span>{item.title} · {item.status==='review'?'待核对证据':'待完成'}</span></button>
  <PetSourcePrompt kind="workRun" id={item.id}/>
 </div>)}</section>:null;
}
