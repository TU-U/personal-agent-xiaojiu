import {createHash} from 'node:crypto';
// Direct official CNY endpoint only. No guessing that a proxy has the same bill.
// Peak rates deliberately remain an upper bound even when a call crosses a
// peak boundary/holiday: usage does not expose the provider's billing timestamp.
export const DEEPSEEK_RESEARCH_PRICE=Object.freeze({
 version:'deepseek-flash-cny-2026-10-07-peak-v1',currency:'CNY',
 source:'https://api-docs.deepseek.com/zh-cn/quick_start/pricing/',
 checkedAt:'2026-10-07',reviewBefore:'2026-11-07T00:00:00Z',
 inputMissMicrosPerToken:2,inputHitHundredthsMicrosPerToken:4,outputMicrosPerToken:8,
 tokenizerSource:'https://cdn.deepseek.com/api-docs/deepseek_v4_tokenizer.zip',
 tokenizerSha256:'89085f12ef79460ac5f66d1119325ddfc694b4ab209d80bbd81d35f081dc9614',
 inputBoundBasis:'UTF-8 byte-level BPE upper bound plus 1024 protocol tokens; text-only, two messages, no tools/schema/images',
 protocolTokenAllowance:1024,
});
const fail=message=>Object.assign(new Error(message),{status:422,code:'RESEARCH_PRICE_REQUIRED'});
const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
export function quoteResearchModel(config,system,user,{maxTokens=2048,now=Date.now(),historicalAttempt=false}={}){
 let url;try{url=new URL(config.baseUrl);}catch{throw fail('模型地址无效，无法确定调研费用。');}
 if(url.origin!=='https://api.deepseek.com'||!['/','/v1','/v1/'].includes(url.pathname)||url.search||url.hash||url.username||url.password||config.model!=='deepseek-flash')throw fail('此模型或中转地址尚无已核验的调研价格与用量契约，未发起付费调用。');
 if(!historicalAttempt&&now>=Date.parse(DEEPSEEK_RESEARCH_PRICE.reviewBefore))throw fail('调研价格快照需重新核对，未按过期价格发起调用。');
 if(typeof system!=='string'||typeof user!=='string'||!Number.isSafeInteger(maxTokens)||maxTokens<1||maxTokens>8192)throw fail('调研计费目前仅接受纯文本双消息，最大输出 1–8192 tokens。');
 // The published tokenizer is byte-level BPE with no expanding normalizer.
 // The protocol allowance is explicit, audited against returned usage; a
 // violation stops the run rather than silently claiming the bound still holds.
 const inputTokens=Buffer.byteLength(system,'utf8')+Buffer.byteLength(user,'utf8')+DEEPSEEK_RESEARCH_PRICE.protocolTokenAllowance;
 const maxCostMicros=inputTokens*2+maxTokens*8;
 if(!Number.isSafeInteger(maxCostMicros)||maxCostMicros>1000000)throw Object.assign(new Error('输入和最大输出的费用预留已超过本次调研预算，请缩小资料范围。'),{status:422,code:'RESEARCH_BUDGET'});
 return {price:DEEPSEEK_RESEARCH_PRICE,inputTokens,maxTokens,maxCostMicros,
  requestHash:digest({baseUrl:config.baseUrl,model:config.model,credentialDigest:digest(config.apiKey||''),system,user,maxTokens,price:DEEPSEEK_RESEARCH_PRICE.version})};
}
export function priceResearchUsage(receipt,quote){
 const u=receipt?.usage,valid=n=>Number.isSafeInteger(n)&&n>=0;
 if(receipt?.model!=='deepseek-flash'||!valid(u?.prompt_tokens)||!valid(u?.completion_tokens))return null;
 const input=u.prompt_tokens,output=u.completion_tokens;
 if(u.total_tokens!==undefined&&(!valid(u.total_tokens)||u.total_tokens!==input+output))return null;
 let hit=0;
 if(u.prompt_cache_hit_tokens!==undefined||u.prompt_cache_miss_tokens!==undefined){
  if(!valid(u.prompt_cache_hit_tokens)||!valid(u.prompt_cache_miss_tokens)||u.prompt_cache_hit_tokens+u.prompt_cache_miss_tokens!==input)return null;
  hit=u.prompt_cache_hit_tokens;
 }
 const hundredths=BigInt(input-hit)*200n+BigInt(hit)*4n+BigInt(output)*800n;
 const cost=Number((hundredths+99n)/100n);
 if(!Number.isSafeInteger(cost))return null;
 return {costMicros:cost,basis:'usage-upper-bound',boundExceeded:input>quote.inputTokens||output>quote.maxTokens};
}
