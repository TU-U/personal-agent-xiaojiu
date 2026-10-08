import {test,after} from 'node:test';import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';import {randomUUID} from 'node:crypto';
const dir=await mkdtemp(join(tmpdir(),'research-app-'));process.env.DATA_DIR=dir;process.env.SEED_DEMO='false';process.env.WORKER_MODE='true';
const {db,all,save,get,getSetting,setSetting}=await import('../server/store.mjs');
const {collectResearchWeb}=await import('../server/agent/research/research-web.mjs');
const {saveSearchPricing}=await import('../server/agent/research/research-search-pricing.mjs');
const {fileJobs,queueConnection,backgroundQueueName}=await import('../server/jobs/file-jobs.mjs');
const {createResearchTask,researchTaskAction,researchTaskView,researchBudget}=await import('../server/agent/research/research-tasks.mjs');
const {createResearchHandlers}=await import('../server/agent/research/research-jobs.mjs');
const {retrieveResearchEvidence}=await import('../server/agent/research/research-retrieval.mjs');
const {researchPlanHash}=await import('../server/agent/research/research-approval.mjs');
const {parseResearchReport}=await import('../server/agent/research/research-contract.mjs');
const {quoteResearchModel}=await import('../server/agent/research/research-pricing.mjs');
const {REPORT_CLOSING_MICROS}=await import('../server/agent/research/research-limits.mjs');
const {createBackgroundQueue}=await import('../server/core/background-jobs.mjs');
const {petReminders}=await import('../server/pet/pet-reminders.mjs');
const {ensureRuns}=await import('../server/pet/supervision/work-tasks.mjs');
const brief={topic:'学习数据库事务',background:'有一篇学习笔记',questions:['事务是什么？'],constraints:'先了解基本原理',type:'learning',asOf:'',expectedOutput:'概念、路径和练习',web:true};
const plan={goal:'了解事务',conditions:'已有学习笔记',known:['有个人记录'],unknown:['尚未实操'],steps:['阅读原文','说明概念','给出练习'],deliverable:'学习路径'};
let calls=0;
async function generate({ledger,runId,stepKey,system,user}){
 const r=ledger.reserve({runId,stepKey,requestHash:researchPlanHash({system,user}),priceVersion:'test-synthetic',maxCostMicros:10000,maxTimeMs:10000});if(r.replay)return r.attempt.result;
 calls++;const input=JSON.parse(user),value=system.includes('规划助手')?plan:{sections:input.sections.map(key=>({key,paragraphs:[{text:'事务把一组操作作为整体处理；请用练习核对理解。',basis:input.evidence.length?'evidence':'model_knowledge',sourceIds:input.evidence.map(e=>e.id)}]})),coverage:input.questions.map(q=>({questionId:q.id,status:'answered',reason:'已解释原理，实践尚待完成。'})),actions:[{title:'练习回滚',description:'在测试库尝试事务回滚',kind:'action'}]};
 const result={content:JSON.stringify(value)};ledger.settle({attemptId:r.attempt.id,actualCostMicros:500,elapsedMs:10,result});return result;
}
const handlers=createResearchHandlers({generate});
function create(patch={}){return createResearchTask({executionMode:'research',opId:randomUUID(),researchBrief:brief,...patch});}
async function run(task,commit=true,h=handlers){const job=fileJobs.claim(task.researchJobId,randomUUID(),60000);assert.ok(job);const result=await h.research.run(job);if(commit)assert.equal(fileJobs.finish(job.id,job.lease_token,result,h.research.commit),true);return {job,result};}
function confirm(task){return researchTaskAction(task.id,{action:'confirm',opId:randomUUID(),revision:task.revision,approved:true,planVersion:task.plan.version,planHash:researchPlanHash(task.plan)});}
after(async()=>{db.close();await rm(dir,{recursive:true,force:true});});
test('web evidence follows approval, explicit web retry keeps report history and cumulative charges',async()=>{
 const previousKey=getSetting('braveSearchKey',''),previousPricing=getSetting('researchSearchPricing',null);setSetting('braveSearchKey','test-web-key');
 const pricing=saveSearchPricing({revision:0,enabled:true,maxCostMicros:50000,reviewUntil:new Date(Date.now()+86400000).toISOString(),acknowledged:true});let searches=0;
 const h=createResearchHandlers({generate,collectWeb:args=>collectResearchWeb({...args,key:'test-web-key',pricing,search:async query=>{searches++;return {query,retrievedAt:new Date().toISOString(),results:[{title:'网页摘要样本',url:'https://example.org/transactions',quote:'事务回滚'}]};},read:async url=>({url,text:'实际网页文字样本',start:0,end:8,total:8,truncated:false,contentHash:'a'.repeat(64),readAt:new Date().toISOString()})})});
 try{
  const task=create();await run(task,true,h);assert.equal(searches,0);await run(confirm(get(task.id,'workTask')),true,h);
  const first=researchTaskView(task.id);assert.equal(searches,1);assert.equal(first.artifacts[0].sources[0].evidenceType,'search_snippet');assert.equal(first.artifacts[0].sources[1].evidenceType,'web_page');assert.equal(first.budget.chargedMicros,51000);assert.ok(db.prepare("SELECT count(*) n FROM research_budget_attempts WHERE run_id=? AND step_key LIKE 'processing:%' AND state='settled'").get(task.id).n>0);assert.equal(first.budget.pendingAttempts,0);
  const action={action:'retry_web',opId:randomUUID(),revision:first.revision},retry=researchTaskAction(task.id,action);assert.equal(researchTaskAction(task.id,action).researchJobId,retry.researchJobId);await run(retry,true,h);
  const second=researchTaskView(task.id);assert.equal(searches,2);assert.equal(second.artifacts.length,2);assert.equal(second.artifacts[0].body,first.artifacts[0].body);assert.equal(second.budget.chargedMicros,101500);
 }finally{setSetting('braveSearchKey',previousKey);setSetting('researchSearchPricing',previousPricing);}
});
test('failed web refresh retains old evidence through the persisted graph and report publication',async()=>{
 let collection=0;
 const old={id:'P1',kind:'web',sourceId:'https://example.org/history',url:'https://example.org/history',title:'先前网页',revision:0,evidenceType:'web_page',quote:'旧网页证据',start:0,end:5,total:5,truncated:false,contentHash:'a'.repeat(64),retrievedAt:'2026-10-01T00:00:00Z'};
 const h=createResearchHandlers({generate,retrieve:async()=>({evidence:[],notice:''}),collectWeb:async()=>++collection===1?{evidence:[old],notice:''}:{evidence:[],notice:'联网超时，缺失部分使用模型已有知识，未联网核验。'}});
 const task=create();await run(task,true,h);await run(confirm(get(task.id,'workTask')),true,h);
 const first=researchTaskView(task.id),original=structuredClone(first.artifacts[0]);
 let current=researchTaskAction(task.id,{action:'handoff',opId:randomUUID(),revision:first.revision,brief:'补查最新变化'});
 current=researchTaskAction(task.id,{action:'external',opId:randomUUID(),revision:current.revision,handoffId:current.handoff.id,text:'用户补充：这个网页可能已经变化，请核对。',urls:[]});
 await run(current,true,h);
 const final=researchTaskView(task.id);assert.equal(collection,2);assert.equal(final.artifacts.length,2);assert.deepEqual(final.artifacts[0],original);
 const retained=final.artifacts[1].sources.find(e=>e.kind==='web');assert.ok(retained);assert.equal(retained.retainedFromPrevious,true);assert.equal(retained.retrievedAt,old.retrievedAt);assert.equal(retained.quote,old.quote);assert.equal(retained.contentHash,old.contentHash);
 assert.ok(final.artifacts[1].sources.some(e=>e.evidenceType==='user_fill'));assert.match(final.artifacts[1].body,/联网超时/);assert.match(final.artifacts[1].body,/非本轮重新取材/);assert.equal(final.budget.chargedMicros,1500);
});
test('large stored web evidence is bounded for the model while original sources and exact analyzed ranges survive publication',async()=>{
 const text='中文网页材料🙂。'.repeat(12000),evidence=Array.from({length:3},(_,i)=>({id:'P'+i,kind:'web',sourceId:'https://example.org/long/'+i,url:'https://example.org/long/'+i,title:'长网页'+i,revision:0,evidenceType:'web_page',quote:text,start:0,end:text.length,total:text.length,truncated:false,contentHash:String(i).repeat(64),retrievedAt:'2026-10-08T00:00:00Z'}));
 let reportInput;
 const h=createResearchHandlers({generate:args=>{if(args.stepKey.startsWith('report:')){assert.ok(Buffer.byteLength(args.user)<=128000);assert.ok(Buffer.byteLength(args.system)<=4096);reportInput=JSON.parse(args.user);assert.ok(quoteResearchModel({baseUrl:'https://api.deepseek.com',model:'deepseek-flash'},args.system,args.user,{maxTokens:args.maxTokens,now:Date.parse('2026-10-08T00:00:00Z')}).maxCostMicros<=REPORT_CLOSING_MICROS);}return generate(args);},retrieve:async()=>({evidence:[],notice:''}),collectWeb:async()=>({evidence,notice:''})});
 const task=create();await run(task,true,h);await run(confirm(get(task.id,'workTask')),true,h);
 const artifact=researchTaskView(task.id).artifacts[0];assert.equal(artifact.sources.length,3);assert.equal(artifact.sources[0].quote,text);assert.equal(artifact.reportContext.excerpted,3);assert.equal(artifact.reportContext.included,3);
 assert.match(artifact.body,/不能声称全部读完/);for(const e of reportInput.evidence){assert.equal(e.quote,text.slice(e.start,e.end));assert.ok(e.end<text.length);assert.deepEqual(artifact.reportContext.sources.find(s=>s.id===e.id),{id:e.id,start:e.start,end:e.end});}
});
test('hybrid evidence enters the confirmed graph and changed automatic sources prevent artifact publication',async()=>{
 const source=save('note',{title:'自动发现的材料',content:'失败时回滚整个事务。'});let searches=0;
 const h=createResearchHandlers({generate,retrieve:args=>retrieveResearchEvidence({...args,config:{indexProfile:'qwen3-local-v1',model:'qwen3-embedding-0.6b',embedding:'http://127.0.0.1:4320/v1',qdrant:'http://127.0.0.1:6333'},search:async()=>{searches++;const current=get(source.id,'note');return [{...current,kind:'note',start:0,end:current.content.length}];}})});
 const task=create();await run(task,true,h);assert.equal(searches,0);
 const active=confirm(get(task.id,'workTask')),{job,result}=await run(active,false,h);assert.equal(searches,1);assert.equal(result.evidence[0].sourceId,source.id);assert.match(result.body,/语义与词项混合检索/);
 save('note',{...source,content:'保存前已经修改'},source.revision);
 assert.throws(()=>fileJobs.finish(job.id,job.lease_token,result,h.research.commit),/已修改/);assert.equal(researchTaskView(task.id).artifacts.length,0);
 fileJobs.fail(job.id,job.lease_token,'来源已修改');
 const before=researchTaskView(task.id),retried=researchTaskAction(task.id,{action:'retry',opId:randomUUID(),revision:before.revision});await run(retried,true,h);
 const finished=researchTaskView(task.id);assert.equal(searches,2);assert.equal(finished.artifacts.length,1);assert.equal(finished.artifacts[0].sources[0].revision,source.revision+1);assert.match(finished.artifacts[0].body,/旧片段不再采用/);assert.ok(finished.budget.chargedMicros>before.budget.chargedMicros);
});
test('confirmed long-document research publishes late relevant passages with exact versioned locators',async()=>{
 const content='无关的背景记录。\n'.repeat(1700)+'\n事务回滚：失败后撤销全部修改。\n';
 const source=save('note',{title:'长文学习资料',content});
 const task=create({researchBrief:{...brief,questions:['事务回滚是什么？']},references:[{id:source.id,kind:'note',revision:source.revision}]});
 await run(task);await run(confirm(get(task.id,'workTask')));
 const artifact=researchTaskView(task.id).artifacts[0],late=artifact.sources.find(s=>s.quote.includes('事务回滚：'));
 assert.ok(late);assert.ok(late.start>8000);assert.equal(late.revision,source.revision);assert.equal(late.quote,content.slice(late.start,late.end));
 assert.equal(late.selectionMethod,'keyword_scan');assert.match(artifact.body,/关键词扫描全文选段/);
 assert.ok(artifact.sources.reduce((sum,s)=>sum+s.quote.length,0)<=8000);
});
test('create is atomic/idempotent, rejects stale refs, and has no supervision run before or after approval',async()=>{
 const source=save('note',{title:'原文',content:'事务：全部成功才提交，否则回滚。'}),body={executionMode:'research',opId:randomUUID(),references:[{id:source.id,kind:'note',revision:source.revision}],researchBrief:brief};
 const task=createResearchTask(body);assert.equal(createResearchTask(body).id,task.id);assert.throws(()=>createResearchTask({...body,researchBrief:{...brief,topic:'changed'}}),/操作编号/);
 const before=calls;await run(task);assert.equal(calls,before+1);const ready=get(task.id,'workTask');assert.equal(ready.status,'draft');assert.equal(all('artifact').filter(a=>a.taskId===task.id).length,0);
 ensureRuns();assert.equal(all('workRun').filter(r=>r.taskId===task.id).length,0);
 const prompts=petReminders({clock:()=>Date.parse('2026-10-07T02:00:00Z')});assert.ok(prompts.items.some(i=>i.sourceId===task.id&&i.category==='research-plan'));
 assert.throws(()=>researchTaskAction(task.id,{action:'confirm',opId:randomUUID(),revision:ready.revision,approved:true,planVersion:2,planHash:researchPlanHash(ready.plan)}),/当前版本/);
 const active=confirm(ready);ensureRuns();assert.equal(all('workRun').filter(r=>r.taskId===task.id).length,0);
 await run(active);const completed=researchTaskView(task.id);assert.equal(completed.status,'review');assert.equal(completed.artifacts.length,1);assert.equal(calls,before+2);assert.equal(completed.artifacts[0].sources[0].id,source.id);assert.match(completed.artifacts[0].body,/未联网核验/);assert.equal(completed.artifacts[0].actionCandidates[0].kind,'action');assert.equal(all('event').length,0);
 assert.throws(()=>create({references:[{id:source.id,kind:'note',revision:999}]}),/版本已变化/);
});
test('graph checkpoint after model completion recovers without duplicate payment or artifact',async()=>{
 const task=create();await run(task);const active=confirm(get(task.id,'workTask')),before=calls;
 const {job}=await run(active,false);assert.equal(calls,before+1);assert.equal(all('artifact').filter(a=>a.taskId===task.id).length,0);
 fileJobs.fail(job.id,job.lease_token,'模拟成果提交前中断');
 const current=get(task.id,'workTask'),retried=researchTaskAction(task.id,{action:'retry',opId:randomUUID(),revision:current.revision});
 await run(retried);assert.equal(calls,before+1);assert.equal(all('artifact').filter(a=>a.taskId===task.id).length,1);assert.equal(researchBudget().snapshot(task.id).chargedMicros,1000);
});
test('cancelled/changed-source job cannot publish a late result or bypass old task actions',async()=>{
 const source=save('note',{title:'版本检查',content:'原始资料'}),task=create({references:[{id:source.id,kind:'note',revision:source.revision}]});await run(task);const active=confirm(get(task.id,'workTask'));
 const {job,result}=await run(active,false);save('note',{...source,content:'资料已修改'},source.revision);
 assert.throws(()=>fileJobs.finish(job.id,job.lease_token,result,handlers.research.commit),/版本已变化/);assert.equal(all('artifact').filter(a=>a.taskId===task.id).length,0);
 const current=get(task.id,'workTask');researchTaskAction(task.id,{action:'cancel',opId:randomUUID(),revision:current.revision});assert.equal(fileJobs.finish(job.id,job.lease_token,result,handlers.research.commit),false);assert.equal(researchBudget().snapshot(task.id).state,'cancelled');
 const {runWorkTask}=await import('../server/pet/supervision/work-tasks.mjs');await assert.rejects(runWorkTask(task.id),/共享后台队列/);
});
test('budget exhaustion publishes explicit program progress without a final model request',async()=>{
 const task=create();await run(task);const ledger=researchBudget(),left=ledger.snapshot(task.id).remainingMicros;
 const reservation=ledger.reserve({runId:task.id,stepKey:'fixture-spent',requestHash:'synthetic-budget-boundary',priceVersion:'synthetic',maxCostMicros:left,maxTimeMs:100});ledger.settle({attemptId:reservation.attempt.id,actualCostMicros:left,elapsedMs:10});
 const active=confirm(get(task.id,'workTask')),before=calls;await run(active);const detail=researchTaskView(task.id);
 assert.equal(calls,before);assert.equal(detail.artifacts[0].mode,'local');assert.equal(detail.artifacts[0].template,'调研阶段进度');assert.match(detail.artifacts[0].body,/程序保存的阶段进度/);assert.doesNotMatch(detail.artifacts[0].body,/模型已有知识，未联网核验/);assert.equal(detail.budget.chargedMicros,1000000);
});
test('cancellation reaches the active graph call and prevents late publication',async()=>{
 const task=create();await run(task);const active=confirm(get(task.id,'workTask'));
 let entered;const ready=new Promise(resolve=>{entered=resolve;});
 const h=createResearchHandlers({generate:args=>new Promise((_resolve,reject)=>{entered();args.signal.addEventListener('abort',()=>reject(new Error('aborted by task cancellation')),{once:true});})});
 const job=fileJobs.claim(active.researchJobId,randomUUID(),60000),running=h.research.run(job);await ready;
 researchTaskAction(task.id,{action:'cancel',opId:randomUUID(),revision:get(task.id,'workTask').revision});await assert.rejects(running,/aborted/);
 assert.equal(all('artifact').filter(a=>a.taskId===task.id).length,0);assert.equal(get(task.id,'workTask').status,'cancelled');
});
test('report validator rejects invented sources, wrong coverage, and model-set authority fields',()=>{
 const r={sections:['conclusion','concepts','path','exercise','unknown'].map(key=>({key,paragraphs:[{text:'一般原理',basis:'model_knowledge',sourceIds:[]}]})),coverage:[{questionId:'Q1',status:'partial',reason:'未实践'}],actions:[]};
 assert.ok(parseResearchReport(JSON.stringify(r),brief,[]));
 assert.throws(()=>parseResearchReport(JSON.stringify({...r,priority:'high'}),brief,[]),/格式无效/);
 assert.throws(()=>parseResearchReport(JSON.stringify({...r,coverage:[{questionId:'Q9',status:'answered',reason:'虚构'}]}),brief,[]),/覆盖表/);
 const invented=structuredClone(r);invented.sections[0].paragraphs[0]={text:'虚构引用',basis:'evidence',sourceIds:['fake']};assert.throws(()=>parseResearchReport(JSON.stringify(invented),brief,[]),/未取得/);
});
test('explicit web handoff preserves budget, resumes the same graph with unverified user input, and keeps report versions',async()=>{
 const task=create();await run(task);let current=confirm(get(task.id,'workTask'));await run(current);
 current=get(task.id,'workTask');const original=researchTaskView(task.id).artifacts[0],before=researchBudget().snapshot(task.id),beforeCalls=calls;
 assert.match(researchTaskView(task.id).handoffBrief,/请严格按此格式回答/);
 const handoffBody={action:'handoff',opId:randomUUID(),revision:current.revision,brief:'我编辑过的网页搜索背景与关键问题'};
 let waiting=researchTaskAction(task.id,handoffBody);assert.equal(researchTaskAction(task.id,handoffBody).id,task.id);assert.equal(waiting.status,'waiting');assert.equal(waiting.handoff.text,handoffBody.brief);assert.deepEqual(researchBudget().snapshot(task.id),before);assert.equal(calls,beforeCalls);
 assert.throws(()=>researchTaskAction(task.id,{action:'external',opId:randomUUID(),revision:waiting.revision,handoffId:randomUUID(),text:'旧接力结果',urls:[]}),/接力已变化/);
 assert.throws(()=>researchTaskAction(task.id,{action:'external',opId:randomUUID(),revision:waiting.revision,handoffId:waiting.handoff.id,text:'非法链接',urls:['javascript:alert(1)']}),/格式无效/);
 const body={action:'external',opId:randomUUID(),revision:waiting.revision,handoffId:waiting.handoff.id,text:'网页带回的资料：回滚取消未提交的修改。该说法需核对原文。',urls:['https://example.org/transaction']};
 current=researchTaskAction(task.id,body);const duplicate=researchTaskAction(task.id,body);assert.equal(current.researchJobId,duplicate.researchJobId);assert.equal(all('researchExternal').filter(s=>s.taskId===task.id).length,1);assert.equal(current.researchReportVersion,2);
 const {job}=await run(current,false);assert.equal(calls,beforeCalls+1);
 fileJobs.fail(job.id,job.lease_token,'模拟第二版报告提交前中断');current=researchTaskAction(task.id,{action:'retry',opId:randomUUID(),revision:get(task.id,'workTask').revision});await run(current);
 const final=researchTaskView(task.id);assert.equal(calls,beforeCalls+1);assert.equal(final.id,task.id);assert.equal(final.artifacts.length,2);assert.deepEqual(final.artifacts[0],original);assert.equal(final.artifacts[1].researchReportVersion,2);assert.equal(final.artifacts[1].previousArtifactId,original.id);assert.match(final.artifacts[1].body,/用户回填，未独立核验/);assert.match(final.artifacts[1].body,/链接未由应用读取/);
 const external=final.artifacts[1].sources.find(s=>s.evidenceType==='user_fill');assert.equal(external.verificationStatus,'unverified');assert.equal(external.retrievedAt,undefined);assert.ok(external.providedAt);assert.equal(final.budget.chargedMicros,before.chargedMicros+500);
 current=researchTaskAction(task.id,{action:'handoff',opId:randomUUID(),revision:final.revision,brief:'新的补查简报'});const closed=researchTaskAction(task.id,{action:'end_handoff',opId:randomUUID(),revision:current.revision,handoffId:current.handoff.id});assert.equal(closed.status,'review');assert.equal(closed.handoff.state,'closed');assert.equal(closed.handoffHistory[0].state,'received');assert.equal(calls,beforeCalls+1);
});
test('handoff never bypasses initial approval or launches while work is active',async()=>{
 const task=create();await run(task);let current=get(task.id,'workTask');assert.throws(()=>researchTaskAction(task.id,{action:'handoff',opId:randomUUID(),revision:current.revision,brief:'未确认先搜索'}),/先确认/);
 current=confirm(current);assert.throws(()=>researchTaskAction(task.id,{action:'handoff',opId:randomUUID(),revision:current.revision,brief:'仍在排队'}),/等待当前调研/);
 await run(current);
});
test('failed generation can accept external input without losing its prior charges or creating a second task',async()=>{
 const task=create();await run(task);let current=confirm(get(task.id,'workTask'));
 const job=fileJobs.claim(current.researchJobId,randomUUID(),60000);
 const failing=createResearchHandlers({generate:async args=>{const reservation=args.ledger.reserve({runId:args.runId,stepKey:args.stepKey,requestHash:researchPlanHash(args.user),priceVersion:'unknown-usage-test',maxCostMicros:10000,maxTimeMs:1000});args.ledger.settle({attemptId:reservation.attempt.id,actualCostMicros:null,elapsedMs:10,error:'模型网络中断'});throw new Error('模型网络中断');}});
 await assert.rejects(failing.research.run(job),/模型网络中断/);fileJobs.fail(job.id,job.lease_token,'模型网络中断');const charged=researchBudget().snapshot(task.id).chargedMicros;assert.equal(charged,10500);
 current=researchTaskAction(task.id,{action:'handoff',opId:randomUUID(),revision:get(task.id,'workTask').revision,brief:'请带回可核对资料'});assert.equal(researchTaskView(task.id).status,'waiting');
 current=researchTaskAction(task.id,{action:'external',opId:randomUUID(),revision:current.revision,handoffId:current.handoff.id,text:'没有链接的手工补充；来源仍待核对。',urls:[]});await run(current);const done=researchTaskView(task.id);assert.equal(done.artifacts.length,1);assert.equal(done.artifacts[0].researchReportVersion,2);assert.equal(done.artifacts[0].previousArtifactId,null);assert.equal(done.budget.chargedMicros,charged+500);assert.match(done.artifacts[0].body,/未提供来源链接/);
});
test('exhausted budget keeps old evidence and newly supplied material without calling a model',async()=>{
 const source=save('note',{title:'预算边界原文',content:'已取得的原文不能丢弃'}),task=create({references:[{kind:'note',id:source.id,revision:source.revision}]});await run(task);let current=confirm(get(task.id,'workTask'));await run(current);
 const ledger=researchBudget(),left=ledger.snapshot(task.id).remainingMicros,r=ledger.reserve({runId:task.id,stepKey:'spent-all',requestHash:'explicit-boundary-fixture',priceVersion:'synthetic',maxCostMicros:left,maxTimeMs:100});ledger.settle({attemptId:r.attempt.id,actualCostMicros:left,elapsedMs:10});const before=calls;
 current=researchTaskAction(task.id,{action:'handoff',opId:randomUUID(),revision:get(task.id,'workTask').revision,brief:'补充资料后保留'});current=researchTaskAction(task.id,{action:'external',opId:randomUUID(),revision:current.revision,handoffId:current.handoff.id,text:'新带回的资料，不允许因预算耗尽而丢失。',urls:[]});await run(current);
 const final=researchTaskView(task.id);assert.equal(calls,before);assert.equal(final.artifacts[1].mode,'local');assert.equal(final.artifacts[1].sources[0].quote,source.content);assert.equal(final.externalMaterials.length,1);assert.equal(final.externalMaterials[0].available,true);assert.equal(get(final.externalReferences[0].id,'researchExternal').text,'新带回的资料，不允许因预算耗尽而丢失。');
});
test('handoff brief preserves long thread context and distinguishes assistant advice without an extra model call',()=>{
 const thread=save('thread',{title:'长背景',status:'active'});save('conversation',{threadId:thread.id,query:'用户明确背景',body:'这是历史建议。'.repeat(2800)});
 const before=calls,task=create({threadId:thread.id,researchBrief:{...brief,background:'背景'.repeat(3000),constraints:'约束'.repeat(2000),questions:Array.from({length:8},(_,i)=>('问题'+i).padEnd(500,'问')),expectedOutput:'结论'.repeat(1000)}});
 const text=researchTaskView(task.id).handoffBrief;assert.match(text,/用户明确背景/);assert.match(text,/助手建议（未独立核验，不代表用户事实）/);assert.ok(text.length>20000&&text.length<=64000);assert.equal(calls,before);
 researchTaskAction(task.id,{action:'cancel',opId:randomUUID(),revision:task.revision});
});
test('real Redis/BullMQ executes actual persisted graph then releases worker at manual approval',async()=>{
 const task=create(),errors=[];const service=createBackgroundQueue({repository:fileJobs,handlers,connection:queueConnection,name:backgroundQueueName,onError:e=>errors.push(e.message),concurrency:1});
 try{
  await service.dispatch();const deadline=Date.now()+15000;
  while(fileJobs.get(task.researchJobId).state!=='completed'&&Date.now()<deadline)await new Promise(resolve=>setTimeout(resolve,100));
  assert.equal(fileJobs.get(task.researchJobId).state,'completed',JSON.stringify(errors));assert.equal(get(task.id,'workTask').status,'draft');
  const active=confirm(get(task.id,'workTask'));await service.dispatch();
  while(fileJobs.get(active.researchJobId).state!=='completed'&&Date.now()<deadline)await new Promise(resolve=>setTimeout(resolve,100));
  assert.equal(fileJobs.get(active.researchJobId).state,'completed',JSON.stringify(errors));assert.equal(researchTaskView(task.id).artifacts.length,1);
 }finally{await service.queue.obliterate({force:true});await service.close();}
});

