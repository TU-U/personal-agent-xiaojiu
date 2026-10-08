import {noteReadableText} from '../shared/source-content.mjs';
import {all,get,save} from '../../store.mjs';
// Content provenance is checked from SQLite at use time; stale vectors are not authority.
export function memorySourceIssue(memory){
 const refs=[];
 if(memory.sourceId)refs.push({kind:'note',id:memory.sourceId,revision:memory.sourceRevision});
 if(memory.sourceRef){
  const ref=memory.sourceRef;
  if(typeof ref!=='object'||!['note','event','libraryFile','conversation'].includes(ref.kind)||typeof ref.id!=='string'||!ref.id)return '记忆来源格式无效。';
  refs.push({...ref,revision:ref.revision??memory.sourceRevision});
 }
 if(memory.sourceConversationId)refs.push({kind:'conversation',id:memory.sourceConversationId});
 for(const ref of refs){
  const source=get(ref.id,ref.kind);if(!source)return '记忆来源已删除或不存在。';
  if(ref.revision!==undefined&&(!Number.isInteger(ref.revision)||ref.revision!==source.revision))return '记忆来源已修改，需要重新核对。';
  if(ref.kind==='libraryFile'&&source.status!=='ready')return '记忆来源资料目前不可用。';
  if(ref.kind==='conversation'){
   const threadId=source.threadId||source.id,thread=get(threadId,'thread')||get('thread-state:'+threadId,'thread');
   if(thread?.status==='deleted')return '记忆来源话题已删除。';
  }
 }
 return '';
}
export const memorySourceValid=memory=>!memorySourceIssue(memory);
export function requireMemorySource(memory){const issue=memorySourceIssue(memory);if(issue)throw Object.assign(new Error(issue+' 候选仍保留，不能启用。'),{status:409});}

// Called inside the source mutation's transaction/savepoint. Legacy sourceId
// memories may lack a sourceRevision, so read-time revision checks alone cannot
// retire their now-outdated facts.
export function markNoteMemoriesChanged(noteId,reason='来源内容已更新，请重新确认'){
 for(const memory of all('memory'))if(memory.status==='active'&&(memory.sourceId===noteId||memory.sourceRef?.kind==='note'&&memory.sourceRef.id===noteId))save('memory',{...memory,status:'candidate',reason},memory.revision);
}

export function memoryPrimarySource(memory){return memory.sourceRef||(memory.sourceId?{kind:'note',id:memory.sourceId}:memory.sourceConversationId?{kind:'conversation',id:memory.sourceConversationId}:null);}
export function memorySourcePreview(id){
 const memory=get(id,'memory');if(!memory)throw Object.assign(new Error('记忆不存在。'),{status:404});
 const ref=memoryPrimarySource(memory);if(!ref)throw Object.assign(new Error('这条记忆没有关联来源。'),{status:422});
 const source=get(ref.id,ref.kind);if(!source)throw Object.assign(new Error('来源已删除，不能重新核对。'),{status:404});
 requireMemorySource({...memory,sourceRevision:source.revision,sourceRef:{...ref,revision:source.revision}});
 const text=ref.kind==='note'?noteReadableText(source):ref.kind==='event'?[source.summary,source.content].filter(Boolean).join('\n\n'):ref.kind==='conversation'?[source.query,source.body].filter(Boolean).join('\n\n'):source.content||'';
 return {memoryId:id,memoryRevision:memory.revision,kind:ref.kind,id:source.id,revision:source.revision,title:source.title||source.threadTitle||'来源对话',text:text.slice(0,100000),truncated:text.length>100000,totalCharacters:text.length};
}
