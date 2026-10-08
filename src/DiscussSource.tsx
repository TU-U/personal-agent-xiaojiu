import {contractPost} from './api';
import {useState} from 'react';

import {ErrorBanner} from './components';

export default function DiscussSource({id,kind,onOpened}:{id:string;kind:'note'|'event'|'libraryFile';onOpened?:()=>void}){
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 async function open(){if(busy)return;setBusy(true);setError('');try{const target=await contractPost('postSourceThreads','/source-threads',{id,kind});sessionStorage.setItem('sourceDiscussion',JSON.stringify(target));onOpened?.();location.hash='assistant';window.dispatchEvent(new Event('source-discussion'));}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 return <span><button className="btn secondary" disabled={busy} onClick={()=>void open()}>{busy?'打开讨论…':'与搭子讨论'}</button><ErrorBanner message={error}/></span>;
}
