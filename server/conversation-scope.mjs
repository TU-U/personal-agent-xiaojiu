import {all,get} from './store.mjs';
import {sourceProjectId} from './categories.mjs';
export function conversationScope(input,threadId){
 let projectId=input.projectId;
 if(projectId!==undefined&&(typeof projectId!=='string'||projectId.length>200))throw Object.assign(new Error('项目标识无效。'),{status:400});
 if(projectId===undefined){
  const latest=all('conversation').filter(t=>(t.threadId||t.id)===threadId).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)||b.id.localeCompare(a.id))[0];
  const thread=get(threadId,'thread');const source=thread?.source?get(thread.source.id,thread.source.kind):null;
  projectId=(!input.project?latest?.projectId:'')||(!input.project&&source?sourceProjectId(source,thread.source.kind):'')||'';
 }
 if(projectId&&!get(projectId,'project'))throw Object.assign(new Error('所选项目已删除或失效，请更换资料范围。'),{status:422});
 return {threadId,projectId,project:projectId?'':input.project||''};
}
