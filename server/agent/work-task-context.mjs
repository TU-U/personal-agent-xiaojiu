import {z} from 'zod';
import {get} from '../store.mjs';
import {validate} from '../core/validation.mjs';
import {assembleThreadContext,threadHistorySignature} from './thread-context.mjs';
import {threadMetadata,threadUnavailable} from './source-threads.mjs';
import {conversationSourceIssue} from './conversation-source-state.mjs';
import {conversationSourceExcerpt} from './conversation-source-excerpt.mjs';
const ref=z.strictObject({id:z.string().min(1).max(100),kind:z.enum(['note','event','libraryFile']),revision:z.number().int().positive()});
const schema=z.strictObject({threadId:z.string().max(100).default(''),references:z.array(ref).max(5).default([]).refine(rows=>new Set(rows.map(r=>r.kind+':'+r.id)).size===rows.length,'引用重复')});
const fail=message=>Object.assign(new Error(message),{status:409});
export function workTaskContext(body){
 const input=validate(schema,{threadId:body.threadId||'',references:body.references},{label:'任务来源'});
 const sources=input.references.map(ref=>{const item=get(ref.id,ref.kind),issue=conversationSourceIssue(item,ref.kind);if(issue)throw fail(`${ref.kind}/${ref.id}：${issue}`);if(item.revision!==ref.revision)throw fail(`引用「${item.title}」版本已变化，请重新选择。`);return {...ref,title:item.title,...conversationSourceExcerpt(item,ref.kind,body.goal)};});
 let history=[],summary='',usage=null;
 if(input.threadId){const assembled=assembleThreadContext(input.threadId);if(!assembled.history.length&&!assembled.usage.coveredIds.length&&!threadMetadata(input.threadId))throw fail('来源话题不存在，请重新选择。');history=assembled.history.map(t=>({id:t.id,query:t.query,answer:t.body}));summary=assembled.text;usage=assembled.usage;}
 return {threadId:input.threadId,sources,history,summary,usage,notice:'话题摘要及助手答复仅作背景，不等于用户已确认事实。引用片段保留生成计划时的版本。'};
}
export function assertWorkTaskContext(context){
 for(const ref of context.sources){const current=get(ref.id,ref.kind);if(conversationSourceIssue(current,ref.kind)||current.revision!==ref.revision)throw fail(`生成计划期间引用「${ref.title}」已变化，请重新核对。`);}
 if(context.threadId&&(threadUnavailable(context.threadId)||threadHistorySignature(context.threadId)!==context.usage.historyRevision))throw fail('生成计划期间话题背景已变化，请重新核对。');
}
