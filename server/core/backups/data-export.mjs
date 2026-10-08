import {all,now,transaction} from '../../store.mjs';

// Explicit business-data allowlist: settings, credentials, sessions and worker
// internals belong to the controlled backup path, never this readable export.
const groups={
 notes:'note',events:'event',eventOccurrences:'eventOccurrence',todos:'todo',
 transactions:'transaction',accountingBudget:'accountingBudget',accountingImports:'accountingImport',
 accountingReviews:'accountingReview',accountingClassifications:'accountingClassification',accountingChecks:'accountingCheck',
 tasks:'task',memories:'memory',artifacts:'artifact',conversations:'conversation',workTasks:'workTask',workRuns:'workRun',
 library:'libraryFile',audioTranscriptVersions:'audioTranscriptVersion',projects:'project',noteCategories:'noteCategory',
 classificationCorrections:'classificationCorrection',threads:'thread',sourceThreads:'sourceThread',
 supervisionRecaps:'supervisionRecap',supervisionEvidenceChecks:'supervisionEvidenceCheck',
 researchInputs:'researchInput',researchExternal:'researchExternal'
};
function withoutKey({key,...metadata}){return metadata;}
function readableItem(kind,item){
 if(kind==='note')return {...item,attachments:(item.attachments||[]).map(withoutKey)};
 if(kind==='event')return {...item,images:(item.images||[]).map(withoutKey)};
 if(kind==='accountingImport')return {...item,original:item.original?withoutKey(item.original):null};
 return item;
}
export function businessDataExport(){
 return transaction(()=>{
  const data=Object.fromEntries(Object.entries(groups).map(([name,kind])=>[name,all(kind).map(item=>readableItem(kind,item))]));
  return {version:2,exportedAt:now(),exportNotice:'此JSON包含现存业务数据与资料解析正文，不包含原文件、密钥配置、已删除数据或可恢复的后台运行检查点；完整备份请使用设置中的完整备份。',coverage:Object.fromEntries(Object.entries(data).map(([name,items])=>[name,items.length])),...data};
 });
}
