import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
const directory=mkdtempSync(path.join(os.tmpdir(),'library-task-links-'));
Object.assign(process.env,{DATA_DIR:directory,SEED_DEMO:'false',WORKER_MODE:'true'});
const {db,save,get,remove,setSetting}=await import('../server/store.mjs');
const {linkLibraryTask,unlinkLibraryTask,taskLibraryReferences,installLibraryTaskLinks}=await import('../server/domain/library/library-task-links.mjs');
const {readLibrary}=await import('../server/agent/task-tools.mjs');
test('linking pins source version without executing a task, retry is idempotent, stale/deleted sources stay visible and removable',()=>{
 const file=save('libraryFile',{title:'资料',sourcePath:'a.md',content:'正文',copyName:'a.md',status:'ready'});
 const task=save('workTask',{title:'学习',status:'draft',logs:[],plan:{steps:['阅读']},outputs:[]});
 const body={opId:'attach-file',taskId:task.id,taskRevision:task.revision,sourceRevision:file.revision};
 const linked=linkLibraryTask(file.id,body);assert.equal(linked.status,'draft');assert.deepEqual(linked.plan,task.plan);assert.equal(linked.libraryReferences[0].revision,file.revision);
 assert.equal(linkLibraryTask(file.id,body).revision,linked.revision);assert.equal(taskLibraryReferences(linked)[0].available,true);
 assert.equal(readLibrary(file.id,0,file.revision).revision,file.revision);
 const changed=save('libraryFile',{...file,content:'更新正文'},file.revision);assert.equal(taskLibraryReferences(linked)[0].available,false);assert.throws(()=>readLibrary(file.id,0,file.revision),/已更新/);
 assert.throws(()=>linkLibraryTask(file.id,{...body,opId:'stale-source',taskRevision:linked.revision}),e=>e.status===409);
 const relinked=linkLibraryTask(file.id,{...body,opId:'new-version',taskRevision:linked.revision,sourceRevision:changed.revision});assert.equal(relinked.libraryReferences.length,1);assert.equal(relinked.libraryReferences[0].revision,changed.revision);
 remove(file.id,'libraryFile',changed.revision);assert.match(taskLibraryReferences(relinked)[0].issue,/删除/);
 const unlinked=unlinkLibraryTask(task.id,file.id,{revision:relinked.revision});assert.equal(unlinked.libraryReferences.length,0);assert.equal(unlinked.status,'draft');assert.equal(unlinkLibraryTask(task.id,file.id,{revision:relinked.revision}).revision,unlinked.revision);
});
test('candidates are paginated; state/version/type checks reject stale or unauthorized mutations',()=>{
 const file=save('libraryFile',{title:'正文',content:'abc',status:'ready',copyName:'copy.md'});
 for(let i=0;i<35;i++)save('workTask',{title:'任务'+i,status:'paused',logs:[]});
 const running=save('workTask',{title:'执行中',status:'running',logs:[]});
 assert.throws(()=>linkLibraryTask(file.id,{opId:'running-link',taskId:running.id,taskRevision:running.revision,sourceRevision:file.revision}),e=>e.status===409);
 const routes=new Map();installLibraryTaskLinks({get:(route,handler)=>routes.set(route,handler),post:()=>{},delete:()=>{}});
 const handler=routes.get('/api/library/:id/tasks');let first,second;
 handler({params:{id:file.id},query:{limit:10}},{json:value=>first=value});handler({params:{id:file.id},query:{limit:100,cursor:first.nextCursor}},{json:value=>second=value});
 assert.equal(first.total,36);assert.equal(first.items.length+second.items.length,36);assert.ok(![...first.items,...second.items].some(t=>t.id===running.id));
 const candidate=first.items[0];save('workTask',{...get(candidate.id,'workTask'),title:'更新任务'},candidate.revision);
 assert.throws(()=>linkLibraryTask(file.id,{opId:'stale-task',taskId:candidate.id,taskRevision:candidate.revision,sourceRevision:file.revision}),e=>e.status===409);
 assert.throws(()=>readLibrary(file.id,-1),/位置无效/);assert.throws(()=>readLibrary(file.id,0.5),/位置无效/);
 const archived=save('libraryFile',{...file,status:'archived'},file.revision);assert.throws(()=>readLibrary(file.id,0,archived.revision),/有效正文/);
});
test('existing task loop receives linked source IDs, reads pinned text and retains read evidence in its report',async()=>{
 const {runWorkTask}=await import('../server/pet/supervision/work-tasks.mjs');
 const file=save('libraryFile',{title:'关联材料',content:'关联材料中的明确事实',copyName:'linked.md',status:'ready',sourcePath:'linked.md'});
 const task=save('workTask',{title:'读取关联',goal:'依据关联材料归纳',status:'draft',logs:[],outputs:[],calls:0,plan:{steps:['阅读资料'],deliverable:'摘要'}});
 const linked=linkLibraryTask(file.id,{opId:'loop-evidence',taskId:task.id,taskRevision:task.revision,sourceRevision:file.revision});save('workTask',{...linked,status:'running'},linked.revision);
 setSetting('provider',{baseUrl:'http://model.test/v1',model:'test',apiKey:''});
 const originalFetch=globalThis.fetch,originalLog=console.log;let calls=0;
 console.log=()=>{};
 globalThis.fetch=async(url,options)=>{
  assert.ok(String(url).startsWith('http://model.test/'));
  const payload=JSON.parse(options.body),context=JSON.parse(payload.messages.at(-1).content);
  assert.equal(context.linkedSources[0].id,file.id);assert.equal(context.linkedSources[0].revision,file.revision);assert.equal(context.linkedSources[0].available,true);
  const action=++calls===1?{tool:'read_library',id:file.id,start:0}:calls===2?{tool:'write_report',body:'# 关联资料归纳\n\n关联材料中的明确事实已经通过工具读取。来源为关联材料，尚需用户核对。'}:{tool:'finish'};
  if(calls===2){const evidence=JSON.parse(context.logs.find(log=>log.type==='read_library').content);assert.equal(evidence.text,file.content);assert.equal(evidence.revision,file.revision);}
  return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify(action)}}]}),{status:200,headers:{'Content-Type':'application/json'}});
 };
 try{await runWorkTask(task.id);}finally{globalThis.fetch=originalFetch;console.log=originalLog;}
 const finished=get(task.id,'workTask');assert.equal(finished.status,'review');assert.equal(calls,3);
 const artifact=get(finished.outputs[0],'artifact');assert.equal(artifact.sources[0].id,file.id);assert.equal(artifact.sources[0].revision,file.revision);assert.equal(artifact.sources[0].quote,file.content);
});
after(()=>{db.close();rmSync(directory,{recursive:true,force:true});});
