import {DatabaseSync} from 'node:sqlite';
import {Annotation,StateGraph,START,END,interrupt} from '@langchain/langgraph';
import {z} from 'zod';
import {researchApprovalCommand,researchPlanHash} from '../../server/agent/research/research-approval.mjs';
import {ResearchCheckpointSaver} from '../../server/agent/research/research-checkpoints.mjs';
import {createResearchBudget} from '../../server/agent/research/research-budget.mjs';
const [filename,mode]=process.argv.slice(2),db=new DatabaseSync(filename);db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS research_test_artifacts(id TEXT PRIMARY KEY,body TEXT);');
const ledger=createResearchBudget(db),runId='research-fixture';ledger.initialize(runId);
const ensureActive=()=>{if(ledger.snapshot(runId).state!=='active')throw new Error('研究已取消');};
const saver=new ResearchCheckpointSaver(db,{assertWritable:ensureActive});
const state=Annotation.Root({plan:Annotation(),approved:Annotation(),report:Annotation()});
function step(name,cost,result){
 ensureActive();const reservation=ledger.reserve({runId,stepKey:name,requestHash:'stable-input-hash-for-'+name,priceVersion:'isolated-test-rate',maxCostMicros:cost,maxTimeMs:60000});
 if(reservation.replay)return reservation.attempt.result;
 ledger.settle({attemptId:reservation.attempt.id,actualCostMicros:cost/2,elapsedMs:100,result});return result;
}
const graph=new StateGraph(state).addNode('prepare_plan',()=>({plan:step('plan',200000,{question:'如何开始学习？',version:1})}))
 .addNode('confirm_plan',value=>{const decision=interrupt({plan:value.plan},{responseSchema:z.strictObject({approved:z.literal(true),planVersion:z.number().int(),planHash:z.string()})});ensureActive();if(!decision.approved||decision.planVersion!==value.plan.version||decision.planHash!==researchPlanHash(value.plan))throw new Error('必须确认当前版本计划');return {approved:true};})
 .addNode('research',value=>{ensureActive();if(!value.approved)throw new Error('未确认计划');return {report:step('research',300000,'有依据的学习路径草稿')};})
 .addNode('publish',value=>{ensureActive();db.prepare('INSERT INTO research_test_artifacts VALUES(?,?) ON CONFLICT(id) DO NOTHING').run(runId,value.report);return {};})
 .addEdge(START,'prepare_plan').addEdge('prepare_plan','confirm_plan').addEdge('confirm_plan','research').addEdge('research','publish').addEdge('publish',END).compile({checkpointer:saver});
const config={configurable:{thread_id:runId},durability:'sync'};
try{
 let result;
 if(mode==='start')result=await graph.invoke({},config);
 else if(mode==='confirm'||mode==='wrong-version'){const snapshot=await graph.getState(config);ensureActive();const command=researchApprovalCommand(snapshot,{approved:true,planVersion:mode==='confirm'?1:2,planHash:researchPlanHash(snapshot.values.plan)});result=await graph.invoke(command,config);}
 else if(mode==='cancel'){ledger.cancel(runId);result={cancelled:true};}
 else result=await graph.invoke(null,config);
 const current=await graph.getState(config);
 console.log(JSON.stringify({interrupted:!!result.__interrupt__?.length,next:current.next,plan:current.values.plan,report:current.values.report,budget:ledger.snapshot(runId),artifacts:db.prepare('SELECT count(*) n FROM research_test_artifacts').get().n,attempts:db.prepare('SELECT count(*) n FROM research_budget_attempts').get().n}));
}catch(error){console.log(JSON.stringify({error:error.message,budget:ledger.snapshot(runId),artifacts:db.prepare('SELECT count(*) n FROM research_test_artifacts').get().n}));process.exitCode=2;}finally{db.close();}
