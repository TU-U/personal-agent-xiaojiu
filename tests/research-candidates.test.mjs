import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
const dir=await mkdtemp(join(tmpdir(),'research-candidates-'));process.env.DATA_DIR=dir;process.env.SEED_DEMO='false';process.env.WORKER_MODE='true';
const {db,save,get,all,remove}=await import('../server/store.mjs');
const {createResearchTask,researchTaskAction,researchTaskView,researchBudget}=await import('../server/agent/research/research-tasks.mjs');
const {ensureRuns}=await import('../server/pet/supervision/work-tasks.mjs');
function fixture(){
 const initial=createResearchTask({executionMode:'research',opId:randomUUID(),researchBrief:{topic:'学习事务',type:'learning',questions:['怎样练习？'],expectedOutput:'练习建议'}});
 const artifact=save('artifact',{taskId:initial.id,body:'报告正文',mode:'model',actionCandidates:[{title:'练习回滚',description:'在测试库练习并记录结果',kind:'action'},{title:'检查计划',description:'核对学习目标',kind:'event'}]});
 const task=save('workTask',{...initial,status:'review',outputs:[artifact.id]},initial.revision);
 return {task,artifact,body:{action:'save_candidate',opId:randomUUID(),revision:task.revision,artifactId:artifact.id,artifactRevision:artifact.revision,candidateIndex:0,title:'练习回滚',description:'在测试库练习并记录结果',target:{kind:'action',time:'20:00',minutes:15}}};
}
after(async()=>{db.close();await rm(dir,{recursive:true,force:true});});
test('selected action becomes one linked inactive shared-task draft, retries cannot duplicate it',()=>{
 const {task,artifact,body}=fixture(),first=researchTaskAction(task.id,body),key=artifact.id+':0',decision=first.candidateDecisions[key],target=get(decision.targetId,'workTask');
 assert.equal(target.status,'draft');assert.equal(target.supervisionStatus,'draft');assert.equal(target.executionMode,'supervision');assert.equal(target.sourceResearch.artifactRevision,artifact.revision);assert.equal(target.sourceResearch.taskId,task.id);assert.equal(target.requirement,body.description);ensureRuns();assert.equal(all('workRun').filter(r=>r.taskId===target.id).length,0);
 assert.equal(researchTaskAction(task.id,body).candidateDecisions[key].targetId,target.id);
 assert.equal(researchTaskAction(task.id,{...body,opId:randomUUID()}).candidateDecisions[key].targetId,target.id);
 assert.equal(all('workTask').filter(t=>t.sourceResearch?.taskId===task.id).length,1);assert.equal(researchBudget().snapshot(task.id).chargedMicros,0);
 assert.throws(()=>researchTaskAction(task.id,{...body,opId:randomUUID(),title:'另一标题'}),/已经保存/);
 remove(target.id,'workTask',target.revision);assert.equal(researchTaskView(task.id).candidateDecisions[key].available,false);assert.throws(()=>researchTaskAction(task.id,{...body,opId:randomUUID()}),/已删除/);
});
test('event priority and type are explicitly required; valid save uses the existing event lifecycle',()=>{
 const {task,artifact,body}=fixture(),base={...body,candidateIndex:1,title:'检查学习计划',description:'核对我的学习目标'};
 const before=all('event').length;
 assert.throws(()=>researchTaskAction(task.id,{...base,target:{kind:'event',eventType:'one_off',dueAt:''}}));
 assert.throws(()=>researchTaskAction(task.id,{...base,target:{kind:'event',priority:'high',dueAt:''}}));
 assert.equal(all('event').length,before);
 const saved=researchTaskAction(task.id,{...base,target:{kind:'event',priority:'high',eventType:'long_term',dueAt:''}}),decision=saved.candidateDecisions[artifact.id+':1'],event=get(decision.targetId,'event');
 assert.equal(event.priority,'high');assert.equal(event.eventType,'long_term');assert.equal(event.lifecycleVersion,1);assert.equal(event.status,'open');assert.equal(event.currentOccurrenceId,null);assert.deepEqual(event.relatedTaskIds,[task.id]);assert.equal(event.sourceResearch.candidate.kind,'event');
});
test('stale task/report, foreign report, invalid index and authority fields have no side effects',()=>{
 const {task,artifact,body}=fixture(),foreign=fixture();const count=()=>all('workTask').filter(t=>t.sourceResearch?.taskId===task.id).length;
 for(const patch of [{revision:task.revision-1},{artifactRevision:artifact.revision+1},{artifactId:foreign.artifact.id,artifactRevision:foreign.artifact.revision},{candidateIndex:7},{target:{...body.target,confirmed:true}},{title:'x'.repeat(161)}]){assert.throws(()=>researchTaskAction(task.id,{...body,...patch,opId:randomUUID()}));assert.equal(count(),0);}
 const revised=save('artifact',{...artifact,body:'报告更新'},artifact.revision);assert.equal(revised.revision,artifact.revision+1);assert.throws(()=>researchTaskAction(task.id,body),/报告版本已变化/);assert.equal(count(),0);
});
test('event, occurrence, queue and decision roll back together when the parent update fails',()=>{
 const {task,body}=fixture(),input={...body,target:{kind:'event',priority:'normal',eventType:'one_off',dueAt:'2030-01-01T12:00:00+08:00'}};
 const counts=()=>[all('event').length,all('eventOccurrence').length,db.prepare('SELECT count(*) n FROM background_jobs').get().n];const before=counts();
 db.exec(`CREATE TRIGGER reject_research_candidate BEFORE UPDATE ON entities WHEN NEW.id='${task.id}' BEGIN SELECT RAISE(ABORT,'fixture write failure'); END;`);
 try{assert.throws(()=>researchTaskAction(task.id,input),/fixture write failure/);assert.deepEqual(counts(),before);assert.equal(get(task.id,'workTask').candidateDecisions,undefined);}finally{db.exec('DROP TRIGGER reject_research_candidate');}
 const saved=researchTaskAction(task.id,input);assert.equal(Object.keys(saved.candidateDecisions).length,1);assert.equal(all('event').length,before[0]+1);assert.equal(all('eventOccurrence').length,before[1]+1);
});
