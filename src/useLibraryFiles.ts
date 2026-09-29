import type {FileIndexState} from './LibraryIndexStatus';
import {useCallback,useEffect,useRef,useState} from 'react';
import {api} from './api';
export type LibraryFileRow={id:string;revision:number;title:string;sourcePath:string;status:string;tags?:string[];projectId?:string;project?:string;reason:string;parse?:{state:string;encoding?:string;notice?:string;error?:string;pages?:number};index?:FileIndexState;availableActions?:('copy'|'skip')[];error?:string;chunks?:number;copyName?:string;content?:string};
type Page={items:LibraryFileRow[];total:number;nextCursor:string|null};
export function useLibraryFiles(filters:string){
 const [files,setFiles]=useState<LibraryFileRow[]>([]),[total,setTotal]=useState(0),[nextCursor,setNextCursor]=useState<string|null>(null),[loading,setLoading]=useState(false),[error,setError]=useState('');
 const epoch=useRef(0),busy=useRef(false),currentFilters=useRef(filters);currentFilters.current=filters;
 const load=useCallback(async(cursor?:string)=>{
  if(filters!==currentFilters.current||cursor&&busy.current)return;
  const ticket=cursor?epoch.current:++epoch.current;
  busy.current=true;setLoading(true);setError('');
  try{
   const query=new URLSearchParams(filters);query.set('limit','30');if(cursor)query.set('cursor',cursor);
   const page=await api<Page>('/library/files?'+query);
   if(ticket!==epoch.current)return;
   setFiles(old=>cursor?[...new Map([...old,...page.items].map(item=>[item.id,item])).values()]:page.items);
   setTotal(page.total);setNextCursor(page.nextCursor);
  }catch(cause){if(ticket===epoch.current)setError((cause as Error).message);}
  finally{if(ticket===epoch.current){busy.current=false;setLoading(false);}}
 },[filters]);
 useEffect(()=>{setFiles([]);setTotal(0);setNextCursor(null);void load();return()=>{epoch.current++;busy.current=false;};},[load]);
 return {files,total,nextCursor,loading,error,refresh:()=>load(),more:()=>nextCursor?load(nextCursor):Promise.resolve()};
}
