import {payloadHash} from '../core/device-auth.mjs';
import {get,getSetting,setSetting,transaction} from '../store.mjs';
import {quoteResearchModel,priceResearchUsage} from './research/research-pricing.mjs';
export const CHAT_LIMITS=Object.freeze({calls:6,timeMs:120000,costMicros:1000000});
export const chatFailure=(message,code='CHAT_BUDGET',status=409)=>Object.assign(new Error(message),{code,status});
export const chatRun=id=>getSetting('chat-run:'+id,null);
export const writeChatRun=run=>{setSetting('chat-run:'+run.id,run);return run;};
const digest=payloadHash;
export function startChatRun(id,input,threadId,{clock=Date.now,historyRevision=''}={}){
 return transaction(()=>{
  const previous=chatRun(id);if(previous){if(previous.inputHash!==digest(input))throw chatFailure('本次操作标识已用于其他问题。','CHAT_REQUEST');if(previous.historyRevision!==historyRevision)throw chatFailure('原执行对应的话题历史已变化，请重新提问；旧预算和结果仍保留。','CHAT_STALE');return previous;}
  if(input.continueRunId){const parent=chatRun(input.continueRunId);if(!parent||parent.threadId!==threadId||parent.status!=='stopped'||!parent.conversationId)throw chatFailure('只有已保存的中断回答可以继续。','CHAT_CONTINUE');if(!get(parent.conversationId,'conversation'))throw chatFailure('原回答已删除，不能从它继续执行。','CHAT_CONTINUE',410);if(parent.childId&&parent.childId!==id)throw chatFailure('这次继续已经提交，请查看原话题。','CHAT_CONTINUE');writeChatRun({...parent,childId:id});}
  const at=clock();return writeChatRun({id,threadId,inputHash:digest(input),historyRevision,parentId:input.continueRunId||null,startedAt:at,deadline:at+CHAT_LIMITS.timeMs,status:'running',phase:'正在分析问题',attempts:[],sources:[],steps:[],notice:'',body:''});
 });
}
export function chatBudget(id,{clock=Date.now}={}){
 const read=()=>{const run=chatRun(id);if(!run)throw chatFailure('执行记录不存在。','CHAT_RUN',404);return run;};
 const state=()=>{const run=read();return {...run,calls:run.attempts.filter(a=>a.kind==='model').length,costMicros:run.attempts.reduce((sum,a)=>sum+(a.costMicros??a.reservedMicros),0),remainingMs:Math.max(0,run.deadline-clock())};};
 const check=()=>{const s=state();if(s.status!=='running')throw chatFailure(s.notice||'执行已结束。');if(s.remainingMs<=0)throw chatFailure('已达到本次 2 分钟上限。');if(s.costMicros>=CHAT_LIMITS.costMicros)throw chatFailure('已达到本次 1 元费用上限。');return s;};
 function reserve(kind,quote){return transaction(()=>{const s=check();if(kind==='model'&&s.calls>=CHAT_LIMITS.calls)throw chatFailure('已达到本次 6 次模型调用上限。');if(!Number.isSafeInteger(quote.maxCostMicros)||quote.maxCostMicros<0||s.costMicros+quote.maxCostMicros>CHAT_LIMITS.costMicros)throw chatFailure('剩余额度不足以预留下一次调用费用。');const run=read(),attempt={id:run.attempts.length,kind,reservedMicros:quote.maxCostMicros,priceVersion:quote.price?.version||quote.priceVersion,state:'reserved',startedAt:clock()};run.attempts.push(attempt);writeChatRun(run);return attempt.id;});}
 function reserveModel(config,payload){
  // The exact Pi wire payload includes tool declarations/history. Price the UTF-8
  // serialization four times + 4096 bytes of protocol allowance conservatively.
  // This is audited against provider usage; a bound violation freezes the run.
  const text=JSON.stringify(payload),quote=quoteResearchModel(config,text.repeat(4),' '.repeat(4096),{maxTokens:payload.max_tokens,now:clock()});
  quote.price={...quote.price,version:quote.price.version+':pi-json-4x-v1',inputBoundBasis:'4x UTF-8 serialized Pi payload + 5120 protocol allowance; text/tools only, checked against actual usage'};
  return {id:reserve('model',quote),quote};
 }
 function settle(attemptId,receipt,quote){return transaction(()=>{const run=read(),attempt=run.attempts[attemptId];if(!attempt||attempt.state!=='reserved')throw chatFailure('调用回执不能重复结算。','CHAT_RECEIPT');const metered=quote?priceResearchUsage(receipt,quote):null;attempt.state='settled';attempt.costMicros=metered?.costMicros??attempt.reservedMicros;attempt.chargeBasis=metered?'usage-upper-bound':'reserved-upper-bound';attempt.receipt=receipt?Object.fromEntries(['callId','model','usage','finishReason','durationMs'].filter(k=>receipt[k]!==undefined).map(k=>[k,receipt[k]])):null;attempt.finishedAt=clock();if(metered?.boundExceeded){run.status='stopped';run.notice='实际模型用量超过计价上界，已停止执行，请核对价格与用量。';}writeChatRun(run);return attempt;});}
 return {state,check,reserve,reserveModel,settle,remainingMs:()=>state().remainingMs};
}
export function chatRunView(id){const run=chatRun(id);if(!run)throw chatFailure('执行记录不存在。','CHAT_RUN',404);const state=chatBudget(id).state();let parent=run.parentId,priorCalls=0,priorCost=0;const seen=new Set([id]);while(parent&&!seen.has(parent)){seen.add(parent);const previous=chatRun(parent);if(!previous)break;const p=chatBudget(parent).state();priorCalls+=p.calls;priorCost+=p.costMicros;parent=previous.parentId;}
 return {id,threadId:run.threadId,status:run.status,phase:run.phase,notice:run.notice,calls:state.calls,costMicros:state.costMicros,elapsedMs:Math.max(0,Math.min(run.finishedAt||Date.now(),run.deadline)-run.startedAt),totalCalls:priorCalls+state.calls,totalCostMicros:priorCost+state.costMicros,canContinue:run.status==='stopped'&&!run.childId,steps:run.steps};}