test('closing handoff preserves existing report after source edits without resuming stale research',async()=>{
 const note=save('note',{title:'原始资料',content:'事务需要整体提交或回滚。'});
 const task=create({researchBrief:{...brief,web:false},references:[{kind:'note',id:note.id,revision:note.revision}]});
 const local=createResearchHandlers({generate,retrieve:async()=>({evidence:[],notice:''})});
 await run(task,true,local);await run(confirm(get(task.id,'workTask')),true,local);
 let current=get(task.id,'workTask');const original=researchTaskView(task.id).artifacts[0];
 current=researchTaskAction(task.id,{action:'handoff',opId:randomUUID(),revision:current.revision,brief:'核对事务例子'});
 const budget=researchBudget().snapshot(task.id),beforeCalls=calls,jobId=current.researchJobId;
 save('note',{...get(note.id,'note'),content:'已经修订的资料'},note.revision);
 assert.throws(()=>researchTaskAction(task.id,{action:'external',opId:randomUUID(),revision:current.revision,handoffId:current.handoff.id,text:'新增网页信息',urls:[]}),/版本已变化/);
 assert.throws(()=>researchTaskAction(task.id,{action:'end_handoff',opId:randomUUID(),revision:current.revision,handoffId:randomUUID()}),/接力已变化/);
 const body={action:'end_handoff',opId:randomUUID(),revision:current.revision,handoffId:current.handoff.id};
 const closed=researchTaskAction(task.id,body);assert.equal(closed.status,'review');assert.equal(closed.handoff.state,'closed');
 assert.equal(researchTaskAction(task.id,body).revision,closed.revision);
 assert.equal(closed.researchJobId,jobId);assert.equal(calls,beforeCalls);assert.deepEqual(researchBudget().snapshot(task.id),budget);
 assert.deepEqual(researchTaskView(task.id).artifacts[0],original);
});

test('invalid generated plan logs a safe validation failure with task and job identity',async()=>{
 const {recentAiEvents}=await import('../server/core/ai-log.mjs');
 const task=create(),h=createResearchHandlers({generate:async()=>({content:JSON.stringify({...plan,steps:Array.from({length:9},()=> '不得记录的正文哨兵')})})});
 await assert.rejects(run(task,true,h),/步骤/);
 const event=recentAiEvents().find(e=>e.kind==='research-validation'&&e.taskId===task.id);
 assert.ok(event);assert.equal(event.jobId,task.researchJobId);assert.equal(event.phase,'plan');assert.equal(event.code,'RESEARCH_OUTPUT');assert.ok(event.fields.includes('步骤'));
 assert.equal(JSON.stringify(event).includes('不得记录的正文哨兵'),false);
 assert.equal(all('artifact').filter(a=>a.taskId===task.id).length,0);
});
