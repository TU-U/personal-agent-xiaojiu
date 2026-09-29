import {getSetting} from './store.mjs';

export const webSearchKey=()=>getSetting('braveSearchKey','')||process.env.BRAVE_SEARCH_API_KEY||'';
export const webSearchAvailable=()=>!!webSearchKey();

export async function searchWeb(query){
 const key=webSearchKey();
 if(!key)throw Object.assign(new Error('应用内联网分析需要先在设置中填写 Brave Search API 密钥；也可以使用「整理搜索简报」跳转 DeepSeek 网页端。'),{status:422});
 const url=new URL('https://api.search.brave.com/res/v1/web/search');
 url.searchParams.set('q',query.slice(0,500));
 url.searchParams.set('count','6');
 const response=await fetch(url,{headers:{Accept:'application/json','X-Subscription-Token':key},signal:AbortSignal.timeout(15000)}).catch(()=>{throw Object.assign(new Error('联网搜索暂时无法连接，请重试或改用 DeepSeek 网页端。'),{status:502});});
 if(!response.ok)throw Object.assign(new Error(response.status===401||response.status===403?'Brave 搜索密钥无效，请在设置中更新。':`联网搜索返回 ${response.status}，请稍后重试。`),{status:502});
 const payload=await response.json().catch(()=>{throw Object.assign(new Error('搜索服务返回的数据无法读取。'),{status:502});});
 return (payload.web?.results||[]).filter(item=>{try{return ['https:','http:'].includes(new URL(item.url).protocol);}catch{return false;}}).slice(0,6).map((item,index)=>({id:`web-${index}-${Buffer.from(item.url).toString('base64url').slice(0,28)}`,kind:'web',title:String(item.title||item.url).slice(0,240),quote:String(item.description||'').slice(0,700),url:item.url,revision:0,createdAt:item.page_age||''}));
}
