import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
const dir=mkdtempSync(join(tmpdir(),'xiaojiu-chat-agent-'));process.env.DATA_DIR=dir;process.env.SEED_DEMO='false';process.env.WORKER_MODE='true';
const {db,save,get,setSetting}=await import('../server/store.mjs');
const {startChatRun,chatRun,writeChatRun,chatBudget,chatRunView}=await import('../server/agent/chat-budget.mjs');
const {threadWebPolicy,saveThreadWebPolicy,withThreadWeb}=await import('../server/agent/chat-policy.mjs');
const {runChatAgent,recoverChatRun}=await import('../server/agent/chat-agent.mjs');
const {openSourceThread}=await import('../server/agent/source-threads.mjs');
const {saveSearchPricing}=await import('../server/agent/research/research-search-pricing.mjs');
const config={baseUrl:'https://api.deepseek.com',model:'deepseek-flash',apiKey:'fixture-only'};
setSetting('provider',config);
const oldLog=console.log;console.log=()=>{};
after(()=>{console.log=oldLog;db.close();rmSync(dir,{recursive:true,force:true});});
const thread=()=>save('thread',{title:'测试会话',status:'active'}).id;
const usage={prompt_tokens:20,completion_tokens:10,total_tokens:30};
function fakeRequest(replies){let calls=0;const request=async(_config,context,options)=>{await options.beforeDispatch({model:config.model,messages:context.messages,max_tokens:options.maxTokens});const content=await replies(calls++,context);return {model:config.model,usage,finishReason:content.some(c=>c.type==='toolCall')?'tool_calls':'stop',content:content.filter(c=>c.type==='text').map(c=>c.text).join(''),message:{role:'assistant',content,api:'openai-completions',provider:'xiaojiu',model:config.model,usage:{input:20,output:10,cacheRead:0,cacheWrite:0,totalTokens:30,cost:{input:0,output:0,cacheRead:0,cacheWrite:0,total:0}},stopReason:content.some(c=>c.type==='toolCall')?'toolUse':'stop',timestamp:Date.now()}};};return {request,calls:()=>calls};}
const tool=(name,args)=>({type:'toolCall',id:randomUUID(),name,arguments:args});
const text=value=>[{type:'text',text:value}];
const createRun=threadId=>{const id=randomUUID();startChatRun(id,{query:'PersonalAgent',threadId},threadId);return id;};
test('persistent budget: 6 calls, deadline, fee preflight, unknown price, no retry reset and one continuation',()=>{
 const threadId=thread(),id=randomUUID();startChatRun(id,{query:'a'},threadId,{clock:()=>1000});const ledger=chatBudget(id,{clock:()=>2000});
 for(let i=0;i<6;i++){const n=ledger.reserve('model',{maxCostMicros:1000});ledger.settle(n,null);}assert.throws(()=>ledger.reserve('model',{maxCostMicros:1}),/6 次/);assert.equal(startChatRun(id,{query:'a'},threadId).attempts.length,6);assert.throws(()=>startChatRun(id,{query:'b'},threadId),/其他问题/);
 const expired=chatBudget(id,{clock:()=>121001});assert.throws(()=>expired.check(),/2 分钟/);
 const fee=createRun(threadId),l=chatBudget(fee);l.reserve('search',{maxCostMicros:999999});assert.throws(()=>l.reserve('model',{maxCostMicros:2}),/剩余额度/);
 const unknown=createRun(threadId);assert.throws(()=>chatBudget(unknown).reserveModel({...config,model:'unknown'},{messages:[],max_tokens:100}),/价格/);assert.equal(chatBudget(unknown).state().calls,0);
 writeChatRun({...chatRun(id),status:'stopped',conversationId:save('conversation',{threadId,query:'中断回答',body:'中途结果'}).id});const child=randomUUID(),input={query:'继续',continueRunId:id};startChatRun(child,input,threadId);assert.equal(startChatRun(child,input,threadId).id,child);assert.throws(()=>startChatRun(randomUUID(),input,threadId),/已经提交/);assert.equal(chatRunView(child).totalCalls,6);
 const bound=randomUUID();startChatRun(bound,{query:'旧上下文'},threadId,{historyRevision:'old'});assert.throws(()=>startChatRun(bound,{query:'旧上下文'},threadId,{historyRevision:'new'}),/历史已变化/);assert.equal(chatRun(bound).attempts.length,0);
});
test('library source mapping survives revisions, separates IDs and rejects unreadable/deleted sources',()=>{
 const file=save('libraryFile',{title:'项目资料',content:'项目内容',status:'ready'}),opened=openSourceThread({kind:'libraryFile',id:file.id});save('libraryFile',{...file,title:'更名',content:'新正文'},file.revision);assert.equal(openSourceThread({kind:'libraryFile',id:file.id}).threadId,opened.threadId);assert.equal(openSourceThread({kind:'libraryFile',id:file.id}).reference.revision,2);const other=save('libraryFile',{title:'更名',content:'另一份',status:'ready'});assert.notEqual(openSourceThread({kind:'libraryFile',id:other.id}).threadId,opened.threadId);const pending=save('libraryFile',{title:'未解析',status:'pending'});assert.throws(()=>openSourceThread({kind:'libraryFile',id:pending.id}),/解析/);
});
test('web permissions are thread-local; closing cancels in-flight and prohibits next dispatch',async()=>{
 const a=thread(),b=thread();assert.equal(threadWebPolicy(a).webSearch,false);saveThreadWebPolicy(a,{revision:0,webSearch:true});assert.equal(threadWebPolicy(b).webSearch,false);let signal;const task=withThreadWeb(a,undefined,async value=>{signal=value;await new Promise(resolve=>value.addEventListener('abort',resolve,{once:true}));});saveThreadWebPolicy(a,{revision:1,webSearch:false});await task;assert.equal(signal.aborted,true);await assert.rejects(withThreadWeb(a,undefined,()=>assert.fail('no web request')),/关闭/);
});
test('actual Pi Agent executes source tool, synthesizes grounded answer and proposes manual memories within same budget',async()=>{
 const threadId=thread(),id=createRun(threadId);const note=save('note',{title:'PersonalAgent',content:'PersonalAgent 下一步接入工具循环',summary:'接入工具循环',status:'ready',tags:[]});const ref={id:note.id,kind:'note',title:note.title,quote:note.content,revision:note.revision,createdAt:note.createdAt};
 const fake=fakeRequest((n,context)=>{if(n===0)return [tool('read_source',{id:note.id,kind:'note',start:0,length:800})];if(n===1){assert.ok(context.messages.some(m=>m.role==='toolResult'));return text('根据已有项目记录，下一步是接入工具循环，先做小范围验证。[1]');}return text('{"items":[{"content":"用户持续开发 PersonalAgent"}]}');});
 const result=await runChatAgent({id,query:'我持续开发 PersonalAgent，下一步怎么做',scope:{threadId},selectedSources:[ref]},{...fake,config});assert.equal(result.agentRun.status,'completed',JSON.stringify(result));assert.equal(fake.calls(),3);assert.equal(result.agentRun.calls,3);assert.equal(result.proposals.items.length,1);assert.equal(get(note.id,'note').revision,1);
});
test('disabled web tool cannot dispatch; allowed search then disable preserves sources and finishes from them',async()=>{
 const threadId=thread(),id=createRun(threadId);let searches=0;
 const fake=fakeRequest(n=>n===0?[tool('web_search',{query:'最新项目'})]:n===1?text('联网未开启，目前只能根据已有知识分析；最新情况需要另外核实。'):text('{"items":[]}'));
 const result=await runChatAgent({id,query:'最新项目',scope:{threadId}},{...fake,config,search:async()=>{searches++;return [];}});assert.equal(searches,0);assert.equal(result.agentRun.status,'completed');assert.match(result.qualityNotice,/关闭/);
 setSetting('braveSearchKey','fixture-key');saveSearchPricing({revision:0,enabled:true,maxCostMicros:1000,reviewUntil:new Date(Date.now()+86400000).toISOString(),acknowledged:true});
 const second=thread();saveThreadWebPolicy(second,{revision:0,webSearch:true});const run=createRun(second);const replies=fakeRequest(n=>n===0?[tool('web_search',{query:'最新项目'})]:n===1?[tool('web_search',{query:'再查'})]:n===2?text('已取得一条搜索摘要，联网已关闭，因此仅作初步判断，细节仍待核实。[1]'):text('{"items":[]}'));
 const found=await runChatAgent({id:run,query:'最新项目',scope:{threadId:second}},{...replies,config,search:async()=>{searches++;saveThreadWebPolicy(second,{revision:1,webSearch:false});return [{id:'web-fixture',kind:'web',title:'来源',quote:'搜索摘要',url:'https://example.com',revision:0}];}});assert.equal(searches,1);assert.equal(found.sources.length,1);assert.equal(found.agentRun.status,'completed',JSON.stringify(found));
});
test('restart preserves reservations and returns partial result instead of silently paying again',async()=>{
 const threadId=thread(),id=createRun(threadId);chatBudget(id).reserve('model',{maxCostMicros:20000});recoverChatRun(id);const result=await runChatAgent({id,query:'继续',scope:{threadId}},{config,request:()=>assert.fail('must not dispatch')});assert.equal(result.agentRun.status,'stopped');assert.equal(result.agentRun.costMicros,20000);assert.match(result.qualityNotice,/重启/);
});

test('tool loop cannot exceed six paid generations and stopped history does not expire memory candidates',async()=>{
 const threadId=thread(),id=createRun(threadId);const fake=fakeRequest(()=>[tool('search_local',{query:'no-match'})]);const result=await runChatAgent({id,query:'no-match',scope:{threadId}},{...fake,config});assert.equal(result.agentRun.status,'stopped');assert.equal(fake.calls(),6);assert.equal(result.agentRun.calls,6);assert.match(result.qualityNotice,/6 次/);
 const {saveMemoryTurn}=await import('../server/domain/memory/memory-lifecycle.mjs');const {getSetting}=await import('../server/store.mjs');const first=saveMemoryTurn({threadId,query:'真实成功',body:'成功回答',memoryProposals:[{content:'候选'}],memoryReview:'pending'});for(let i=0;i<5;i++)saveMemoryTurn({...result,threadId,query:'未完成',memoryReview:'none'});assert.equal(getSetting('memory-turn-count:'+threadId),1);assert.equal(get(first.id,'conversation').memoryReview,'pending');
});
