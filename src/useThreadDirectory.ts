import {useEffect,useRef,useState} from 'react';
import {api} from './api';
import type {Conversation} from './types';
export type ThreadItem=Pick<Conversation,'id'|'threadId'|'threadTitle'|'query'|'createdAt'|'project'|'projectId'|'references'>;
type Page={items:ThreadItem[];total:number;nextCursor:string|null};
export default function useThreadDirectory(revision:number){
 const [items,setItems]=useState<ThreadItem[]>([]),[total,setTotal]=useState(0),[cursor,setCursor]=useState<string|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[attempt,setAttempt]=useState(0);const epoch=useRef(0);
 useEffect(()=>{const generation=++epoch.current;setLoading(true);setError('');void api<Page>('/threads?limit=30').then(r=>{if(epoch.current===generation){setItems(r.items);setTotal(r.total);setCursor(r.nextCursor);}}).catch(e=>{if(epoch.current===generation)setError(e.message);}).finally(()=>{if(epoch.current===generation)setLoading(false);});return()=>{epoch.current++;};},[revision,attempt]);
 async function more(){if(!cursor||loading)return;const generation=epoch.current;setLoading(true);setError('');try{const r=await api<Page>('/threads?limit=30&cursor='+encodeURIComponent(cursor));if(epoch.current===generation){setItems(old=>[...new Map([...old,...r.items].map(t=>[t.id,t])).values()]);setTotal(r.total);setCursor(r.nextCursor);}}catch(e){if(epoch.current===generation)setError((e as Error).message);}finally{if(epoch.current===generation)setLoading(false);}}
 return {items,total,loading,error,hasMore:!!cursor,more,reload:()=>setAttempt(v=>v+1)};
}
