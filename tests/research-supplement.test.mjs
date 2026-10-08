import {test} from 'node:test';
import assert from 'node:assert/strict';
import {MemorySaver,Command} from '@langchain/langgraph';
import {createResearchGraph} from '../server/agent/research/research-graph.mjs';
import {researchPlanHash} from '../server/agent/research/research-approval.mjs';
import {reportSections} from '../server/agent/research/research-contract.mjs';
test('confirmed graph supplements only uncovered questions once and rewrites with actual new evidence',async()=>{
 const brief={type:'learning',topic:'学习主题',questions:['问题一','问题二'],web:true},calls=[];
 const plan={goal:'理解主题',conditions:'只查原问题',known:[],unknown:['问题二'],steps:['取材'],deliverable:'学习报告'};
 const graph=createResearchGraph({checkpointer:new MemorySaver(),assertActive:()=>{},approved:()=>true,webStatus:()=>'',readEvidence:async()=>({evidence:[],notice:''}),supplementEvidence:async({questionIds})=>{calls.push(questionIds);return {evidence:[{id:'P2.2',sourceId:'https://example.com/2',kind:'web',title:'材料',url:'https://example.com/2',quote:'实际新增资料',start:0,end:6,total:6,revision:0,evidenceType:'web_page',retrievedAt:'2026-10-08T00:00:00Z'}],notice:'已补查'};},generate:async(step)=>{
  calls.push(step);if(step==='plan')return {content:JSON.stringify(plan)};
  return {content:JSON.stringify({sections:reportSections('learning').map(key=>({key,paragraphs:[{text:step==='report'?'阶段内容':'结合新材料的内容',basis:step==='report'?'model_knowledge':'evidence',sourceIds:step==='report'?[]:['P2.2']}]})),coverage:[{questionId:'Q1',status:'answered',reason:'已有解释'},{questionId:'Q2',status:'partial',reason:'仍须核对'}],actions:[]})};
 }});
 const config={configurable:{thread_id:'supplement-test'}};
 await graph.invoke({brief},config);assert.deepEqual(calls,['plan']);
 await graph.invoke(new Command({resume:{approved:true,planVersion:1,planHash:researchPlanHash({...plan,version:1})}}),config);
 const state=await graph.getState(config);assert.deepEqual(calls,['plan','report',['Q2'],'report-supplement']);assert.equal(state.next.length,0);assert.equal(state.values.supplementAttempt,1);assert.match(state.values.body,/结合新材料/);assert.equal(state.values.report.coverage[1].status,'partial');
});
