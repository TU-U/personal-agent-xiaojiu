import {randomUUID} from 'node:crypto';
import {all,get,save,getSetting,setSetting,transaction} from '../../store.mjs';
const key=id=>'memory-turn-count:'+id;
const threadOf=turn=>turn.threadId||turn.id;
function initialize(threadId){
 const known=getSetting(key(threadId),null);if(known!==null)return known;
 const turns=all('conversation').filter(t=>threadOf(t)===threadId&&t.agentRun?.status!=='stopped').sort((a,b)=>a.createdAt.localeCompare(b.createdAt)||a.id.localeCompare(b.id));
 for(const [index,turn] of turns.entries())if(turn.memoryReview==='pending'&&!Number.isInteger(turn.originTurn))save('conversation',{...turn,originTurn:index+1,expiresAfterTurn:index+6,memoryExpiryBasis:'existing-successful-history'},turn.revision);
 setSetting(key(threadId),turns.length);return turns.length;
}
export function memoryCandidateExpired(turn){
 return turn.memoryReview==='expired'||(turn.memoryReview==='pending'&&Number.isInteger(turn.expiresAfterTurn)&&getSetting(key(threadOf(turn)),0)>=turn.expiresAfterTurn);
}
function expire(threadId){
 const count=initialize(threadId);let changed=0;
 for(const turn of all('conversation').filter(t=>threadOf(t)===threadId&&t.memoryReview==='pending'))if(Number.isInteger(turn.expiresAfterTurn)&&count>=turn.expiresAfterTurn){
  save('conversation',{...turn,memoryReview:'expired',memoryExpiredCount:turn.memoryProposals?.length||0,memoryProposals:[],memoryExpiredAtTurn:count,memoryNotice:'这轮未处理的记忆候选已在后续5轮成功对话后过期，未加入长期记忆。'},turn.revision);changed++;
 }
 return changed;
}
export function refreshMemoryCandidates(threadId){return transaction(()=>{
 const ids=threadId?[threadId]:[...new Set(all('conversation').filter(t=>t.memoryReview==='pending').map(threadOf))];
 return ids.reduce((count,id)=>count+expire(id),0);
});}
// Called only inside the successful conversation commit transaction.
export function saveMemoryTurn(data){
 // Budget/cancellation partials are visible history, not successful memory turns.
 if(data.agentRun?.status==='stopped')return save('conversation',{...data,memoryProposals:[],memoryReview:'none'});
 const id=data.id||randomUUID(),threadId=data.threadId||id,count=initialize(threadId)+1;
 setSetting(key(threadId),count);
 const result=save('conversation',{...data,id,threadId,originTurn:count,expiresAfterTurn:count+5,memoryExpiryBasis:'successful-turn-counter'});
 expire(threadId);return result;
}
export function pendingMemoryBatches(){
 return all('conversation').filter(t=>t.memoryReview==='pending'&&!memoryCandidateExpired(t)).map(t=>({id:t.id,threadId:threadOf(t),title:t.threadTitle||t.query?.slice(0,40)||'记忆候选',count:t.memoryProposals?.length||0,revision:t.revision})).filter(t=>t.count);
}
