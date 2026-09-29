import {qwenProfile} from './embedding-contract.mjs';
// Calibrated on the recorded local baseline, not a truth/confidence probability.
// A separate held-out corpus is still required before migration acceptance.
export const qwenRelevance={version:'qwen-local-calibration-v1',minimumCosine:0.45};
export function relevancePolicy(config){return config.indexProfile===qwenProfile?qwenRelevance:null;}
export function cosineSimilarity(query,point){
 const vector=point.vector?.dense;
 if(!Array.isArray(vector)||vector.length!==query.length||vector.some(x=>!Number.isFinite(x)))
  throw Object.assign(new Error('检索服务未返回可核验的语义向量，无法判断候选相关性。'),{status:503});
 let dot=0,aa=0,bb=0;
 for(let i=0;i<query.length;i++){dot+=query[i]*vector[i];aa+=query[i]*query[i];bb+=vector[i]*vector[i];}
 const denominator=Math.sqrt(aa*bb);
 if(!Number.isFinite(denominator)||denominator===0)throw Object.assign(new Error('检索服务返回无效语义向量。'),{status:503});
 return Math.max(-1,Math.min(1,dot/denominator));
}
