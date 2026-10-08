import {randomUUID} from 'node:crypto';
import {webSignal,webFailure,readWebBody} from './web-transport.mjs';
import {registerAiSecret,logAiEvent} from '../../core/ai-log.mjs';
import {getSetting} from '../../store.mjs';

export const webSearchKey=()=>getSetting('braveSearchKey','')||process.env.BRAVE_SEARCH_API_KEY||'';
export const webSearchAvailable=()=>!!webSearchKey();

export function validateSearchQuery(query){
 if(typeof query!=='string'||!query.trim()||[...query.trim()].length>600||query.trim().split(/\s+/).length>75)throw webFailure('搜索问题需要为1–600字且不超过75个空格分隔词，请缩短问题后重试。','WEB_INPUT',422);
}
export async function searchWeb(query,{signal,key=webSearchKey(),timeoutMs=15000,returnDetails=false}={}){
 const combined=webSignal(signal,timeoutMs);
 validateSearchQuery(query);
 if(!key)throw webFailure('应用内联网分析需要先在设置中填写 Brave Search API 密钥；也可以使用「整理搜索简报」跳转 DeepSeek 网页端。','SEARCH_UNAVAILABLE',422);
 const url=new URL('https://api.search.brave.com/res/v1/web/search');url.searchParams.set('q',query.trim());url.searchParams.set('count','6');url.searchParams.set('result_filter','web');url.searchParams.set('text_decorations','false');
 registerAiSecret(key);const callId=randomUUID(),started=Date.now();logAiEvent({stage:'request',kind:'web-search',callId,query:query.trim()});
 try{
  let response;try{response=await fetch(url,{headers:{Accept:'application/json','X-Subscription-Token':key},signal:combined,redirect:'error'});}catch(error){combined.throwIfAborted();throw webFailure('联网搜索暂时无法连接，请重试或改用 DeepSeek 网页端。','SEARCH_UNAVAILABLE');}
  combined.throwIfAborted();
  if(!response.ok){await response.body?.cancel();throw Object.assign(webFailure(response.status===401||response.status===403?'Brave 搜索访问被拒绝，请在设置中核对密钥。':`联网搜索返回 ${response.status}，请稍后重试。`,response.status===401||response.status===403?'WEB_FORBIDDEN':response.status===429?'WEB_RATE_LIMIT':[400,422].includes(response.status)?'WEB_INPUT':'SEARCH_UNAVAILABLE',[400,422,429].includes(response.status)?response.status:502),{upstreamStatus:response.status});}
  const raw=await readWebBody(response,combined);let payload;try{payload=JSON.parse(raw);}catch{throw webFailure('搜索服务返回的数据无法读取。','WEB_RESPONSE');}
  if(!payload||typeof payload!=='object'||payload.web?.results!==undefined&&!Array.isArray(payload.web.results))throw webFailure('搜索服务返回的结果结构无效。','WEB_RESPONSE');
  const retrievedAt=new Date().toISOString(),results=(payload.web?.results||[]).filter(item=>{try{const u=new URL(item.url);return ['https:','http:'].includes(u.protocol)&&!u.username&&!u.password;}catch{return false;}}).slice(0,6).map((item,index)=>({id:`web-${index}-${Buffer.from(item.url).toString('base64url').slice(0,28)}`,kind:'web',title:String(item.title||item.url).slice(0,240),quote:String(item.description||'').slice(0,700),url:item.url,revision:0,createdAt:item.page_age||'',retrievedAt,evidenceType:'search_snippet'}));
  logAiEvent({stage:'response',kind:'web-search',callId,durationMs:Date.now()-started,results});
  return returnDetails?{results,retrievedAt,query:query.trim(),requestSent:true}:results;
 }catch(error){const cause=combined.aborted?combined.reason:error;logAiEvent({stage:'error',kind:'web-search',callId,durationMs:Date.now()-started,error:cause.message});throw cause;}
}
