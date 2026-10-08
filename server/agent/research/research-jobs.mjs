import {logAiEvent} from '../../core/ai-log.mjs';
import {createResearchExecutionClock} from './research-execution-clock.mjs';
import {evidenceTimeAvailable} from './research-limits.mjs';
import {performance} from 'node:perf_hooks';
import {collectResearchEvidence,selectResearchPassages} from './research-evidence.mjs';
import {retrieveResearchEvidence,validateRetrievedEvidence} from './research-retrieval.mjs';
import {db,get,save} from '../../store.mjs';
import {fileJobs} from '../../jobs/file-jobs.mjs';
import {providerConfig} from '../../ai/engine.mjs';
import {collectResearchWeb,researchWebStatus} from './research-web.mjs';
import {ResearchCheckpointSaver} from './research-checkpoints.mjs';
import {createResearchBudget} from './research-budget.mjs';
import {completeResearch} from './research-model.mjs';
import {createResearchGraph} from './research-graph.mjs';
import {researchApprovalCommand,researchPlanHash} from './research-approval.mjs';
import {requireResearch,validateResearchInput} from './research-tasks.mjs';
const fail=message=>Object.assign(new Error(message),{status:409,code:'RESEARCH_STALE'});
function assertJob(job){const current=fileJobs.get(job.id),task=requireResearch(job.entity_id);if(current?.state!=='running'||current.lease_token!==job.lease_token||current.lease_until<Date.now()||task.researchVersion!==job.payload.executionVersion||task.status==='cancelled'||task.researchJobId!==job.id)throw fail('调研已取消、状态改变或执行租约失效，旧工作不会提交。');return task;}
export function createResearchHandlers({generate=completeResearch,retrieve=retrieveResearchEvidence,collectWeb=collectResearchWeb}={}){return {research:{
 async run(job){
  const task=assertJob(job);
  const controller=new AbortController(),assertActive=()=>{controller.signal.throwIfAborted();assertJob(job);};
  const baseLedger=createResearchBudget(db,{assertWritable:assertActive});
  const executionClock=createResearchExecutionClock(baseLedger,{runId:task.id,executionId:job.lease_token}),ledger=executionClock.ledger;
  let timer,primaryError;
  try{
  const input=validateResearchInput(task);
  const provider=providerConfig(),saver=new ResearchCheckpointSaver(db,{assertWritable:assertActive});
  const approved=plan=>{const latest=requireResearch(task.id);return latest.researchApproval?.planHash===researchPlanHash(plan)&&latest.researchApproval.planVersion===plan.version;};
  const graph=createResearchGraph({checkpointer:saver,assertActive,approved,
   generate:async(step,system,user,maxTokens)=>{assertActive();validateResearchInput(task);if(step.startsWith('report'))validateRetrievedEvidence(JSON.parse(user).evidence||[],task);return generate({ledger,runId:task.id,stepKey:`${step}:${job.payload.attempt}`,provider,system,user,maxTokens,signal:controller.signal});},
   readEvidence:async()=>{
    const version=task.researchReportVersion||1,stepKey=version===1?'local-evidence':`local-evidence:${version}`,requestHash=researchPlanHash(version===1?task.references:{references:task.references,externalReferences:task.externalReferences,version}),old=ledger.attempt(task.id,stepKey);
    const maxTimeMs=old?.max_time_ms??Math.min(5000,evidenceTimeAvailable(ledger.snapshot(task.id)));
    if(maxTimeMs<=0)throw Object.assign(new Error('取材时间额度不足，保留报告收束时间。'),{code:'RESEARCH_BUDGET'});
    const call=ledger.reserve({runId:task.id,stepKey,requestHash,priceVersion:'local-sqlite-free-v1',maxCostMicros:0,maxTimeMs});
    if(call.replay){if(call.attempt.state==='failed')throw Object.assign(new Error(call.attempt.error),{code:call.attempt.result?.failureCode||'RESEARCH_EVIDENCE'});} 
    let localSources=call.replay?call.attempt.result:null;
    const start=performance.now(),check=()=>{assertActive();if(performance.now()-start>=maxTimeMs)throw Object.assign(new Error('本次取材时间已用尽，保留已有进度。'),{code:'RESEARCH_BUDGET'});};
    if(!call.replay)try{
     const currentInput=validateResearchInput(task),sources=collectResearchEvidence(currentInput,task.researchBrief,{taskId:task.id,assertActive:check});
     validateResearchInput(task);check();
     ledger.settle({attemptId:call.attempt.id,actualCostMicros:0,elapsedMs:Math.ceil(performance.now()-start),result:sources});localSources=sources;
    }catch(error){
     // The ledger's lease fence still applies. A cancelled/stale worker cannot
     // settle behind its replacement; its reservation remains conservative.
     ledger.settle({attemptId:call.attempt.id,actualCostMicros:0,elapsedMs:Math.ceil(performance.now()-start),error:String(error.message).slice(0,1000),result:{failureCode:error.code||'RESEARCH_EVIDENCE'}});throw error;
    }
    const retrieved=await retrieve({task,ledger,signal:controller.signal,assertActive});
    validateResearchInput(task);validateRetrievedEvidence(retrieved.evidence,task);
    const web=await collectWeb({task,ledger,signal:controller.signal,assertActive});
    validateResearchInput(task);validateRetrievedEvidence(retrieved.evidence,task);
    return {evidence:[...localSources,...retrieved.evidence,...web.evidence],notice:[retrieved.notice,web.notice].filter(Boolean).join('\n')};
   },
   supplementEvidence:async({questionIds})=>{assertActive();validateResearchInput(task);const result=await collectWeb({task,ledger,signal:controller.signal,assertActive,questionIds,pageOffset:1});validateResearchInput(task);return result;},
   webStatus:researchWebStatus,
  });
  timer=setInterval(()=>{try{assertActive();executionClock.pulse();}catch(error){controller.abort(error);}},250);timer.unref();
  const config={configurable:{thread_id:task.id},durability:'sync'};
   let before=await graph.getState(config);assertActive();let arg;
   const reportVersion=task.researchReportVersion||1;
   let staleAutomaticSource=false;try{validateRetrievedEvidence(before.values?.evidence||[],task);}catch(error){if(error.code!=='RESEARCH_STALE')throw error;staleAutomaticSource=true;}
   if(reportVersion>(before.values?.reportVersion||1)||(job.payload.phase==='research'&&staleAutomaticSource&&task.researchAttempt>(before.values?.researchAttempt||1))){
    if(job.payload.phase!=='research'||!before.values?.plan||!approved(before.values.plan))throw fail('网页回填不能越过原计划确认。');
    // Resume the same thread from the confirmed-plan node. Persist the cycle
    // marker before invoking so a crashed worker cannot reset it a second time.
    const retained=[],removed=[];
    for(const e of before.values.evidence||[]){try{validateRetrievedEvidence([e],task);retained.push(e);}catch(error){if(error.code!=='RESEARCH_STALE')throw error;removed.push(e.title);}}
    await graph.updateState(config,{reportVersion,researchAttempt:task.researchAttempt,approved:true,evidence:retained,refreshNotice:removed.length?'重试时以下自动检索来源已失效，旧片段不再采用，将重新检索：'+[...new Set(removed)].join('、'):'',report:null,reportContext:null,body:null,partial:false,fallback:'',supplementAttempt:0,supplementChanged:false},'confirm_plan');
    before=await graph.getState(config);assertActive();
   }
   if(!before.values?.brief){
    if(job.payload.phase!=='plan')throw fail('调研计划检查点缺失，不能越过人工确认。');
    arg={reportVersion,researchAttempt:task.researchAttempt,brief:{...task.researchBrief,sourcePreviews:input.sources.map(s=>{const passages=selectResearchPassages(s.content,task.researchBrief,{assertActive,maxPassages:3});return {id:s.id,kind:s.kind,title:s.title,revision:s.revision,totalCharacters:s.content.length,passages,truncated:passages.length!==1||passages[0].start!==0||passages[0].end!==s.content.length};}),topicContext:input.context,topicSummary:input.contextSummary?{text:input.contextSummary.text,version:input.contextSummary.version,notice:'较早话题摘要，包含助手建议，不等于已确认用户事实。'}:null}};
   }else arg=null;
   // Keep persisted decision schema minimal; timestamps live only in SQL.
   if(job.payload.phase==='research'&&before.next.includes('confirm_plan'))arg=researchApprovalCommand(before,{approved:true,planVersion:task.researchApproval?.planVersion,planHash:task.researchApproval?.planHash});
   if(job.payload.phase==='research'&&!approved(before.values.plan))throw fail('尚未确认当前计划。');
   await graph.invoke(arg,config);assertActive();validateResearchInput(task);
   const after=await graph.getState(config);validateRetrievedEvidence(after.values.evidence||[],task);return {reportVersion:after.values.reportVersion||1,phase:after.next.includes('confirm_plan')?'approval':'report',plan:after.values.plan,report:after.values.report||null,reportContext:after.values.reportContext||null,body:after.values.body||null,evidence:after.values.evidence||[],fallback:after.values.fallback||'',partial:!!after.values.partial};
  }catch(error){primaryError=error;if(error.code==='RESEARCH_OUTPUT')logAiEvent({stage:'error',kind:'research-validation',taskId:task.id,jobId:job.id,phase:job.payload.phase,code:error.code,error:error.message,fields:error.fields||[]});throw error;}finally{clearInterval(timer);try{executionClock.finish();}catch(error){if(!primaryError)throw error;}}
 },
 commit(job,result){
  const task=assertJob(job),commitClock=createResearchExecutionClock(createResearchBudget(db,{assertWritable:()=>assertJob(job)}),{runId:task.id,executionId:job.lease_token+':commit'});
  let primaryError;
  try{
  validateResearchInput(task);validateRetrievedEvidence(result.evidence||[],task);
  if(result.phase==='approval'){
   if(job.payload.phase!=='plan'||!result.plan)throw fail('调研确认阶段不匹配。');
   save('workTask',{...task,plan:result.plan,status:'draft',notice:'调研计划已生成，等待你确认；尚未执行研究。'},task.revision);return;
  }
  if(job.payload.phase!=='research'||!task.researchApproval||!result.body||!result.report)throw fail('尚无已确认计划和完整阶段结果，不能发布成果。');
  const reportVersion=task.researchReportVersion||1;if(result.reportVersion!==reportVersion)throw fail('调研报告版本已变化，旧版本不能覆盖当前执行。');
  const artifactId=task.id+':research:'+reportVersion;let artifact=get(artifactId,'artifact');
  if(!artifact)artifact=save('artifact',{id:artifactId,researchReportVersion:reportVersion,previousArtifactId:task.outputs.at(-1)||null,title:task.title,body:result.body,taskId:task.id,sources:result.evidence.map(e=>({...e,id:e.sourceId,evidenceId:e.id})),mode:result.partial?'local':'model',template:result.partial?'调研阶段进度':'调研报告',project:'',researchType:task.researchBrief.type,researchMode:(result.reportContext?.included??result.evidence.length)?'mixed':'model_knowledge',questionCoverage:result.report.coverage,reportContext:result.reportContext||null,actionCandidates:result.report.actions,fallbackReason:result.fallback});
  save('workTask',{...task,status:'review',notice:result.partial?'预算触限，已保留阶段进度和资料，尚未完成分析。':'调研成果已保存，等你核对；建议仅为候选，不会自动创建要事。',outputs:[...new Set([...task.outputs,artifact.id])]},task.revision);
  }catch(error){primaryError=error;throw error;}finally{try{commitClock.finish();}catch(error){if(!primaryError)throw error;}}
 }
}};}
export const researchHandlers=createResearchHandlers();
