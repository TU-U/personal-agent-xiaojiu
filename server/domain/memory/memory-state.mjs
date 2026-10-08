import {memoryOperation} from './memory-operation.mjs';
import {memoryScopeFields,memoryScope,requireMemoryScope} from './memory-scope.mjs';
import {requireMemorySource,memoryPrimarySource} from './memory-source.mjs';
import {z} from 'zod';
import {all,get,save,transaction,getSetting} from '../../store.mjs';
import {validate} from '../../core/validation.mjs';
import {findMemoryConflict} from '../../ai/engine.mjs';
const ref=z.strictObject({id:z.string().min(1),revision:z.number().int().positive()});
const patchSchema=z.strictObject({reviewedSource:z.strictObject({kind:z.enum(['note','event','libraryFile','conversation']),id:z.string().min(1),revision:z.number().int().positive()}).optional(),opId:z.string().min(8).max(100).optional(),...memoryScopeFields,revision:z.number().int().positive(),content:z.string().trim().min(1).max(2000).optional(),scope:z.enum(['通用','周报','文章']).optional(),status:z.enum(['candidate','active','paused','rejected']).optional(),replace:z.array(ref).max(100).optional()});
const fail=(message,status=409,current)=>Object.assign(new Error(message),{status,current});
const snapshot=()=>JSON.stringify(all('memory').filter(m=>m.status==='active').map(m=>[m.id,m.revision]).sort());
function sourceState(memory){
 requireMemorySource(memory);
 requireMemoryScope(memory);
 const refs=[memoryPrimarySource(memory),memory.sourceId?{kind:'note',id:memory.sourceId}:null,memory.sourceConversationId?{kind:'conversation',id:memory.sourceConversationId}:null].filter(Boolean);
 return JSON.stringify(refs.map(ref=>[ref.kind,ref.id,get(ref.id,ref.kind)?.revision]));
}
export async function patchMemory(id,input,{check=findMemoryConflict}={}){
 const {opId,...body}=validate(patchSchema,input),operation=memoryOperation('patch:'+id,opId,body);
 if(operation.cached)return operation.unwrap(operation.cached);
 const old=get(id,'memory');
 if(!old)throw fail('记忆不存在。',404);
 if(old.revision!==body.revision)throw fail('记忆已变化，请刷新后重试。',409,{memory:old});
 let sourcePatch={};
 if(body.reviewedSource){
  const ref=body.reviewedSource,original=memoryPrimarySource(old),source=get(ref.id,ref.kind);
  if(!original||original.kind!==ref.kind||original.id!==ref.id||(old.sourceId&&(ref.kind!=='note'||old.sourceId!==ref.id)))throw fail('只能核对这条记忆原来关联的来源，不能替换来源。',400);
  if(!source||source.revision!==ref.revision)throw fail('核对期间来源已变化，请重新打开来源核对。');
  sourcePatch={sourceRevision:ref.revision,sourceRef:{...ref}};
  requireMemorySource({...old,...sourcePatch});
 }
 const content=body.content??old.content,scope=body.scope??old.scope;
 const oldRange=memoryScope(old),range={scopeKind:body.scopeKind??oldRange.scopeKind,scopeId:body.scopeId??oldRange.scopeId};
 const changed=!!body.reviewedSource||content!==old.content||scope!==old.scope||range.scopeKind!==oldRange.scopeKind||range.scopeId!==oldRange.scopeId;
 if(changed)requireMemoryScope({...range,scope});
 if(changed){
  if(body.replace?.length||body.status==='active')throw fail('修改内容后需要先保存候选，再确认启用。',400);
  return operation.commit(()=>{
   if(old.status==='active'){
    const {id:priorId,revision,createdAt,updatedAt,...data}=old;
    return save('memory',{...data,...range,content,title:content.slice(0,50),scope,status:'candidate',supersedesId:priorId,supersedesRevision:revision,conflictReview:[],...sourcePatch});
   }
   return save('memory',{...old,...range,content,title:content.slice(0,50),scope,status:'candidate',conflictReview:[],...sourcePatch},old.revision);
  });
 }
 const status=body.status||old.status;
 if(status!=='active'){
  if(body.replace?.length)throw fail('只有确认启用时才能替代冲突记忆。',400);
  return operation.commit(()=>save('memory',{...old,status},old.revision));
 }
 const source=sourceState(old),before=snapshot(),config=getSetting('capabilityConfigRevision',0);
 const replacements=body.replace||[];
 if(new Set(replacements.map(r=>r.id)).size!==replacements.length)throw fail('不能重复选择替代记忆。',400);
 for(const replacement of replacements){
  const checked=old.conflictReview?.find(r=>r.id===replacement.id&&r.revision===replacement.revision),current=get(replacement.id,'memory');
  if(!checked||!current||current.status!=='active'||current.revision!==replacement.revision)throw fail('替代对象未经过当前候选的冲突检查，或已经变化。');
 }
 if(old.supersedesId){const prior=get(old.supersedesId,'memory');if(!prior||prior.revision!==old.supersedesRevision||prior.status!=='active')throw fail('待更正的旧记忆已变化，请重新编辑。');}
 const exclude=new Set([old.id,old.supersedesId,...replacements.map(r=>r.id)]);
 const active=all('memory').filter(m=>m.status==='active'&&!exclude.has(m.id));
 const conflict=await check(content,active,{scope,scopeKind:old.scopeKind||'global',scopeId:old.scopeId||''});
 const result=operation.commit(()=>{
  const current=get(id,'memory');
  if(!current||current.revision!==old.revision||snapshot()!==before||sourceState(old)!==source||getSetting('capabilityConfigRevision',0)!==config)throw fail('检查期间记忆、来源或模型配置已变化，请重新确认。');
  if(conflict){
   if(!active.some(m=>m.id===conflict.id&&m.revision===conflict.revision))throw fail('冲突检查返回了失效对象。',502);
   const item={id:conflict.id,revision:conflict.revision,content:conflict.content,kind:conflict.conflictKind||'contradiction',reason:conflict.conflictReason||'与已有记忆冲突，请核对。'};
   const conflictReview=[...(old.conflictReview||[]).filter(r=>r.id!==item.id),item];
   const memory=save('memory',{...old,conflictReview},old.revision);
   return {conflict:true,memory,conflicts:conflictReview};
  }
  for(const targetId of new Set([...replacements.map(r=>r.id),...(old.supersedesId?[old.supersedesId]:[])])){
   const target=get(targetId,'memory');save('memory',{...target,status:'paused',supersededBy:old.id,decisionReason:'用户确认由新记忆替代'},target.revision);
  }
  const primary=memoryPrimarySource(old),sourceRevision=primary?get(primary.id,primary.kind).revision:undefined;
  return save('memory',{...old,status:'active',confirmedAt:new Date().toISOString(),...(primary?{sourceRef:{...primary,revision:sourceRevision},sourceRevision}:{}),conflictReview:[],supersedesIds:[...new Set([...(old.supersedesIds||[]),...replacements.map(r=>r.id),...(old.supersedesId?[old.supersedesId]:[])])],supersedesId:null,supersedesRevision:null},old.revision);
 });
 if(result.conflict)throw fail('发现记忆冲突，请核对新旧内容后选择。',409,result);
 return result;
}

const createSchema=z.strictObject({opId:z.string().min(8).max(100).optional(),...memoryScopeFields,content:z.string().trim().min(1).max(2000),scope:z.enum(['通用','周报','文章']),sourceId:z.string().min(1).nullable().optional()});
export function createMemory(input){
 const {opId,...body}=validate(createSchema,input),operation=memoryOperation('create',opId,body);
 if(operation.cached)return operation.unwrap(operation.cached);
 const range=requireMemoryScope(body);
 requireMemorySource(body);
 return operation.commit(()=>save('memory',{...body,...range,title:body.content.slice(0,50),status:'candidate',sourceId:body.sourceId||null,sourceRevision:body.sourceId?get(body.sourceId,'note').revision:undefined,sample:false}));
}
