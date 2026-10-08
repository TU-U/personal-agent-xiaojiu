import {DatabaseSync} from 'node:sqlite';import {randomUUID} from 'node:crypto';
import {mkdtemp,writeFile,access} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join,resolve} from 'node:path';
const destination=resolve(process.argv[2]||'artifacts/research-flow-check.json');
try{await access(destination);throw new Error('Existing evaluation: inspect it rather than repeat paid calls.');}catch(error){if(error.code!=='ENOENT')throw error;}
let config={};try{config=(await import('../../server/ai/provider.local.mjs')).default||{};}catch(error){if(error.code!=='ERR_MODULE_NOT_FOUND')throw error;}
const live=new DatabaseSync(resolve('.data/shiguang.sqlite'),{readOnly:true}),row=live.prepare('SELECT value FROM settings WHERE key=?').get('provider');live.close();if(row)config=JSON.parse(row.value);
process.env.DATA_DIR=await mkdtemp(join(tmpdir(),'research-real-flow-'));process.env.WORKER_MODE='true';process.env.SEED_DEMO='false';
const {db,setSetting,save,get}=await import('../../server/store.mjs');setSetting('provider',config);
const {createResearchTask,researchTaskAction,researchTaskView}=await import('../../server/agent/research/research-tasks.mjs');
const {researchHandlers}=await import('../../server/agent/research/research-jobs.mjs');const {fileJobs}=await import('../../server/jobs/file-jobs.mjs');const {researchPlanHash}=await import('../../server/agent/research/research-approval.mjs');
async function run(task){const job=fileJobs.claim(task.researchJobId,randomUUID(),120000);try{const result=await researchHandlers.research.run(job);if(!fileJobs.finish(job.id,job.lease_token,result,researchHandlers.research.commit))throw new Error('Lease lost');}catch(error){fileJobs.fail(job.id,job.lease_token,error.message);throw error;}}
const scenario=process.argv[3]||'learning';
const samples={
 'long-learning':{type:'learning',title:'事务学习长文与末尾实验条件',content:[
  '这是一份合成学习笔记，学习者尚未开始实操，也没有掌握事务。事务把多次操作组成一个整体；提交保留修改，回滚撤销尚未提交的修改。先理解概念，再在可丢弃的测试数据库练习。',
  ...Array.from({length:55},(_,i)=>`资料附录第${i+1}节：学习笔记整理时，应区分原文、自己的理解和待核实问题。阅读后可以列出疑问，讨论之后再补充答案。保留资料出处便于回看；计划学习不代表已经完成，描述一次操作也不代表实际运行过。本节仅介绍通用阅读习惯，不包含本次实验的参数或结果。`),
  '末尾实验条件：本次提交与回滚学习只能使用可丢弃的SQLite内存数据库，禁止操作真实业务库。练习表名是practice_lantern，初始数量为73，把数量临时改成91后执行ROLLBACK，应回到73；另开事务改成91再COMMIT，应保留91。学习者今晚只有18分钟，尚未执行任何步骤。这些数字是合成练习参数，不是实际执行结果。'
 ].join('\n\n'),topic:'根据长文末尾实验条件学习提交与回滚',questions:['提交与回滚是什么，应该按什么顺序学习？','根据末尾实验条件，在18分钟内如何用指定表和数量验证提交与回滚？'],background:'只解释原理并设计未执行的练习；请引用长文末尾实际条件，不读取或修改真实业务库。',expectedOutput:'概念、学习顺序、小练习、原文位置和待核实项，不能声称用户已掌握或已运行'},
 learning:{title:'数据库事务学习目标',content:'我准备学习数据库事务，尚未进行实操。希望先理解提交和回滚，再在测试库做一个小练习。这是无个人资料的接口验收样本。',topic:'理解数据库事务的提交与回滚',questions:['提交和回滚分别是什么意思？','怎样在测试库验证回滚？'],background:'仅学习基本原理，不需要最新版本信息。',expectedOutput:'概念、最短学习路径、一个小练习与待核实项'},
 comparison:{title:'两种笔记整理方式的合成约束',content:'仅用于验收的假设数据：A方案本地手动分类，费用0元，每周整理3小时；B方案订阅工具，费用30元/月，每周整理1小时。用户硬约束是每月新增订阅预算0元，不允许上传私人笔记。B是否支持完全离线尚未核实。两种方案均尚未使用。',topic:'在零订阅预算约束下比较两种笔记整理方式',questions:['请按费用、时间、隐私三个相同维度比较A与B。','哪种满足现有硬约束，哪些信息仍需验证？'],background:'所有数字均为合成假设，不是市场价格；不得虚构工具能力或实际测试结果。',expectedOutput:'同维度比较表、符合约束的建议、未知项、最小验证动作'},
 feasibility:{title:'两小时完成迁移的合成约束',content:'仅用于验收的假设数据：只有一人，今晚仅有连续2小时。必做任务为备份1小时、数据迁移3小时、验收1小时，必须依次完成，不可并行、不可省略。目前三项都尚未开始。用户尚未授权任何执行。',topic:'今晚两小时能否完整完成数据迁移',questions:['当前条件下能否完成全部迁移？','若不能，如何缩小今晚目标并保留备份和验收要求？'],background:'只分析计划可行性，不执行任何操作，不假定增加人手或时间。',expectedOutput:'可行性结论、时间计算、前置条件、风险、缩小后的最小验证和待确认问题'}
};
if(!samples[scenario])throw new Error('Scenario must be learning, long-learning, comparison or feasibility');
const sample=samples[scenario];
const source=save('note',{title:'隔离调研样本：'+sample.title,content:sample.content});
const task=createResearchTask({executionMode:'research',opId:randomUUID(),references:[{kind:'note',id:source.id,revision:source.revision}],researchBrief:{topic:sample.topic,type:sample.type||scenario,questions:sample.questions,background:sample.background,expectedOutput:sample.expectedOutput,web:true}});
let checked;
try{
 await run(task);const planned=researchTaskView(task.id);if(planned.status!=='draft'||planned.artifacts.length)throw new Error('Approval gate failed');
 // This is an isolated acceptance fixture, never confirmation of a user task.
 const active=researchTaskAction(task.id,{action:'confirm',approved:true,opId:randomUUID(),revision:planned.revision,planVersion:planned.plan.version,planHash:researchPlanHash(planned.plan)});await run(active);
 const completed=researchTaskView(task.id);checked={checkedAt:new Date().toISOString(),passed:completed.status==='review'&&completed.artifacts.length===1,mode:'real-provider-isolated-graph',scenario,sample,approvalSimulated:true,plan:completed.plan,report:completed.artifacts[0],budget:completed.budget,limitations:['用户资料未使用；隔离测试人工确认由脚本模拟。','缺少搜索配置，验证的是模型知识降级，未验证真实联网。','未通过本脚本验证网页或BullMQ，相关证据在独立专项。']};
}catch(error){checked={checkedAt:new Date().toISOString(),passed:false,error:error.message,code:error.code,budget:researchTaskView(task.id).budget};}
await writeFile(destination,JSON.stringify(checked,null,2)+'\n',{flag:'wx',mode:0o600});db.prepare("DELETE FROM settings WHERE key='provider'").run();db.close();console.log(JSON.stringify({destination,passed:checked.passed,budget:checked.budget,error:checked.error}));if(!checked.passed)process.exitCode=1;
