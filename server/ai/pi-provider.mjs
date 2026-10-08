import {executionSignal} from '../core/execution-context.mjs';
import {stream} from '@earendil-works/pi-ai/api/openai-completions';
import {normalizeContext} from '@earendil-works/pi-ai/utils/transcript';
import {randomUUID} from 'node:crypto';
import {logAiEvent,registerAiSecret} from '../core/ai-log.mjs';

// Pi owns OpenAI-compatible message/image/tool conversion. The application owns
// credentials, cancellation, receipts and billing; SDK retries are always disabled.
export function piModel(config){return {id:config.model,name:config.model,api:'openai-completions',provider:'xiaojiu',baseUrl:config.baseUrl.replace(/\/$/,''),reasoning:false,input:['text','image'],contextWindow:131072,maxTokens:8192,cost:{input:0,output:0,cacheRead:0,cacheWrite:0},compat:{supportsStore:false,supportsDeveloperRole:false,maxTokensField:'max_tokens'}};}
export function piUserContent(content){
 if(typeof content==='string')return content;
 return content.map(part=>{
  if(part.type==='text')return {type:'text',text:part.text};
  const match=/^data:([^;]+);base64,(.+)$/s.exec(part.image_url?.url||'');
  if(!match)throw Object.assign(new Error('图像输入必须是已读取的本地图片副本。'),{status:422});
  return {type:'image',mimeType:match[1],data:match[2]};
 });
}
export async function piRequest(config,context,options={}){
 options={...options,signal:executionSignal(options.signal)};
 registerAiSecret(config.apiKey);
 const timeoutMs=options.timeoutMs??90000,maxTokens=options.maxTokens??1400;
 if(!Number.isSafeInteger(timeoutMs)||timeoutMs<1||timeoutMs>300000)throw Object.assign(new Error('模型超时必须为 1–300000 毫秒。'),{status:422});
 if(!Number.isSafeInteger(maxTokens)||maxTokens<1)throw Object.assign(new Error('模型输出额度必须为正整数。'),{status:422});
 const signal=options.signal?AbortSignal.any([options.signal,AbortSignal.timeout(timeoutMs)]):AbortSignal.timeout(timeoutMs);
 signal.throwIfAborted();
 const callId=randomUUID(),started=Date.now();let httpStatus=0,receipt={callId,model:config.model,usage:null,finishReason:null},dispatchError;
 const model=piModel(config);
 const output=await stream(model,normalizeContext(context),{
  apiKey:config.apiKey||'local-no-key',maxRetries:0,maxRetryDelayMs:0,timeoutMs,signal,maxTokens,temperature:0.3,cacheRetention:'none',
  headers:config.apiKey?undefined:{authorization:null},
  fetch:async(url,init)=>{
   const response=await fetch(url,init);httpStatus=response.status;
   if(!response.ok||/text\/event-stream/i.test(response.headers.get('content-type')||''))return response;
   // Some OpenAI-compatible servers ignore stream=true and return one JSON
   // completion. Normalize that same response, without a second paid request.
   const value=await response.json();if(!Array.isArray(value?.choices))throw new Error('Invalid completion response');
   const choices=value.choices.map((choice,index)=>({index,delta:{...choice.message,...(choice.message?.tool_calls?{tool_calls:choice.message.tool_calls.map((tool,index)=>({...tool,index}))}:{})},finish_reason:choice.finish_reason||'stop'}));
   return new Response('data: '+JSON.stringify({...value,choices})+'\n\ndata: [DONE]\n\n',{status:response.status,headers:{'content-type':'text/event-stream'}});
  },
  onPayload:async raw=>{
   const payload={...raw,frequency_penalty:0.3,...(new URL(config.baseUrl).hostname==='api.deepseek.com'?{thinking:{type:'disabled'}}:{}),...(options.schema?{response_format:{type:'json_schema',json_schema:{name:'grounded_response',strict:true,schema:options.schema}}}:{})};
   try{await options.beforeDispatch?.(payload);}catch(error){dispatchError=error;throw error;}
   signal.throwIfAborted();
   const loggedPayload=options.logUser?{...payload,messages:payload.messages.map(message=>message.role==='user'?{...message,content:options.logUser}:message)}:payload;
   logAiEvent({stage:'request',kind:'chat',callId,provider:config.baseUrl,model:config.model,payload:loggedPayload});
   return payload;
  },
  onProviderStreamEvent:chunk=>{
   if(typeof chunk?.model==='string')receipt.model=chunk.model.slice(0,200);
   if(chunk?.choices?.[0]?.finish_reason)receipt.finishReason=String(chunk.choices[0].finish_reason).slice(0,80);
   if(chunk?.usage){const usage={};for(const name of ['prompt_tokens','completion_tokens','total_tokens','prompt_cache_hit_tokens','prompt_cache_miss_tokens']){const value=chunk.usage[name];if(Number.isSafeInteger(value)&&value>=0)usage[name]=value;}receipt.usage=Object.keys(usage).length?usage:null;}
  }
 }).result();
 receipt={...receipt,durationMs:Date.now()-started};
 const content=output.content.filter(part=>part.type==='text').map(part=>part.text).join('').replace(/<think>[\s\S]*?<\/think>/g,'').trim();
 let error=dispatchError;
 if(!error&&signal.aborted)error=Object.assign(new Error(options.signal?.aborted?'模型调用已取消。':'模型响应超时，请稍后重试。'),{status:options.signal?.aborted?409:504,code:options.signal?.aborted?'MODEL_CANCELLED':'MODEL_TIMEOUT'});
 if(!error&&['error','aborted'].includes(output.stopReason))error=Object.assign(new Error(httpStatus>=400?`模型服务返回 ${httpStatus}，请检查模型名称、能力、密钥或服务额度。`:httpStatus?'模型返回的数据格式无效，请查看后端 AI 日志。':'无法连接模型服务，请检查地址和网络。'),{status:502,code:httpStatus>=400?'MODEL_HTTP':httpStatus?'MODEL_JSON':'MODEL_NETWORK',...(httpStatus>=400?{upstreamStatus:httpStatus}:{})});
 if(!error&&options.requireComplete&&output.stopReason==='length')error=Object.assign(new Error('模型输出被额度截断，未保存不完整归纳，请重试。'),{status:502,code:'MODEL_TRUNCATED'});
 if(!error&&!content&&!output.content.some(part=>part.type==='toolCall'))error=Object.assign(new Error('模型返回了空内容，请查看后端 AI 日志。'),{status:502,code:'MODEL_EMPTY'});
 logAiEvent({stage:error?'error':'response',kind:'chat',...receipt,httpStatus,...(error?{error:error.message,providerError:output.errorMessage}:{}),...(options.logResponse===false?{responseContentOmitted:true,contentLength:content.length}:{content,toolCalls:output.content.filter(p=>p.type==='toolCall')} )});
 if(error)throw Object.assign(error,{receipt});
 return {message:output,content,...receipt};
}
