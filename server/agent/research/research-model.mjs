import {performance} from 'node:perf_hooks';
import {requestCompletion} from '../../ai/model-completion.mjs';
import {quoteResearchModel,priceResearchUsage} from './research-pricing.mjs';
const fail=(message,code)=>Object.assign(new Error(message),{status:409,code});
// A single paid attempt: no implicit HTTP retries and no new budget on resume.
// The graph/queue owns authorization and lease fencing through the ledger.
export async function completeResearch({ledger,runId,stepKey,provider,system,user,maxTokens=2048,timeoutMs=45000,signal,now=Date.now()}){
 signal?.throwIfAborted();
 const previous=ledger.attempt(runId,stepKey);
 const config=Object.freeze({...provider}),quote=quoteResearchModel(config,system,user,{maxTokens,now,historicalAttempt:!!previous});
 if(!Number.isSafeInteger(timeoutMs)||timeoutMs<1||timeoutMs>300000)throw fail('调研调用超时设置无效。','RESEARCH_INPUT');
 // Replay must use its original time reservation, not a newly reduced balance.
 const maxTimeMs=previous?.max_time_ms??Math.min(timeoutMs,ledger.snapshot(runId).remainingTimeMs);
 const reservation=ledger.reserve({runId,stepKey,requestHash:quote.requestHash,priceVersion:quote.price.version,maxCostMicros:quote.maxCostMicros,maxTimeMs:Math.max(1,maxTimeMs)});
 if(reservation.replay){
  if(reservation.attempt.state==='failed')throw fail(reservation.attempt.error||'此前调用失败；再次调用需要新的尝试编号，并继续使用原预算。','RESEARCH_PREVIOUS_FAILURE');
  return reservation.attempt.result;
 }
 const started=performance.now();let response,error;
 try{response=await requestCompletion(config,system,user,null,{maxTokens,timeoutMs:maxTimeMs,signal,returnDetails:true,requireComplete:true});}
 catch(caught){error=caught;}
 const receipt=response||error?.receipt||null,metered=priceResearchUsage(receipt,quote);
 if(metered?.boundExceeded){
  // The published/observed protocol no longer matches this price contract.
  // Preserve the real usage and stop all further calls in the same research.
  ledger.cancel(runId);error=fail(`模型实际用量超过已核验上界：输入 ${receipt.usage.prompt_tokens}/${quote.inputTokens} tokens，输出 ${receipt.usage.completion_tokens}/${maxTokens} tokens（实际/上限）。已停止本次调研，保留用量供核对。`,'RESEARCH_USAGE_BOUND');
 }
 const result={content:response?.content||null,receipt,price:quote.price,inputTokenBound:quote.inputTokens,outputTokenBound:maxTokens,chargeBasis:metered?.basis||'upper-bound'};
 // Do not catch a persistence/lease error and attempt a second settlement.
 // A lost lease leaves the durable reservation held for recovery/audit.
 ledger.settle({attemptId:reservation.attempt.id,actualCostMicros:metered?.costMicros??null,...(metered?{chargeBasis:metered.basis}:{}),elapsedMs:Math.ceil(performance.now()-started),result,...(error?{error:error.message}: {})});
 if(error)throw error;
 if(!response)throw fail('模型没有返回结果，费用预留仍保留。','RESEARCH_MODEL_UNAVAILABLE');
 return result;
}
