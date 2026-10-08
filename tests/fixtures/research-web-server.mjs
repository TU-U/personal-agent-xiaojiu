// Explicit Playwright-only entry point; no runtime test switches or bypasses in
// production modules. Real HTTP API, SQLite, graph and Redis; model is synthetic.
process.env.FILE_WORKER_ENABLED='false';process.env.WORKER_MODE='true';
await import('../../server/index.mjs');
const {collectResearchWeb}=await import('../../server/agent/research/research-web.mjs');
const {createResearchHandlers}=await import('../../server/agent/research/research-jobs.mjs');
const {createBackgroundQueue}=await import('../../server/core/background-jobs.mjs');
const {fileJobs,queueConnection,backgroundQueueName}=await import('../../server/jobs/file-jobs.mjs');
const {researchPlanHash}=await import('../../server/agent/research/research-approval.mjs');
const handlers=createResearchHandlers({collectWeb:args=>collectResearchWeb({...args,search:async query=>({query,retrievedAt:new Date().toISOString(),results:[{title:'事务搜索摘要样本',url:'https://example.org/transactions',quote:'事务回滚的搜索摘要。'}]}),read:async url=>({url,text:'事务回滚的网页文字样本。',start:0,end:14,total:14,truncated:false,contentHash:'a'.repeat(64),readAt:new Date().toISOString()})}),generate:async({ledger,runId,stepKey,system,user})=>{
 const request=ledger.reserve({runId,stepKey,requestHash:researchPlanHash({system,user}),priceVersion:'browser-synthetic',maxCostMicros:10000,maxTimeMs:10000});if(request.replay)return request.attempt.result;
 const input=JSON.parse(user),data=system.includes('规划助手')?{goal:input.topic,conditions:'结合所选记录，优先解释原理',known:['有文字笔记'],unknown:['尚未实操'],steps:['读材料','解释概念','给出练习'],deliverable:input.expectedOutput}:{sections:input.sections.map(key=>({key,paragraphs:[{text:'事务应保证一组操作一起提交或者回滚。练习应在测试库进行。',basis:input.evidence.length?'evidence':'model_knowledge',sourceIds:input.evidence.slice(0,8).map(e=>e.id)}]})),coverage:input.questions.map(q=>({questionId:q.id,status:'partial',reason:'原理已解释，实践尚待用户完成。'})),actions:[{title:"练习事务回滚",description:"在测试库执行回滚并记录结果。",kind:"action"},{title:"安排事务学习",description:"核对学习计划和练习结果。",kind:"event"}]};
 const result={content:JSON.stringify(data)};ledger.settle({attemptId:request.attempt.id,actualCostMicros:500,elapsedMs:30,result});return result;
}});
const service=createBackgroundQueue({repository:{...fileJobs,pending:()=>fileJobs.pending().filter(j=>j.kind==='research')},handlers,connection:queueConnection,name:backgroundQueueName,concurrency:1});
const timer=setInterval(()=>void service.dispatch(),100);timer.unref();
process.once('SIGTERM',()=>{clearInterval(timer);void service.close();});
