import {requireMemorySource} from './memory-source.mjs';
import {requireMemoryScope,memoryScopesOverlap,memoryScopeFields} from './memory-scope.mjs';
import {refreshMemoryCandidates,memoryCandidateExpired} from './memory-lifecycle.mjs';
import {createHash,randomUUID} from 'node:crypto';
import {z} from 'zod';
import {all,get,save,transaction,db,getSetting} from '../../store.mjs';
import {validate} from '../../core/validation.mjs';
import {findMemoryConflict} from '../../ai/engine.mjs';
const schema=z.strictObject({revision:z.number().int().positive(),selected:z.array(z.strictObject({index:z.number().int().min(0),keep:z.enum(['new','existing']).optional()})).max(3)});
const fail=(message,status=409,current)=>Object.assign(new Error(message),{status,current});
const snapshot=()=>JSON.stringify(all('memory').filter(m=>m.status==='active').map(m=>[m.id,m.revision]).sort());
export async function reviewMemoryBatch(id,input,{check=findMemoryConflict}={}){
 const body=validate(schema,input),operation='memory-review:'+createHash('sha256').update(JSON.stringify({id,...body,selected:[...body.selected].sort((a,b)=>a.index-b.index)})).digest('hex');
 const initial=get(id,'conversation');if(initial)refreshMemoryCandidates(initial.threadId||initial.id);
 const turn=get(id,'conversation');if(!turn)throw fail('会话轮次不存在。',404);
 const cached=db.prepare('SELECT result FROM operations WHERE id=?').get(operation);if(cached)return JSON.parse(cached.result);
 if(memoryCandidateExpired(turn))throw fail('这轮记忆候选已过期，不能再确认。',409,turn);
 if(turn.memoryReview!=='pending'||turn.revision!==body.revision)throw fail('记忆候选已变化或已处理，请刷新后确认。',409,turn);
 if(new Set(body.selected.map(s=>s.index)).size!==body.selected.length||body.selected.some(s=>s.index>=turn.memoryProposals.length))throw fail('记忆选择无效。',400);
 const chosen=body.selected.map(s=>({...s,proposal:turn.memoryProposals[s.index]}));
 for(const item of chosen)if(item.keep!=='existing')requireMemoryScope(item.proposal);
 const before=snapshot(),config=getSetting('capabilityConfigRevision',0);
 const assertCurrent=()=>{requireMemorySource({sourceConversationId:turn.id});for(const item of chosen)if(item.keep!=='existing')requireMemoryScope(item.proposal);const current=get(id,'conversation');if(!current||current.revision!==turn.revision||current.memoryReview!=='pending'||memoryCandidateExpired(current)||snapshot()!==before||getSetting('capabilityConfigRevision',0)!==config)throw fail('检查期间记忆或候选已变化，请重新确认。');};
 const replacements=new Map(),kept=new Set();
 for(const item of chosen){
  const refs=item.proposal.conflictCheckVersion===1?item.proposal.conflictRefs||[]:[];
  if(item.proposal.conflictId&&!item.keep)throw fail('请选择保留新记忆还是已有记忆。',400);
  if(item.keep==='existing'){
   if(!item.proposal.conflictId)throw fail('该候选没有可保留的已有记忆。',400);
   const old=get(item.proposal.conflictId,'memory');if(!old||old.status!=='active'||old.revision!==item.proposal.conflictRevision)throw fail('已有记忆已变化，请刷新后核对。');
   for(const ref of refs.length?refs:[old]){
    const current=get(ref.id,'memory');
    if(!current||current.status!=='active'||current.revision!==ref.revision)throw fail('已有冲突记忆已变化，请重新核对或编辑候选后再确认。');
    kept.add(ref.id);
   }
   continue;
  }
  for(const ref of refs){const current=get(ref.id,'memory');if(!current||current.status!=='active'||current.revision!==ref.revision)throw fail('冲突记忆已变化，请重新核对。');replacements.set(ref.id,ref);}
 }
 if([...kept].some(id=>replacements.has(id)))throw fail('所选候选同时要求保留和替代同一记忆，请取消其中一项。');
 const accepted=[];
 for(const item of chosen.filter(s=>s.keep!=='existing')){
  const range=requireMemoryScope(item.proposal);
  const active=all('memory').filter(m=>m.status==='active'&&!replacements.has(m.id)&&memoryScopesOverlap(m,range));
  const peers=accepted.filter(m=>memoryScopesOverlap(m,range));
  const conflict=await check(item.proposal.content,[...active,...peers],range);
  if(conflict){
   const peer=peers.find(m=>m.id===conflict.id);
   if(peer)throw fail(`本批第${peer.batchIndex+1}条与第${item.index+1}条候选存在冲突，请只选一条或先修改内容。`);
   if(!active.some(m=>m.id===conflict.id&&m.revision===conflict.revision))throw fail('冲突检查返回无效对象。',502);
   const ref={id:conflict.id,revision:conflict.revision,content:conflict.content,reason:conflict.conflictReason||'同一事实存在冲突，请核对。',kind:conflict.conflictKind||'contradiction'};
   const current=transaction(()=>{assertCurrent();const memoryProposals=turn.memoryProposals.map((p,i)=>i===item.index?{...p,conflictId:ref.id,conflictRevision:ref.revision,conflictContent:ref.content,conflictCheckVersion:1,conflictRefs:[...(p.conflictCheckVersion===1?p.conflictRefs||[]:[]).filter(r=>r.id!==ref.id),ref]}:p);return save('conversation',{...turn,memoryProposals},turn.revision);});
   throw fail('发现记忆冲突，请核对全部冲突依据后重新选择。',409,current);
  }
  accepted.push({id:randomUUID(),content:item.proposal.content,revision:1,status:'active',...range,batchIndex:item.index});
 }
 return transaction(()=>{
  const prior=db.prepare('SELECT result FROM operations WHERE id=?').get(operation);if(prior)return JSON.parse(prior.result);
  assertCurrent();
  for(const ref of replacements.values()){const old=get(ref.id,'memory');save('memory',{...old,status:'paused',decisionReason:'用户确认采用本轮新记忆',supersededByBatch:turn.id},old.revision);}
  const result=save('conversation',{...turn,memoryProposals:[],memoryReview:'reviewed',memoryNotice:`已保留 ${accepted.length} 条新记忆，其余候选已丢弃。`},turn.revision);
  for(const {batchIndex,...memory} of accepted)save('memory',{...memory,title:memory.content.slice(0,50),sourceConversationId:turn.id,sourceRef:{kind:'conversation',id:turn.id,revision:result.revision},sourceRevision:result.revision,candidateBatchId:turn.id,confirmedAt:new Date().toISOString(),sample:false});
  db.prepare('INSERT INTO operations(id,result) VALUES(?,?)').run(operation,JSON.stringify(result));return result;
 });
}

const editSchema=z.strictObject({...memoryScopeFields,revision:z.number().int().positive(),content:z.string().trim().min(1).max(2000),scope:z.enum(['通用','周报','文章']).default('通用')});
export function editMemoryProposal(id,index,input){
 const body=validate(editSchema,input),range=requireMemoryScope(body);
 if(!Number.isInteger(index)||index<0)throw fail('候选序号无效。',400);
 const initial=get(id,'conversation');if(initial)refreshMemoryCandidates(initial.threadId||initial.id);
 return transaction(()=>{
  const turn=get(id,'conversation');if(!turn)throw fail('会话不存在或已删除。',404);
  if(memoryCandidateExpired(turn))throw fail('这轮候选已过期，不能再修改。');
  if(turn.memoryReview!=='pending'||turn.revision!==body.revision)throw fail('候选已变化，请刷新后核对；本次编辑未保存。',409,turn);
  if(index>=turn.memoryProposals.length)throw fail('候选序号无效。',400);
  const memoryProposals=turn.memoryProposals.map((proposal,i)=>i===index?{content:body.content,...range,editedByUser:true}:proposal);
  return save('conversation',{...turn,memoryProposals},turn.revision);
 });
}
