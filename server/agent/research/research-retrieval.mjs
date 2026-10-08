import {sourceReading} from '../../domain/shared/source-content.mjs';
import {evidenceTimeAvailable} from './research-limits.mjs';
import {performance} from 'node:perf_hooks';
import {get} from '../../store.mjs';
import {searchIndex,retrievalConfig} from '../../retrieval/retrieval.mjs';
import {sourceApplies} from '../../retrieval/retrieval-scope.mjs';
import {researchPlanHash} from './research-approval.mjs';
const fail=message=>Object.assign(new Error(message),{status:409,code:'RESEARCH_STALE'});
const local=value=>{try{const u=new URL(value);return ['http:','https:'].includes(u.protocol)&&['127.0.0.1','[::1]'].includes(u.hostname)&&!u.username&&!u.password;}catch{return false;}};
export function researchRetrievalAvailable(c){return c.indexProfile==='qwen3-local-v1'&&c.model==='qwen3-embedding-0.6b'&&local(c.embedding)&&local(c.qdrant);}
export function validateRetrievedEvidence(evidence,task){
 for(const e of evidence.filter(e=>e.selectionMethod==='hybrid_search')){
  if(!['note','event','memory','libraryFile'].includes(e.kind))throw fail('检索来源类型无效。');
  const source=get(e.sourceId,e.kind),options={threadId:task.threadId||''};
  if(!source||source.revision!==e.revision||!sourceApplies(source,e.kind,options)||e.kind==='libraryFile'&&!source.copyName)throw fail(`检索来源「${e.title}」已修改、删除或失效，请重新核对。`);
  const reading=sourceReading(source,e.kind),text=e.sourceField==='transcriptContent'?reading.text:source[e.sourceField];
  if(!['content','summary','transcriptContent'].includes(e.sourceField)||e.sourceField==='transcriptContent'&&reading.field!=='transcriptContent'||typeof text!=='string'||!Number.isInteger(e.start)||!Number.isInteger(e.end)||e.start<0||e.end<=e.start||e.end>text.length||text.slice(e.start,e.end)!==e.quote)throw fail(`检索来源「${e.title}」的位置与原文不一致。`);
 }
}
// Only the installed local Qwen/Qdrant contract is zero API cost. A custom
// remote/proxy embedding endpoint needs a price contract before research use.
export async function retrieveResearchEvidence({task,ledger,signal,assertActive,config=retrievalConfig(),search=searchIndex}){
 if(!researchRetrievalAvailable(config))return {evidence:[],notice:'自动语义取材未启用：需要已配置的本机 Qwen/Qdrant；未知费用接口未调用。已选材料仍按原文取材。'};
 const evidence=[],notices=[],version=task.researchReportVersion||1;
 for(const [index,question] of task.researchBrief.questions.entries()){
  assertActive();signal?.throwIfAborted();
  const query=task.researchBrief.topic+'\n'+question,options={limit:4,threadId:task.threadId||''};
  const stepKey=`hybrid-evidence:${version}:${task.researchAttempt||1}:Q${index+1}`,requestHash=researchPlanHash({query,options,config}),old=ledger.attempt(task.id,stepKey);
  const maxTimeMs=old?.max_time_ms??Math.min(15000,evidenceTimeAvailable(ledger.snapshot(task.id)));
  let reservation;
  try{if(maxTimeMs<=0)throw Object.assign(new Error('取材时间额度不足，保留报告收束时间。'),{code:'RESEARCH_BUDGET'});reservation=ledger.reserve({runId:task.id,stepKey,requestHash,priceVersion:'local-qwen-qdrant-free-v1',maxCostMicros:0,maxTimeMs});}
  catch(error){if(error.code!=='RESEARCH_BUDGET')throw error;notices.push('预算不足，停止补充检索并保留已取得材料。');break;}
  let result;
  if(reservation.replay){
   if(reservation.attempt.state==='failed')throw Object.assign(new Error(reservation.attempt.error),{code:reservation.attempt.result?.failureCode||'RESEARCH_RETRIEVAL'});
   result=reservation.attempt.result;
  }else{
   const start=performance.now(),deadline=new AbortController(),timeout=Object.assign(new Error('本次语义检索超时，保留已有材料。'),{code:'RESEARCH_RETRIEVAL_TIMEOUT'});
   const timer=setTimeout(()=>deadline.abort(timeout),maxTimeMs);timer.unref();
   const combined=signal?AbortSignal.any([signal,deadline.signal]):deadline.signal;
   try{
    const hits=await search(query,options,config,{readOnly:true,seed:false,signal:combined});
    combined.throwIfAborted();assertActive();
    const sources=[];
    for(const hit of hits){
     const source=get(hit.id,hit.kind);if(!source||source.revision!==hit.revision)throw fail('检索期间来源已变化。');
     if(hit.kind==='libraryFile'&&!source.copyName)continue;
     const {field:sourceField,text}=sourceReading(source,hit.kind);
     sources.push({sourceId:source.id,kind:hit.kind,title:source.title,revision:source.revision,sourceField,quote:hit.content,start:hit.start,end:hit.end,total:text.length,truncated:hit.start!==0||hit.end!==text.length,evidenceType:'original',selectionMethod:'hybrid_search',matchedQuestions:['Q'+(index+1)],retrievedAt:new Date().toISOString()});
    }
    validateRetrievedEvidence(sources,task);
    result={evidence:sources,notice:hits.retrievalInfo?.notice||''};
    ledger.settle({attemptId:reservation.attempt.id,actualCostMicros:0,elapsedMs:Math.ceil(performance.now()-start),result});
   }catch(error){
    assertActive();signal?.throwIfAborted();
    if(error.code==='RESEARCH_RETRIEVAL_TIMEOUT'||[429,503].includes(error.status)){
     result={evidence:[],notice:`Q${index+1} 自动语义取材不可用：${error.message}；保留已有材料，未假称检索成功。`};
     ledger.settle({attemptId:reservation.attempt.id,actualCostMicros:0,elapsedMs:Math.ceil(performance.now()-start),result});
    }else{ledger.settle({attemptId:reservation.attempt.id,actualCostMicros:0,elapsedMs:Math.ceil(performance.now()-start),error:String(error.message).slice(0,1000),result:{failureCode:error.code||'RESEARCH_RETRIEVAL'}});throw error;}
   }finally{clearTimeout(timer);}
  }
  validateRetrievedEvidence(result.evidence,task);
  for(const source of result.evidence){const old=evidence.find(e=>e.sourceId===source.sourceId&&e.revision===source.revision&&e.start===source.start&&e.end===source.end);if(old)old.matchedQuestions=[...new Set([...old.matchedQuestions,...source.matchedQuestions])];else evidence.push({...source,id:'R'+(evidence.length+1)});}
  if(result.notice)notices.push(result.notice);
 }
 validateRetrievedEvidence(evidence,task);return {evidence,notice:[...new Set(notices)].join('\n')};
}
