import {Link2} from 'lucide-react';
import type {Memory,Note} from './types';
export default function MemoryOrigin({memory,notes,onOpen,onError}:{memory:Memory;notes:Note[];onOpen:(note:Note)=>void;onError:(message:string)=>void}){
 const ref=memory.sourceRef;
 const noteId=memory.sourceId||(ref?.kind==='note'?ref.id:'');
 const note=notes.find(item=>item.id===noteId);
 const conversationId=memory.sourceConversationId||(ref?.kind==='conversation'?ref.id:'');
 const version=ref?.revision??memory.sourceRevision;
 function openConversation(){try{sessionStorage.setItem('memoryDiscussion',JSON.stringify({id:conversationId}));location.hash='assistant';window.dispatchEvent(new Event('memory-discussion'));}catch{onError('无法打开来源会话，请检查浏览器存储是否可用。');}}
 return <div className="memory-origin">{noteId?(note?<button onClick={()=>onOpen(note)}><Link2 size={13}/>{note.title}</button>:<span>来源记录暂不可用 · {noteId.slice(0,8)}</span>):conversationId?<button onClick={openConversation}><Link2 size={13}/>查看来源对话</button>:ref?<span>{ref.kind==='event'?'来源要事':ref.kind==='libraryFile'?'来源文件':'来源'} · {ref.id.slice(0,8)}</span>:<span>由你手动添加</span>}{version!==undefined&&<span> · 来源版本 {version}</span>}</div>;
}
