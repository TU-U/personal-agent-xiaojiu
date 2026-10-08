// Reuse the prior isolated real-model flow. Never confirm or modify a user task.
import {DatabaseSync} from 'node:sqlite';import {randomUUID} from 'node:crypto';
import {readdir,readFile,writeFile,access} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join,resolve} from 'node:path';
const destination=resolve('artifacts/research-handoff-check.json');
try{await access(destination);throw new Error('Existing evaluation; no repeat paid call.');}catch(error){if(error.code!=='ENOENT')throw error;}
const prior=JSON.parse(await readFile('artifacts/research-flow-check.json','utf8'));if(!prior.passed||!prior.approvalSimulated)throw new Error('Requires prior isolated successful flow');
let directory;
for(const name of await readdir(tmpdir())){
 if(!name.startsWith('research-real-flow-'))continue;let db;
 try{db=new DatabaseSync(join(tmpdir(),name,'shiguang.sqlite'),{readOnly:true});if(db.prepare("SELECT id FROM entities WHERE id=? AND kind='workTask'").get(prior.budget.runId))directory=join(tmpdir(),name);}catch{}finally{db?.close();}
}
if(!directory)throw new Error('Prior isolated dataset is absent; no new model test created automatically.');
process.env.DATA_DIR=directory;process.env.WORKER_MODE='true';process.env.SEED_DEMO='false';
const {db,get}=await import('../../server/store.mjs');const {researchTaskAction,researchTaskView}=await import('../../server/agent/research/research-tasks.mjs');const {researchHandlers}=await import('../../server/agent/research/research-jobs.mjs');const {fileJobs}=await import('../../server/jobs/file-jobs.mjs');
const task=get(prior.budget.runId,'workTask');if(task.status!=='review'||(task.researchReportVersion||1)!==1)throw new Error('The isolated task has already changed; inspect it rather than rerun.');
const original=researchTaskView(task.id),waiting=researchTaskAction(task.id,{action:'handoff',opId:randomUUID(),revision:task.revision,brief:original.handoffBrief}),waitingBudget=researchTaskView(task.id).budget;
const continued=researchTaskAction(task.id,{action:'external',opId:randomUUID(),revision:waiting.revision,handoffId:waiting.handoff.id,text:'隔离测试回填材料：练习将在一次性测试库中进行，具体数据库产品尚未确定。没有带回任何经过独立核验的网页原文，请继续把语法细节列为待核实，不要编造URL。',urls:[]});
const job=fileJobs.claim(continued.researchJobId,randomUUID(),120000);let result;
try{
 const value=await researchHandlers.research.run(job);if(!fileJobs.finish(job.id,job.lease_token,value,researchHandlers.research.commit))throw new Error('Lost lease');
 const latest=researchTaskView(task.id);result={checkedAt:new Date().toISOString(),passed:latest.artifacts.length===2&&latest.artifacts[0].body===original.artifacts[0].body&&latest.artifacts[1].sources.some(s=>s.evidenceType==='user_fill'),mode:'real-model-same-checkpoint-thread',handoffSimulated:true,budgetBefore:original.budget,budgetWhileWaiting:waitingBudget,budgetAfter:latest.budget,report:latest.artifacts[1],limitations:['复用既有隔离样本；回填和用户操作由脚本模拟。','验证真实模型处理手工回填，不代表应用执行了网页搜索。']};
}catch(error){fileJobs.fail(job.id,job.lease_token,error.message);result={checkedAt:new Date().toISOString(),passed:false,error:error.message,code:error.code,budget:researchTaskView(task.id).budget};}
await writeFile(destination,JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});db.close();console.log(JSON.stringify({destination,passed:result.passed,budget:result.budgetAfter||result.budget,error:result.error}));if(!result.passed)process.exitCode=1;
