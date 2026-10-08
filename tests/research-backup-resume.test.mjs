import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {Command} from '@langchain/langgraph';
import {ResearchCheckpointSaver} from '../server/agent/research/research-checkpoints.mjs';
import {createResearchGraph} from '../server/agent/research/research-graph.mjs';
import {researchPlanHash} from '../server/agent/research/research-approval.mjs';
import {reportSections} from '../server/agent/research/research-contract.mjs';
import {createBackup,restoreBackup} from '../server/core/backups/backups.mjs';
const root=await mkdtemp(join(tmpdir(),'research-backup-resume-')),dataDir=join(root,'data');
Object.assign(process.env,{DATA_DIR:dataDir,SEED_DEMO:'false',WORKER_MODE:'true'});
const {db,save}=await import('../server/store.mjs');
after(async()=>{db.close();await rm(root,{recursive:true,force:true});});
test('portable backup resumes a real persisted research graph only after plan confirmation',async()=>{
 const task=save('workTask',{title:'学习备份原理',kind:'research',status:'awaiting_confirmation'});
 const calls=[],brief={type:'learning',topic:task.title,questions:['如何恢复？'],web:false};
 const plan={goal:'理解恢复',conditions:'离线知识说明',known:[],unknown:['恢复流程'],steps:['整理'],deliverable:'学习报告'};
 const config={configurable:{thread_id:task.id}};
 const dependencies={assertActive:()=>{},approved:()=>true,webStatus:()=>'',readEvidence:async()=>({evidence:[],notice:'未联网'}),generate:async(step)=>{
  calls.push(step);return {content:JSON.stringify(step==='plan'?plan:{sections:reportSections('learning').map(key=>({key,paragraphs:[{text:'恢复后的说明',basis:'model_knowledge',sourceIds:[]}]})),coverage:[{questionId:'Q1',status:'answered',reason:'已解释'}],actions:[]})};
 }};
 const graph=createResearchGraph({...dependencies,checkpointer:new ResearchCheckpointSaver(db)});
 await graph.invoke({brief},config);
 const waiting=await graph.getState(config);assert.deepEqual(waiting.next,['confirm_plan']);assert.deepEqual(calls,['plan']);
 const project=save('project',{title:'PersonalAgent'}),category=save('noteCategory',{title:'项目记录',projectId:project.id});
 const note=save('note',{title:'学习记录',categoryId:category.id,projectId:project.id,attachments:[]});
 const thread=save('thread',{title:'独立话题'});
 save('sourceThread',{sourceKind:'note',sourceId:note.id,threadId:thread.id});
 const run=save('workRun',{taskId:task.id,status:'review',evidence:'学习笔记'});
 save('supervisionEvidenceCheck',{taskId:task.id,runId:run.id,state:'accepted'});
 save('supervisionRecap',{taskId:task.id,text:'复盘'});
 save('audioTranscriptVersion',{noteId:note.id,transcript:{revision:1,segments:[{text:'录音文本'}]}});
 const originalRows=db.prepare('SELECT id,kind,data,revision FROM entities ORDER BY id').all();
 const directory=join(root,'backup'),destination=join(root,'restored');
 await createBackup({dataDir,destination:directory});await restoreBackup({directory,destination});
 const restored=new DatabaseSync(join(destination,'shiguang.sqlite'));
 try{
  assert.deepEqual(restored.prepare('SELECT id,kind,data,revision FROM entities ORDER BY id').all(),originalRows);
  const resumed=createResearchGraph({...dependencies,checkpointer:new ResearchCheckpointSaver(restored)});
  const state=await resumed.getState(config);assert.deepEqual(state.next,['confirm_plan']);assert.deepEqual(state.values.plan,waiting.values.plan);assert.deepEqual(calls,['plan']);
  await resumed.invoke(new Command({resume:{approved:true,planVersion:state.values.plan.version,planHash:researchPlanHash(state.values.plan)}}),config);
  const result=await resumed.getState(config);assert.equal(result.next.length,0);assert.match(result.values.body,/恢复后的说明/);assert.deepEqual(calls,['plan','report']);
  assert.deepEqual((await graph.getState(config)).next,['confirm_plan']);
 }finally{restored.close();}
});
