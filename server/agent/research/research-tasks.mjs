import {selectResearchPassages} from './research-evidence.mjs';
import {assembleThreadContext,turnSignature} from '../thread-context.mjs';
import {noteReadableText} from '../../domain/shared/source-content.mjs';
import {searchPricingView,saveSearchPricing,searchPriceQuote} from './research-search-pricing.mjs';
import {saveResearchCandidate,researchCandidateFields,researchCandidateTarget} from './research-candidates.mjs';
import {renderSearchBrief} from '../../ai/web/search-brief.mjs';
import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {all,db,get,save,transaction,now} from '../../store.mjs';
import {fileJobs} from '../../jobs/file-jobs.mjs';
import {researchCreate} from './research-contract.mjs';
import {researchPlanHash} from './research-approval.mjs';
import {createResearchBudget} from './research-budget.mjs';
import {threadMetadata,threadUnavailable,pageItems} from '../source-threads.mjs';
import {validate} from '../../core/validation.mjs';
const fail=(message,status=409)=>Object.assign(new Error(message),{status,code:'RESEARCH_STATE'});
let budget;
export const researchBudget=()=>budget??=createResearchBudget(db);
export function requireResearch(id){const task=get(id,'workTask');if(!task||task.executionMode!=='research')throw fail('调研任务不存在。',404);return task;}
export function sourceText(source,kind){return kind==='event'?[source.summary,source.content].filter(Boolean).join('\n\n'):kind==='note'?noteReadableText(source):source.content||'';}
export function validateResearchSources(refs){
 return refs.map(ref=>{const item=get(ref.id,ref.kind);if(!item)throw fail(`引用 ${ref.kind}/${ref.id} 已删除，请重新选择。`);if(item.revision!==ref.revision)throw fail(`引用「${item.title}」版本已变化，请重新核对。`);if(ref.kind==='libraryFile'&&(item.status!=='ready'||!item.copyName))throw fail(`资料「${item.title}」尚无可读取的已解析副本。`,422);const content=sourceText(item,ref.kind);if(!content.trim())throw fail(`引用「${item.title}」尚无可读文字。图片可先完成分析后再引用。`,422);return {...ref,title:item.title,content};});
}
export function validateResearchInput(task){
 validateResearchSources(task.references);
 const input=get('research-input:'+task.id,'researchInput');if(!input||input.taskId!==task.id)throw fail('调研原始材料已不存在。');
 if(task.threadId&&threadUnavailable(task.threadId))throw fail('引用的话题已删除，本次研究不会继续读取旧背景。');
 for(const source of input.contextSummary?.sources||[]){const current=get(source.id,'conversation');if(!current||turnSignature(current)!==source.signature)throw fail('引用的话题摘要依据已修改或删除，请重新核对简报。');}
 for(const turn of input.context){const current=get(turn.id,'conversation');if(!current||current.revision!==turn.revision)throw fail('引用的话题背景已修改或删除，请重新核对简报。');}
 const externalSources=(task.externalReferences||[]).map(ref=>{const source=get(ref.id,'researchExternal');if(!source||source.taskId!==task.id||source.revision!==ref.revision)throw fail('本次网页回填材料已失效，不能使用旧结果继续。');return source;});
 return {...input,externalSources};
}
function receipt(key,body,fn){
 const hash=researchPlanHash(body),old=db.prepare('SELECT result FROM operations WHERE id=?').get(key);
 if(old){const result=JSON.parse(old.result);if(result.hash!==hash)throw fail('此操作编号已用于不同调研输入。');return requireResearch(result.taskId);}
 const task=fn();db.prepare('INSERT INTO operations(id,result) VALUES(?,?)').run(key,JSON.stringify({hash,taskId:task.id}));return task;
}
function enqueue(task,phase){return fileJobs.enqueue({key:`research-${task.id}-${task.researchVersion}`,kind:'research',entityId:task.id,revision:task.revision,payload:{phase,executionVersion:task.researchVersion,attempt:task.researchAttempt}});}
export function createResearchTask(input){
 const body=validate(researchCreate,input,{label:'调研简报'});researchBudget();
 return transaction(()=>receipt('research-create:'+body.opId,body,()=>{
  const sources=validateResearchSources(body.references);
  let context=[],contextSummary=null;
  if(body.threadId){
   if(threadUnavailable(body.threadId))throw fail('引用的话题已删除。',410);
   const assembled=assembleThreadContext(body.threadId);
   if(!assembled.history.length&&!assembled.usage.coveredIds.length&&!threadMetadata(body.threadId))throw fail('引用的话题不存在。',404);
   context=assembled.history.map(c=>({id:c.id,revision:c.revision,query:c.query,answer:c.body}));
   contextSummary=assembled.text?{text:assembled.text,version:assembled.usage.summaryVersion,sources:assembled.usage.coveredIds.map(id=>({id,signature:turnSignature(get(id,'conversation'))}))}:null;
   if(JSON.stringify({context,summary:contextSummary?.text||''}).length>24000)throw fail('话题内容较长，请先更新话题摘要，再创建调研。',422);
  }
  const id=randomUUID();researchBudget().initialize(id);
  save('researchInput',{id:'research-input:'+id,taskId:id,sources,context,contextSummary});
  const task=save('workTask',{id,executionMode:'research',title:body.researchBrief.topic,goal:body.researchBrief.topic,threadId:body.threadId,researchBrief:body.researchBrief,references:sources.map(({id,kind,revision,title})=>({id,kind,revision,title})),researchVersion:1,researchAttempt:1,researchReportVersion:1,externalReferences:[],planVersion:1,plan:null,status:'planning',supervisionStatus:'draft',minutes:0,repeat:'once',time:'',requirement:'',logs:[],outputs:[],calls:0});
  const job=enqueue(task,'plan');return save('workTask',{...task,researchJobId:job.id},task.revision);
 }));
}
const opFields={opId:z.string().min(8).max(100),revision:z.number().int().positive()};
const link=z.string().trim().max(2000).url().refine(value=>{const url=new URL(value);return ['http:','https:'].includes(url.protocol)&&!url.username&&!url.password;},'来源链接需要无账号的HTTP(S)地址');
const actionSchema=z.discriminatedUnion('action',[
 z.strictObject({action:z.literal('acknowledge_report'),...opFields,artifactId:z.string().min(1).max(160),artifactRevision:z.number().int().positive(),approved:z.literal(true)}),
 z.strictObject({action:z.literal('save_candidate'),...opFields,...researchCandidateFields,target:researchCandidateTarget}),
 z.strictObject({action:z.literal('handoff'),...opFields,brief:z.string().min(1).max(64000).refine(value=>!!value.trim())}),
 z.strictObject({action:z.literal('external'),...opFields,handoffId:z.string().uuid(),text:z.string().min(1).max(30000).refine(value=>!!value.trim()),urls:z.array(link).max(8).refine(values=>new Set(values).size===values.length,'来源链接重复')}),
 z.strictObject({action:z.literal('end_handoff'),...opFields,handoffId:z.string().uuid()}),
 z.strictObject({action:z.literal('confirm'),opId:z.string().min(8).max(100),revision:z.number().int().positive(),planVersion:z.number().int().positive(),planHash:z.string().regex(/^[a-f0-9]{64}$/),approved:z.literal(true)}),
 z.strictObject({action:z.enum(['cancel','retry','retry_web']),opId:z.string().min(8).max(100),revision:z.number().int().positive()}),
]);
export function researchTaskAction(id,input){
 const body=validate(actionSchema,input,{label:'调研操作'});
 return transaction(()=>receipt('research-action:'+body.opId,{id,...body},()=>{
  const task=requireResearch(id);if(body.action==='save_candidate')return saveResearchCandidate(task,body);if(task.revision!==body.revision)throw fail('调研状态已变化，请刷新后重新核对。');const job=fileJobs.get(task.researchJobId);
  if(body.action==='cancel'){if(task.status==='cancelled')return task;fileJobs.cancel(task.researchJobId);researchBudget().cancel(id);return save('workTask',{...task,status:'cancelled',researchVersion:task.researchVersion+1,notice:'调研已取消，原计划、材料和费用记录保留。'},task.revision);}
  if(body.action==='acknowledge_report'){
   const artifact=get(body.artifactId,'artifact');
   if(task.status!=='review'||task.outputs.at(-1)!==body.artifactId||!artifact||artifact.revision!==body.artifactRevision)throw fail('报告版本已变化，请打开最新报告后再确认查看。');
   return save('workTask',{...task,reportAcknowledgement:{artifactId:artifact.id,artifactRevision:artifact.revision,at:now()},notice:'已记录你查看了本版报告；这不代表结论已核实，也不会执行建议。'},task.revision);
  }
  if(task.status==='cancelled'||researchBudget().snapshot(id).state!=='active')throw fail('调研已取消或因用量异常停止，不能继续请求。');
  // Closing an external wait with an existing report does not read sources or
  // launch research. Source changes must not trap the user in that wait.
  if(body.action==='end_handoff'&&task.outputs.length){
   if(!task.researchApproval||!task.plan||task.researchApproval.planHash!==researchPlanHash(task.plan))throw fail('请先确认本次研究计划，网页接力不能绕过确认。');
   if(task.status!=='waiting'||task.handoff?.state!=='waiting'||task.handoff.id!==body.handoffId)throw fail('这次网页接力已变化，请重新打开当前接力后提交。');
   return save('workTask',{...task,status:'review',researchVersion:task.researchVersion+1,handoff:{...task.handoff,state:'closed',closedAt:now()},notice:'网页接力已结束，原成果保留；查看旧报告不代表引用资料仍是最新版本。'},task.revision);
  }
  validateResearchInput(task);
  if(body.action==='retry_web'){
   if(!task.researchBrief.web||!task.researchApproval||!['review','failed'].includes(job?.state==='failed'?'failed':task.status))throw fail('请在已确认联网计划结束或失败后重试联网。');
   searchPriceQuote();if(job?.state==='failed')fileJobs.cancel(job.id);
   const updated=save('workTask',{...task,status:'running',researchVersion:task.researchVersion+1,researchAttempt:task.researchAttempt+1,researchReportVersion:(task.researchReportVersion||1)+1,notice:'沿用已确认计划和剩余预算重新联网取材，旧报告保留。'},task.revision);
   const next=enqueue(updated,'research');return save('workTask',{...updated,researchJobId:next.id},updated.revision);
  }
  if(['handoff','external','end_handoff'].includes(body.action)){
   if(!task.researchApproval||!task.plan||task.researchApproval.planHash!==researchPlanHash(task.plan))throw fail('请先确认本次研究计划，网页接力不能绕过确认。');
   if(body.action==='handoff'){
    if(!['review','failed'].includes(job?.state==='failed'?'failed':task.status))throw fail('请等待当前调研结束或失败后，再选择网页接力。');
    if(job?.state==='failed')fileJobs.cancel(job.id);
    return save('workTask',{...task,status:'waiting',researchVersion:task.researchVersion+1,handoffHistory:[...(task.handoffHistory||[]),...(task.handoff?[task.handoff]:[])],handoff:{id:randomUUID(),text:body.brief,state:'waiting',createdAt:now(),previousStatus:task.status},notice:'已选择网页接力。等待你带回结果，不计等待时间，也不自动调用模型。'},task.revision);
   }
   if(task.status!=='waiting'||task.handoff?.state!=='waiting'||task.handoff.id!==body.handoffId)throw fail('这次网页接力已变化，请重新打开当前接力后提交。');
   let externalReferences=task.externalReferences||[],handoff={...task.handoff,state:'closed',closedAt:now()},reportVersion=task.researchReportVersion||1;
   if(body.action==='external'){
    reportVersion++;
    const external=save('researchExternal',{taskId:task.id,handoffId:body.handoffId,reportVersion,title:'网页接力回填 '+reportVersion,text:body.text,urls:body.urls,evidenceType:'user_fill',verificationStatus:'unverified',providedAt:now()});
    externalReferences=[...externalReferences,{id:external.id,revision:external.revision}];handoff={...task.handoff,state:'received',receivedAt:now(),externalId:external.id};
   }
   const updated=save('workTask',{...task,status:'running',researchVersion:task.researchVersion+1,researchAttempt:task.researchAttempt+1,researchReportVersion:reportVersion,externalReferences,handoff,notice:'沿用已确认的问题和剩余预算继续；回填材料尚未由应用独立核验。'},task.revision);
   const next=enqueue(updated,'research');return save('workTask',{...updated,researchJobId:next.id},updated.revision);
  }
  if(body.action==='confirm'){
   if(task.status!=='draft'||job?.state!=='completed'||!task.plan||task.plan.version!==body.planVersion||researchPlanHash(task.plan)!==body.planHash)throw fail('必须确认当前版本的调研计划，旧确认不会执行。');
   const updated=save('workTask',{...task,status:'running',researchVersion:task.researchVersion+1,researchApproval:{planVersion:body.planVersion,planHash:body.planHash,confirmedAt:now()},notice:''},task.revision);
   const next=enqueue(updated,'research');return save('workTask',{...updated,researchJobId:next.id},updated.revision);
  }
  if(job?.state!=='failed')throw fail('只有已失败的调研工作可以重试。');
  const updated=save('workTask',{...task,status:task.researchApproval?'running':'planning',researchVersion:task.researchVersion+1,researchAttempt:task.researchAttempt+1,notice:''},task.revision);
  const next=enqueue(updated,task.researchApproval?'research':'plan');return save('workTask',{...updated,researchJobId:next.id},updated.revision);
 }));
}
export function researchReportAcknowledged(task){const ack=task.reportAcknowledgement,latest=task.outputs?.at(-1);return !!ack&&ack.artifactId===latest&&get(latest,'artifact')?.revision===ack.artifactRevision;}
export function researchTaskStatus(task){const job=fileJobs.get(task.researchJobId);return {...task,status:job?.state==='failed'?'failed':task.status,notice:job?.state==='failed'?job.error:task.notice};}
export function researchHandoffBrief(task){
 if(task.handoff?.state==='waiting')return task.handoff.text;
 const input=get('research-input:'+task.id,'researchInput'),brief=task.researchBrief;
 const facts=(input?.sources||[]).map(s=>{
  const parts=selectResearchPassages(s.content,brief,{maxPassages:3});
  const full=parts.length===1&&parts[0].start===0&&parts[0].end===s.content.length;
  const method=full?'全文':parts.every(p=>p.selectionMethod==='distributed_preview')?'未匹配问题词项，以下为分布式预览，不保证相关':'按问题词项扫描选择的片段';
  return `${s.kind==='event'?'要事':s.kind==='libraryFile'?'资料文件':'记录'}「${s.title}」版本${s.revision}（原文共${s.content.length}字符；${method}${full?'':'，并非全文'}）：\n`+parts.map(p=>`[原文位置 ${p.start+1}–${p.end}]\n${p.quote}`).join('\n\n');
 });
 const context=(input?.context||[]).map((turn,index)=>`原话题背景片段${index+1}：用户：${turn.query}\n助手建议（未独立核验，不代表用户事实）：${turn.answer}`);
 return renderSearchBrief({topic:brief.topic,background:[brief.background,brief.constraints,brief.asOf&&'时效要求：'+brief.asOf,input?.contextSummary?.text&&'较早话题摘要（包含助手建议，不等于已确认事实）：\n'+input.contextSummary.text,...context].filter(Boolean),facts,query:brief.topic+'；期望产物：'+brief.expectedOutput,questions:brief.questions});
}
export function researchTaskView(id){const task=requireResearch(id),job=fileJobs.get(task.researchJobId);return {...task,candidateDecisions:Object.fromEntries(Object.entries(task.candidateDecisions||{}).map(([key,value])=>{const target=get(value.targetId,value.targetKind);return [key,{...value,title:target?.title||value.title,available:!!target}];})),status:job?.state==='failed'?'failed':task.status,notice:job?.state==='failed'?job.error:task.notice,externalMaterials:(task.externalReferences||[]).map(ref=>{const source=get(ref.id,'researchExternal');return {id:ref.id,revision:ref.revision,title:source?.title||'回填资料',providedAt:source?.providedAt||null,available:!!source&&source.taskId===task.id&&source.revision===ref.revision};}),handoffBrief:researchHandoffBrief(task),planHash:task.plan?researchPlanHash(task.plan):null,budget:researchBudget().snapshot(id),job:job?{id:job.id,state:job.state,attempts:job.attempts,error:job.error}:null,artifacts:task.outputs.map(id=>get(id,'artifact')).filter(Boolean)};}
export function installResearchTasks(app){
 app.get('/api/research-search-settings',(_req,res)=>res.json(searchPricingView()));
 app.post('/api/research-search-settings',(req,res)=>{saveSearchPricing(req.body);res.json(searchPricingView());});
 app.post('/api/research-tasks',(req,res)=>res.json(createResearchTask(req.body)));
 app.get('/api/research-tasks/:id/external/:sourceId',(req,res)=>{const task=requireResearch(req.params.id),ref=(task.externalReferences||[]).find(r=>r.id===req.params.sourceId),source=ref&&get(ref.id,'researchExternal');if(!source||source.taskId!==task.id||source.revision!==ref.revision)throw fail('网页回填资料不属于此任务或已失效。',404);res.json(source);});
 app.get('/api/research-tasks/:id',(req,res)=>res.json(researchTaskView(req.params.id)));
 app.post('/api/research-tasks/:id/action',(req,res)=>res.json(researchTaskAction(req.params.id,req.body)));
 app.get('/api/research-sources',(req,res)=>{
  const {q,kind,cursor,limit}=validate(z.strictObject({q:z.string().max(200).default(''),kind:z.enum(['note','event','libraryFile']).default('note'),cursor:z.string().max(1000).optional(),limit:z.coerce.number().int().min(1).max(50).default(20)}),req.query);
  const rows=all(kind).filter(item=>(!q||item.title?.includes(q))&&sourceText(item,kind).trim()&&(kind!=='libraryFile'||item.status==='ready'&&item.copyName)).map(item=>({id:item.id,kind,title:item.title,revision:item.revision}));
  res.json(pageItems(rows,{cursor,limit},'research-sources:'+kind+':'+q));
 });
}
