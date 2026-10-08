import {createHash} from 'node:crypto';

// Only merge previously revalidated evidence. SQL source/version checks remain
// in research-jobs; a historical web snapshot is not a fresh network check.
const identity=e=>JSON.stringify([e.kind,e.sourceId,e.url,e.revision,e.sourceField,e.evidenceType,e.start,e.end,e.total,e.contentHash,e.quote]);
export function mergeResearchEvidence(previous=[],current=[]){
 const result=[],byContent=new Map(),usedIds=new Set();
 for(const [items,retained] of [[current,false],[previous,true]])for(const original of items){
  const key=identity(original),existing=byContent.get(key);
  if(existing){existing.matchedQuestions=[...new Set([...(existing.matchedQuestions||[]),...(original.matchedQuestions||[])])];continue;}
  const item={...original,retainedFromPrevious:retained};
  if(usedIds.has(item.id)){
   const base='H'+createHash('sha256').update(key).digest('hex').slice(0,24);item.id=base;
   let suffix=1;while(usedIds.has(item.id))item.id=base+'.'+suffix++;
  }
  usedIds.add(item.id);byContent.set(key,item);result.push(item);
 }
 return result;
}
export function retainedEvidenceNotice(evidence){
 const retained=evidence.filter(e=>e.retainedFromPrevious);
 return retained.length?`沿用此前取得的 ${retained.length} 条材料，保留原获取时间；旧网页本轮未重新取得相同内容，不能作为最新事实核验。新旧内容有差异时需对照来源和时间，不自动认定任何一方正确。`:'';
}
