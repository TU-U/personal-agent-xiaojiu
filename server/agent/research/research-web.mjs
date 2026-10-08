import {evidenceTimeAvailable} from './research-limits.mjs';
import {performance} from 'node:perf_hooks';
import {searchWeb,webSearchKey,validateSearchQuery} from '../../ai/web/web-search.mjs';
import {readPublicPage} from '../../ai/web/public-page.mjs';
import {searchPricingConfig,searchPriceQuote} from './research-search-pricing.mjs';
import {researchPlanHash} from './research-approval.mjs';
const recoverable=error=>['SEARCH_UNAVAILABLE','WEB_UNAVAILABLE','WEB_RESPONSE','WEB_RATE_LIMIT','WEB_CONTENT','WEB_SIZE'].includes(error.code)||error.name==='TimeoutError';
export function researchWebStatus(brief){
 if(!brief.web)return '本次未启用联网，模型已有知识及推断均未联网核验。';
 if(!webSearchKey())return '应用内搜索未配置，使用已有材料和模型知识继续；相关内容未联网核验。';
 try{searchPriceQuote();return '可在确认计划后按关键问题搜索并读取公开文本网页；搜索摘要不等同网页全文，未得到证据的结论仍需标注未核实。';}
 catch(error){return error.message+' 未发起付费搜索；使用已有材料和模型知识继续，相关内容未联网核验。';}
}
export async function collectResearchWeb({task,ledger,signal,assertActive,key=webSearchKey(),pricing=searchPricingConfig(),search=searchWeb,read=readPublicPage,questionIds=null,pageOffset=0}){
 if(!task.researchBrief.web)return {evidence:[],notice:researchWebStatus({web:false})};
 if(!key)return {evidence:[],notice:'应用内搜索未配置，已使用已有材料和模型知识继续；相关内容未联网核验。'};
 const evidence=[],notices=[],version=task.researchReportVersion||1,attempt=task.researchAttempt||1;
 async function step(name,input,paid,run){
  assertActive();signal?.throwIfAborted();const stepKey=`web:${version}:${attempt}:${name}`,requestHash=researchPlanHash(input),old=ledger.attempt(task.id,stepKey);
  const quote=old?{priceVersion:old.price_version,maxCostMicros:old.max_cost_micros}:paid?searchPriceQuote(pricing,{key}):{priceVersion:'public-web-read-free-v1',maxCostMicros:0};
  const time=old?.max_time_ms??Math.min(15000,evidenceTimeAvailable(ledger.snapshot(task.id)));
  if(time<=0)throw Object.assign(new Error('取材时间额度不足，保留报告收束时间。'),{code:'RESEARCH_BUDGET'});
  const call=ledger.reserve({runId:task.id,stepKey,requestHash,priceVersion:quote.priceVersion,maxCostMicros:quote.maxCostMicros,maxTimeMs:time});
  if(call.replay){if(call.attempt.state==='failed')throw Object.assign(new Error(call.attempt.error),{code:call.attempt.result?.code||'RESEARCH_WEB'});return call.attempt.result;}
  const started=performance.now(),combined=signal?AbortSignal.any([signal,AbortSignal.timeout(time)]):AbortSignal.timeout(time);
  try{
   const value=await run(combined);assertActive();combined.throwIfAborted();
   const result={value};ledger.settle({attemptId:call.attempt.id,actualCostMicros:paid?null:0,elapsedMs:Math.ceil(performance.now()-started),result});return result;
  }catch(error){
   assertActive();signal?.throwIfAborted();const cause=combined.aborted?combined.reason:error;
   const result={code:cause.code||'WEB_UNAVAILABLE',notice:cause.message};
   ledger.settle({attemptId:call.attempt.id,actualCostMicros:paid?null:0,elapsedMs:Math.ceil(performance.now()-started),result,...(!recoverable(cause)?{error:String(cause.message).slice(0,1000)}:{})});
   if(!recoverable(cause))throw cause;return result;
  }
 }
 try{
  for(const [i,question] of task.researchBrief.questions.entries()){
   if(questionIds&&!questionIds.includes('Q'+(i+1)))continue;
   // Only the user's question goes to search, never attached personal material.
   validateSearchQuery(question);
   const found=await step('search:Q'+(i+1),{query:question},true,s=>search(question,{key,signal:s,returnDetails:true}));
   if(found.notice){notices.push(`Q${i+1} 搜索失败：${found.notice}`);continue;}
   if(pageOffset===0)for(const [j,item] of found.value.results.entries()){
    evidence.push({id:`W${i+1}.${j+1}`,sourceId:item.url,kind:'web',title:item.title,url:item.url,quote:item.quote,start:0,end:item.quote.length,total:item.quote.length,truncated:true,revision:0,evidenceType:'search_snippet',retrievedAt:found.value.retrievedAt,matchedQuestions:['Q'+(i+1)]});
   }
   // Read the leading result per question first. Other real snippets remain
   // available, explicitly labelled, when a page cannot be fetched.
   const item=found.value.results[pageOffset];if(!item){notices.push(`Q${i+1} 没有更多可读取的搜索结果，相关结论尚缺网页证据。`);continue;}
   const page=await step('page:Q'+(i+1)+(pageOffset?':'+pageOffset:''),{url:item.url},false,s=>read(item.url,{signal:s}));
   if(page.notice){notices.push(`Q${i+1} 网页未读取：${page.notice}`);continue;}
   const value=page.value;
   evidence.push({id:`P${i+1}${pageOffset?'.'+(pageOffset+1):''}`,sourceId:value.url,kind:'web',title:item.title,url:value.url,quote:value.text,start:value.start,end:value.end,total:value.total,truncated:value.truncated,revision:0,contentHash:value.contentHash,evidenceType:'web_page',retrievedAt:value.readAt,matchedQuestions:['Q'+(i+1)]});
  }
 }catch(error){if(!['RESEARCH_BUDGET','RESEARCH_SEARCH_PRICE'].includes(error.code))throw error;notices.push(error.message);}
 return {evidence,notice:[...notices,notices.length?'已保留取得的材料，并使用模型已有知识继续；缺失部分未联网核验。':'搜索摘要仅为摘要；网页原文也不等于所有结论已独立核验。'].join('\n')};
}
