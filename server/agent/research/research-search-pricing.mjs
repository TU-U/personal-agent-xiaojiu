import {z} from 'zod';
import {getSetting,setSetting,transaction} from '../../store.mjs';
import {webSearchKey} from '../../ai/web/web-search.mjs';
import {researchPlanHash} from './research-approval.mjs';
import {validate} from '../../core/validation.mjs';
const setting='researchSearchPricing';
const schema=z.discriminatedUnion('enabled',[
 z.strictObject({revision:z.number().int().nonnegative(),enabled:z.literal(false)}),
 z.strictObject({revision:z.number().int().nonnegative(),enabled:z.literal(true),maxCostMicros:z.number().int().min(1).max(1000000),reviewUntil:z.string().datetime({offset:true}),acknowledged:z.literal(true)})
]);
const fail=message=>Object.assign(new Error(message),{status:422,code:'RESEARCH_SEARCH_PRICE'});
export const searchPricingConfig=()=>getSetting(setting,null)||{revision:0,enabled:false};
export function searchPriceQuote(config=searchPricingConfig(),{key=webSearchKey(),clock=Date.now}={}){
 if(!config.enabled||config.acknowledged!==true)throw fail('尚未配置已核对的搜索人民币费用上限。');
 if(!key||config.keyHash!==researchPlanHash(key))throw fail('搜索密钥已变化，请重新核对该账户的费用上限。');
 if(!Number.isSafeInteger(config.maxCostMicros)||config.maxCostMicros<1||config.maxCostMicros>1000000||!Number.isFinite(Date.parse(config.reviewUntil))||Date.parse(config.reviewUntil)<=clock())throw fail('搜索价格已过复核期限或配置无效，请重新核对。');
 return {priceVersion:'brave-user-cny-upper-v1:'+researchPlanHash(config),maxCostMicros:config.maxCostMicros,reviewUntil:config.reviewUntil,basis:'user-confirmed-upper-bound'};
}
export function searchPricingView(){const config=searchPricingConfig();let notice='';try{searchPriceQuote(config);}catch(error){notice=error.message;}const {keyHash,...publicConfig}=config;return {...publicConfig,usable:!notice,notice};}
export function saveSearchPricing(input,{key=webSearchKey(),clock=Date.now}={}){
 const body=validate(schema,input,{label:'调研搜索费用'});
 return transaction(()=>{
  const current=searchPricingConfig();if(current.revision!==body.revision)throw Object.assign(new Error('搜索费用配置已变化，请刷新核对。'),{status:409});
  if(body.enabled){if(!key)throw fail('请先保存 Brave 搜索密钥，再核对该账户的费用。');const until=Date.parse(body.reviewUntil);if(until<=clock()||until>clock()+31*86400000)throw fail('价格复核期限需要在未来31天内。');}
  const value={...body,revision:current.revision+1,updatedAt:new Date(clock()).toISOString(),...(body.enabled?{keyHash:researchPlanHash(key)}:{})};setSetting(setting,value);return value;
 });
}
