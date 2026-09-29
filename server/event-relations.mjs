import {z} from 'zod';
import {all,get} from './store.mjs';
import {validate} from './validation.mjs';
const kind=z.enum(['event','workTask']),id=z.string().min(1).max(100);
const fail=message=>Object.assign(new Error(message),{status:422});
export function validateEventRelations(data,eventId){
 for(const [field,type,label] of [['relatedEventIds','event','关联要事'],['relatedTaskIds','workTask','关联任务']]){
  const ids=data[field]===undefined?[]:data[field];
  if(!Array.isArray(ids)||ids.length>10||ids.some(value=>typeof value!=='string'||!value||value.length>100))throw fail(label+'选择无效，最多10项。');
  if(new Set(ids).size!==ids.length)throw fail(label+'存在重复编号，请移除重复选项。');
  for(const value of ids){if(type==='event'&&value===eventId)throw fail('要事不能关联自身：'+value);if(!get(value,type))throw fail(label+'已删除或失效，请移除后保存：'+value);}
 }
 return {relatedEventIds:data.relatedEventIds??[],relatedTaskIds:data.relatedTaskIds??[]};
}
export function installEventRelations(app){
 app.get('/api/event-references',(req,res)=>{
  const query=validate(z.strictObject({kind,q:z.string().max(200).default(''),excludeId:id.optional(),offset:z.coerce.number().int().min(0).default(0),limit:z.coerce.number().int().min(1).max(50).default(20)}),req.query);
  const items=all(query.kind).filter(item=>(query.kind!=='event'||item.id!==query.excludeId)&&(!query.q||(item.title||'').toLocaleLowerCase().includes(query.q.toLocaleLowerCase())));
  res.json({items:items.slice(query.offset,query.offset+query.limit).map(item=>({id:item.id,title:item.title||'未命名',revision:item.revision,status:item.status})),total:items.length});
 });
 app.post('/api/event-references/resolve',(req,res)=>{
  const body=validate(z.strictObject({kind,ids:z.array(id).max(100),excludeId:id.optional()}),req.body);
  res.json({items:body.ids.map(id=>{const item=get(id,body.kind),invalid=body.kind==='event'&&id===body.excludeId?'不能关联自身':!item?'来源已删除或失效':'';return {id,title:item?.title||id,revision:item?.revision||null,invalid};})});
 });
}
