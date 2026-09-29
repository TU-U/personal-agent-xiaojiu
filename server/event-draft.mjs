import {z} from 'zod';
const schema=z.strictObject({title:z.string().trim().min(1).max(200),summary:z.string().trim().max(3000),tags:z.array(z.string().trim().min(1).max(30)).max(12),project:z.string().trim().max(80),relatedEventIds:z.array(z.unknown()).max(200)});
export function parseEventDraft(raw,{eventId,allowedIds,exists}){
 let value;try{value=JSON.parse(String(raw).trim().replace(/^```(?:json)?\s*([\s\S]*?)\s*```$/,'$1'));}catch{throw Object.assign(new Error('AI 草稿不是有效 JSON，请重试；原输入未更改。'),{status:502});}
 const parsed=schema.safeParse(value);
 if(!parsed.success){const fields={title:'标题',summary:'摘要',tags:'标签',project:'项目',relatedEventIds:'关联建议'};const names=[...new Set(parsed.error.issues.map(issue=>fields[issue.path[0]]||'对象结构或越权字段'))];throw Object.assign(new Error('AI 草稿格式无效：'+names.join('、')+'。请重试；原输入未更改。'),{status:502});}
 const relatedEventIds=[],removedSuggestions=[];
 for(const id of parsed.data.relatedEventIds){
  let reason='';if(typeof id!=='string'||!id)reason='不是有效要事编号';else if(id===eventId)reason='不能关联自身';else if(relatedEventIds.includes(id))reason='重复建议';else if(!allowedIds.has(id))reason='不在本次候选范围';else if(!exists(id))reason='要事已删除或失效';else if(relatedEventIds.length>=10)reason='超出最多10条关联限制';
  if(reason)removedSuggestions.push({id:typeof id==='string'?id:null,reason});else relatedEventIds.push(id);
 }
 return {...parsed.data,relatedEventIds,removedSuggestions};
}
export const eventDraftRequestSchema=z.strictObject({eventId:z.string().min(1).max(100).optional(),noteId:z.string().min(1).max(100).optional(),eventRevision:z.number().int().positive().optional(),noteRevision:z.number().int().positive().optional()}).refine(value=>!!value.eventId||!!value.noteId);
