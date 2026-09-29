import {get} from './store.mjs';
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
