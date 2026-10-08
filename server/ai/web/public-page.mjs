import {lookup} from 'node:dns/promises';
import http from 'node:http';
import https from 'node:https';
import {isIP} from 'node:net';
import {Readable} from 'node:stream';
import {createHash} from 'node:crypto';
import {webFailure,webSignal,abortable,readWebBody} from './web-transport.mjs';
function publicAddress(address){
 if(isIP(address)===6)return !/^(::|fc|fd|fe[89ab]|ff|2001:db8:)/i.test(address);
 if(isIP(address)!==4)return false;
 const [a,b,c]=address.split('.').map(Number);
 return a>0&&a!==10&&a!==127&&a!==169&&a<224&&!(a===172&&b>=16&&b<=31)&&!(a===192&&(b===168||b===0&&(c===0||c===2)))&&!(a===100&&b>=64&&b<=127)&&!(a===198&&(b===18||b===19||b===51&&c===100))&&!(a===203&&b===0&&c===113);
}
function fetchPinned(url,hosts,signal){return new Promise((resolve,reject)=>{
 const request=(url.protocol==='https:'?https:http).get(url,{lookup:(_host,options,callback)=>{const found=hosts[0];if(options.all)callback(null,[found]);else callback(null,found.address,found.family);},signal},response=>resolve({status:response.statusCode,ok:response.statusCode>=200&&response.statusCode<300,headers:{get:key=>response.headers[key]},body:Readable.toWeb(response)}));
 request.on('error',reject);
});}
// Dependency injection is for isolated transport tests, never an API option.
export function createPublicPageReader({resolve=lookup,request=fetchPinned}={}){return async function(input,{signal,timeoutMs=15000,start=0,limit=24000,expectedHash}={}){
 const combined=webSignal(signal,timeoutMs);
 if(expectedHash!==undefined&&(typeof expectedHash!=='string'||!/^[a-f0-9]{64}$/.test(expectedHash)))throw webFailure('网页版本标识无效。','WEB_INPUT',422);
 if(!Number.isInteger(start)||start<0||!Number.isInteger(limit)||limit<1||limit>24000)throw webFailure('网页正文读取位置或长度无效。','WEB_INPUT',422);
 let url;try{url=new URL(input);}catch{throw webFailure('网页地址无效。','WEB_INPUT',422);}
 for(let redirect=0;redirect<4;redirect++){
  combined.throwIfAborted();
  if(!['https:','http:'].includes(url.protocol)||url.username||url.password||url.port&&!['80','443'].includes(url.port))throw webFailure('仅支持无账号的公开 HTTP(S) 网页。','WEB_INPUT',422);
  let hosts;try{hosts=await abortable(resolve(url.hostname.replace(/^\[|\]$/g,''),{all:true}),combined);}catch(error){combined.throwIfAborted();throw webFailure('网页域名暂时无法解析。','WEB_UNAVAILABLE');}
  if(!hosts.length||hosts.some(h=>!publicAddress(h.address)))throw webFailure('不能读取本机、内网或保留地址。','WEB_FORBIDDEN',403);
  let response;try{response=await request(url,hosts,combined);}catch(error){combined.throwIfAborted();throw webFailure('网页暂时无法连接。','WEB_UNAVAILABLE');}
  combined.throwIfAborted();
  if(response.status>=300&&response.status<400){const location=response.headers.get('location');await response.body?.cancel();if(!location)throw webFailure('网页跳转缺少地址。','WEB_RESPONSE');try{url=new URL(location,url);}catch{throw webFailure('网页跳转地址无效。','WEB_RESPONSE');}continue;}
  if(!response.ok){await response.body?.cancel();throw Object.assign(webFailure('网页读取失败：'+response.status,[401,403].includes(response.status)?'WEB_FORBIDDEN':response.status===429?'WEB_RATE_LIMIT':'WEB_UNAVAILABLE',response.status===429?429:502),{upstreamStatus:response.status});}
  if(!/text\/|application\/json/.test(response.headers.get('content-type')||'')){await response.body?.cancel();throw webFailure('当前只支持文本网页。','WEB_CONTENT',422);}
  const raw=await readWebBody(response,combined),text=raw.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi,'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
  if(start>text.length)throw webFailure('网页正文读取位置超过全文长度。','WEB_INPUT',422);
  const contentHash=createHash('sha256').update(text).digest('hex');
  if(expectedHash&&contentHash!==expectedHash)throw webFailure('网页正文已变化，不能将不同版本的片段拼接为同一份证据。','WEB_STALE',409);
  combined.throwIfAborted();return {url:url.href,text:text.slice(start,start+limit),start,end:Math.min(start+limit,text.length),total:text.length,truncated:start>0||start+limit<text.length,contentHash,evidenceType:'web_page',readAt:new Date().toISOString()};
 }
 throw webFailure('网页重定向过多。','WEB_UNAVAILABLE');
};}
export const readPublicPage=createPublicPageReader();
