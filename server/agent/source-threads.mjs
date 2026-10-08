import {sourceProjectId} from '../domain/notes/categories.mjs';
import {refreshMemoryCandidates} from '../domain/memory/memory-lifecycle.mjs';
import {randomUUID,createHash} from 'node:crypto';
import {z} from 'zod';
import {all,get,save,transaction,now,getSetting,setSetting} from '../store.mjs';
import {validate} from '../core/validation.mjs';
const fail=(message,status)=>Object.assign(new Error(message),{status});
export function threadMetadata(id){return get(id,'thread')||get('thread-state:'+id,'thread');}
export function threadUnavailable(id){return threadMetadata(id)?.status==='deleted';}
export function openSourceThread(input){
 const {kind,id}=validate(z.strictObject({kind:z.enum(['note','event']),id:z.string().uuid()}),input);
 return transaction(()=>{
  const source=get(id,kind);if(!source)throw fail('来源已删除，已有讨论历史仍独立保留。',404);
  const key='source-thread:'+kind+':'+id;let mapping=get(key,'sourceThread');
  if(mapping){if(!get(mapping.threadId,'thread')||threadUnavailable(mapping.threadId))throw fail('关联会话已删除或不可用，原关联仍保留，不会自动新建。',410);}
  else{const thread=save('thread',{id:randomUUID(),title:source.title,status:'active',source:{kind,id}});mapping=save('sourceThread',{id:key,sourceKind:kind,sourceId:id,threadId:thread.id});}
  return {threadId:mapping.threadId,projectId:sourceProjectId(source,kind)||'',reference:{kind,id,title:source.title,revision:source.revision}};
 });
}
export function markThreadDeleted(id){const previous=threadMetadata(id);const result=save('thread',{...previous,id:previous?.id||(get(id)?'thread-state:'+id:id),threadId:id,status:'deleted',deletedAt:now()},previous?.revision);setSetting('thread-context:'+id,{text:'',covered:[],signatures:{},version:(getSetting('thread-context:'+id,{version:0}).version||0)+1});setSetting('thread-context-parts:'+id,null);return result;}
const paging=z.strictObject({limit:z.coerce.number().int().min(1).max(100).default(30),cursor:z.string().max(1000).optional()});
export function pageItems(items,query,scope){
 const {limit,cursor}=validate(paging,query);const signature=createHash('sha256').update(JSON.stringify(items)).digest('hex');let start=0;
 if(cursor){let parsed;try{parsed=JSON.parse(Buffer.from(cursor,'base64url').toString());}catch{throw fail('分页标识无效，请重新加载。',400);}
  if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw fail('分页标识无效，请重新加载。',400);
  if(parsed.scope!==scope)throw fail('分页标识不属于当前话题或目录。',400);
  if(parsed.signature!==signature)throw fail('内容已变化，请刷新后继续浏览。',409);
  const index=items.findIndex(item=>item.id===parsed.after);if(index<0)throw fail('分页位置失效，请重新加载。',400);start=index+1;
 }
 const page=items.slice(start,start+limit),nextCursor=start+page.length<items.length?Buffer.from(JSON.stringify({scope,signature,after:page.at(-1).id})).toString('base64url'):null;
 return {items:page,total:items.length,nextCursor};
}
export function threadDirectory(){
 const metadata=new Map(all('thread').map(t=>[t.threadId||t.id,t])),groups=new Map();
 const turns=all('conversation').sort((a,b)=>b.createdAt.localeCompare(a.createdAt)||b.id.localeCompare(a.id));
 for(const c of turns){const id=c.threadId||c.id;if(metadata.get(id)?.status==='deleted'||groups.has(id))continue;groups.set(id,{id,threadId:id,threadTitle:c.threadTitle||c.query.slice(0,40),query:c.query,createdAt:c.createdAt,project:c.project||'',projectId:c.projectId||'',references:c.references||[]});}
 for(const [id,t] of metadata){if(t.status==='deleted'||groups.has(id))continue;const source=t.source?get(t.source.id,t.source.kind):null;groups.set(id,{id,threadId:id,threadTitle:t.title||'来源讨论',query:'',createdAt:t.createdAt,project:'',references:source?[{id:source.id,kind:t.source.kind,title:source.title,revision:source.revision}]:[]});}
 return [...groups.values()].sort((a,b)=>b.createdAt.localeCompare(a.createdAt)||b.id.localeCompare(a.id));
}
export function installSourceThreads(app){
 app.post('/api/source-threads',(req,res)=>res.json(openSourceThread(req.body)));
 app.get('/api/threads',(req,res)=>res.json(pageItems(threadDirectory(),req.query,'directory')));
 app.get('/api/threads/:id/turns',(req,res)=>{
  refreshMemoryCandidates(req.params.id);
  if(threadUnavailable(req.params.id))throw fail('会话已删除。',410);
  const items=all('conversation').filter(c=>(c.threadId||c.id)===req.params.id).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)||b.id.localeCompare(a.id));
  if(!items.length&&!get(req.params.id,'thread'))throw fail('会话不存在或已删除。',404);
  res.json(pageItems(items,req.query,'turns:'+req.params.id));
 });
}
