import {z} from 'zod';
import {get,save} from '../../store.mjs';
import {initializeEventLifecycle} from '../../domain/events/event-lifecycle.mjs';
import {researchPlanHash} from './research-approval.mjs';
const text=max=>z.string().trim().min(1).max(max);
export const researchCandidateFields={artifactId:text(100),artifactRevision:z.number().int().positive(),candidateIndex:z.number().int().min(0).max(7),title:text(160),description:text(2000)};
export const researchCandidateTarget=z.discriminatedUnion('kind',[
 z.strictObject({kind:z.literal('event'),priority:z.enum(['normal','high']),eventType:z.enum(['one_off','long_term']),dueAt:z.union([z.literal(''),z.string().datetime({offset:true})])}),
 z.strictObject({kind:z.literal('action'),time:z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),minutes:z.number().int().min(0).max(1440)})
]);
const fail=(message,status=409)=>Object.assign(new Error(message),{status,code:'RESEARCH_CANDIDATE'});
// Called inside the research operation transaction. One report candidate can
// produce one target, even when a client retries with a different operation ID.
export function saveResearchCandidate(task,body){
 const key=body.artifactId+':'+body.candidateIndex,{opId,revision,action,...decision}=body,hash=researchPlanHash(decision),old=task.candidateDecisions?.[key];
 if(old){
  if(old.hash!==hash)throw fail('这条建议已经保存，请前往原要事或任务编辑，不能重复创建。');
  if(!get(old.targetId,old.targetKind))throw fail('这条建议原来保存的对象已删除，不会自动创建另一份。',410);
  return task;
 }
 if(task.revision!==revision)throw fail('调研状态已变化，请刷新后重新核对。');
 const artifact=get(body.artifactId,'artifact');
 if(!artifact||!task.outputs.includes(artifact.id)||artifact.taskId!==task.id)throw fail('报告不属于当前调研或已删除。');
 if(artifact.revision!==body.artifactRevision)throw fail('报告版本已变化，请重新核对建议。');
 const candidate=artifact.actionCandidates?.[body.candidateIndex];
 if(!candidate||!['action','event'].includes(candidate.kind)||typeof candidate.title!=='string'||typeof candidate.description!=='string')throw fail('这条报告建议不存在或结构无效。');
 const sourceResearch={taskId:task.id,artifactId:artifact.id,artifactRevision:artifact.revision,candidateIndex:body.candidateIndex,candidate:{...candidate}},target=body.target;
 let created,targetKind;
 if(target.kind==='event'){
  targetKind='event';created=initializeEventLifecycle({title:body.title,summary:body.description,priority:target.priority,eventType:target.eventType,dueAt:target.dueAt,project:'',tags:[],sourceNoteId:'',relatedEventIds:[],relatedTaskIds:[task.id],images:[],sourceResearch});
 }else{
  targetKind='workTask';created=save('workTask',{title:body.title,goal:body.title,threadId:task.threadId||'',executionMode:'supervision',status:'draft',supervisionStatus:'draft',supervisionVersion:1,planVersion:1,repeat:'once',minutes:target.minutes,startTime:'00:00',time:target.time,requirement:body.description,completionConditions:[{id:'result',kind:'evidence',required:true,description:body.description}],plan:{goal:body.title,conditions:'来自调研建议；尚待确认执行和监督条件。',steps:[body.description],deliverable:body.description},sourceResearch,logs:[],outputs:[],calls:0,web:false,notice:'行动任务草稿已保存；由你执行，确认计划后才开始监督。'});
 }
 return save('workTask',{...task,candidateDecisions:{...(task.candidateDecisions||{}),[key]:{hash,targetId:created.id,targetKind,title:created.title,createdAt:created.createdAt,sourceResearch}}},task.revision);
}
