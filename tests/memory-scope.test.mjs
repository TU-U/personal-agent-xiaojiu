import {test,after} from 'node:test';import assert from 'node:assert/strict';import {mkdtemp,rm} from 'node:fs/promises';import path from 'node:path';import os from 'node:os';
const root=await mkdtemp(path.join(os.tmpdir(),'memory-scope-'));Object.assign(process.env,{DATA_DIR:root,SEED_DEMO:'false',WORKER_MODE:'true'});
const {db,save,get,remove}=await import('../server/store.mjs');const {createMemory,patchMemory}=await import('../server/domain/memory/memory-state.mjs');const {memoryScopesOverlap,memoryScopeIssue}=await import('../server/domain/memory/memory-scope.mjs');const {memoryApplies}=await import('../server/retrieval/retrieval-scope.mjs');
test('scope requires existing stable objects; unknown kind, nonempty global ID and missing object are rejected',()=>{
 const project=save('project',{name:'同名'}),thread=save('thread',{title:'话题',status:'active'});
 for(const range of [{scopeKind:'global',scopeId:project.id},{scopeKind:'project',scopeId:'missing'},{scopeKind:'thread',scopeId:'missing'},{scopeKind:'magic'}])assert.throws(()=>createMemory({content:'事实',scope:'通用',...range}));
 assert.equal(createMemory({content:'事实',scope:'通用',scopeKind:'project',scopeId:project.id}).scopeId,project.id);
 assert.equal(createMemory({content:'事实',scope:'周报',scopeKind:'thread',scopeId:thread.id}).status,'candidate');
});
test('scope overlap preserves purpose restrictions and separates distinct project/thread IDs',()=>{
 const a=save('project',{name:'同名'}),b=save('project',{name:'同名'}),t=save('thread',{status:'active'}),u=save('thread',{status:'active'});
 assert.equal(memoryScopesOverlap({scopeKind:'project',scopeId:a.id},{scopeKind:'project',scopeId:b.id}),false);
 assert.equal(memoryScopesOverlap({scopeKind:'thread',scopeId:t.id},{scopeKind:'thread',scopeId:u.id}),false);
 assert.equal(memoryScopesOverlap({scope:'周报'},{scope:'文章'}),false);assert.equal(memoryScopesOverlap({scope:'通用'},{scopeKind:'project',scopeId:a.id}),true);
 assert.equal(memoryScopesOverlap({scopeKind:'project',scopeId:a.id},{scopeKind:'thread',scopeId:t.id}),true);
});
test('scope expansion creates a candidate while old active stays restricted; deleted range blocks activation',async()=>{
 const project=save('project',{name:'范围'}),candidate=createMemory({content:'偏好',scope:'周报',scopeKind:'project',scopeId:project.id});const active=await patchMemory(candidate.id,{revision:candidate.revision,status:'active'},{check:async()=>null});
 assert.equal(memoryApplies(active,{projectId:project.id,purpose:'周报'}),true);assert.equal(memoryApplies(active,{projectId:project.id}),false);assert.equal(memoryApplies(active,{purpose:'周报'}),false);
 const expanded=await patchMemory(active.id,{revision:active.revision,scopeKind:'global',scopeId:''});assert.equal(expanded.status,'candidate');assert.equal(expanded.scope,'周报');assert.equal(get(active.id,'memory').scopeKind,'project');
 remove(project.id,'project',project.revision);assert.ok(memoryScopeIssue(active));assert.equal(memoryApplies(active,{projectId:project.id,purpose:'周报'}),false);
 await assert.rejects(patchMemory(active.id,{revision:active.revision,status:'active'},{check:async()=>assert.fail()}),e=>e.status===422);
});
after(async()=>{db.close();await rm(root,{recursive:true,force:true});});
