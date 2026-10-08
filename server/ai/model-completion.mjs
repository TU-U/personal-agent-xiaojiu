import {logAiEvent,registerAiSecret} from '../core/ai-log.mjs';
import {randomUUID} from 'node:crypto';

export async function requestCompletion(config,system,user,schema=null,options={}) {
 config={...config};
 registerAiSecret(config.apiKey);
 if(!config.baseUrl||!config.model){logAiEvent({stage:'skipped',kind:'chat',reason:'未配置模型'});return null;}
 const timeoutMs=options.timeoutMs??90000;
 if(!Number.isSafeInteger(timeoutMs)||timeoutMs<1||timeoutMs>300000)throw Object.assign(new Error('模型超时必须为 1–300000 毫秒。'),{status:422});
 if(options.maxTokens!==undefined&&(!Number.isSafeInteger(options.maxTokens)||options.maxTokens<1))throw Object.assign(new Error('模型输出额度必须为正整数。'),{status:422});
 const timeoutSignal=AbortSignal.timeout(timeoutMs);
 const signal=options.signal?AbortSignal.any([options.signal,timeoutSignal]):timeoutSignal;
 // An already-cancelled request must not reach the provider or emit a request log.
 signal.throwIfAborted();
 const callId=randomUUID(),started=Date.now();
 let receipt={callId,model:config.model,usage:null,finishReason:null};
 const withReceipt=error=>Object.assign(error,{receipt:{...receipt,durationMs:Date.now()-started}});
 const interrupted=()=>Object.assign(new Error(options.signal?.aborted?'模型调用已取消。':`模型响应超过 ${Math.ceil(timeoutMs/1000)} 秒，请稍后重试或更换模型。`),{status:options.signal?.aborted?409:504,code:options.signal?.aborted?'MODEL_CANCELLED':'MODEL_TIMEOUT'});
 const deepseek=new URL(config.baseUrl).hostname==='api.deepseek.com';
 const payload={model:config.model,messages:[{role:'system',content:system},{role:'user',content:options.userContent||user}],temperature:0.3,frequency_penalty:0.3,max_tokens:options.maxTokens||1400,...(deepseek?{thinking:{type:'disabled'}}:{}),...(schema?{response_format:{type:'json_schema',json_schema:{name:'grounded_response',strict:true,schema}}}:{})};
 // Log the prompt, but never write inline image bytes to the terminal or log file.
 const safeUser=options.logUser|| (options.userContent?user+'\n[图片原件已发送；二进制内容不记录]':null);
 const loggedPayload=safeUser?{...payload,messages:[payload.messages[0],{role:'user',content:safeUser}]}:payload;
 logAiEvent({stage:'request',kind:'chat',callId,provider:config.baseUrl,model:config.model,payload:loggedPayload});
 let response;
 try { response=await fetch(config.baseUrl.replace(/\/$/,'')+'/chat/completions',{method:'POST',headers:{'Content-Type':'application/json',...(config.apiKey?{Authorization:`Bearer ${config.apiKey}`}:{})},body:JSON.stringify(payload),signal}); }
 catch(e){const error=signal.aborted?interrupted():Object.assign(new Error('无法连接模型服务，请检查地址和网络。'),{status:502,code:'MODEL_NETWORK'});logAiEvent({stage:'error',kind:'chat',callId,durationMs:Date.now()-started,error:error.message});throw withReceipt(error);}
 if(!response.ok){const detail=await response.text().catch(()=>null);logAiEvent({stage:'error',kind:'chat',callId,durationMs:Date.now()-started,httpStatus:response.status,response:detail,error:'模型接口返回错误'});if(signal.aborted)throw withReceipt(interrupted());const unsupportedImage=options.userContent&&/unsupported image/i.test(detail||'');const visionRejected=options.userContent&&[400,415,422].includes(response.status);throw withReceipt(Object.assign(new Error(unsupportedImage?'模型无法识别这张图片，请换用普通 PNG/JPEG 图片后重试。':visionRejected?`模型服务返回 ${response.status}，当前模型可能不支持图片分析，请检查模型能力或换用视觉模型。`:`模型服务返回 ${response.status}，请检查模型名称、密钥或服务额度。`),{status:502,code:'MODEL_HTTP',upstreamStatus:response.status}));}
 let result;
 try {result=await response.json();}catch{const error=signal.aborted?interrupted():Object.assign(new Error('模型返回的数据格式无效，请查看后端 AI 日志。'),{status:502,code:'MODEL_JSON'});logAiEvent({stage:'error',kind:'chat',callId,durationMs:Date.now()-started,error:error.message});throw withReceipt(error);}
 // Provider metadata is data, not executable configuration. Keep only metering
 // fields; never persist arbitrary echoed headers/prompts/credentials in receipts.
 const usage={};
 for(const name of ['prompt_tokens','completion_tokens','total_tokens','prompt_cache_hit_tokens','prompt_cache_miss_tokens']){
  const value=result?.usage?.[name];if(Number.isSafeInteger(value)&&value>=0)usage[name]=value;
 }
 receipt={...receipt,model:typeof result?.model==='string'?result.model.slice(0,200):config.model,usage:Object.keys(usage).length?usage:null,finishReason:typeof result?.choices?.[0]?.finish_reason==='string'?result.choices[0].finish_reason.slice(0,80):null};
 if(signal.aborted)throw withReceipt(interrupted());
 const choice=result?.choices?.[0],content=choice?.message?.content;
 logAiEvent({stage:'response',kind:'chat',callId,durationMs:Date.now()-started,httpStatus:response.status,finishReason:choice?.finish_reason,usage:result?.usage,...(options.logResponse===false?{responseContentOmitted:true,contentLength:typeof content==='string'?content.length:0}:{content,reasoningContent:choice?.message?.reasoning_content}),model:result?.model});
 if(options.requireComplete&&choice?.finish_reason==='length')throw withReceipt(Object.assign(new Error('模型输出被额度截断，未保存不完整归纳，请重试。'),{status:502,code:'MODEL_TRUNCATED'}));
 const visible=typeof content==='string'?content.replace(/<think>[\s\S]*?<\/think>/g,'').trim():'';
 if(!visible){const message=choice?.finish_reason==='length'?'模型耗尽了输出额度，未生成正文。请重试并查看后端 AI 日志。':'模型返回了空内容，请查看后端 AI 日志。';logAiEvent({stage:'error',kind:'chat',callId,durationMs:Date.now()-started,finishReason:choice?.finish_reason,usage:result?.usage,error:message});throw withReceipt(Object.assign(new Error(message),{status:502,code:'MODEL_EMPTY'}));}
 return options.returnDetails?{content:visible,...receipt,durationMs:Date.now()-started}:visible;
}
