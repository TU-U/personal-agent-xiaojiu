import {test,after} from 'node:test';import assert from 'node:assert/strict';import {mkdtemp,rm} from 'node:fs/promises';import path from 'node:path';import os from 'node:os';
const root=await mkdtemp(path.join(os.tmpdir(),'conversation-scope-'));Object.assign(process.env,{DATA_DIR:root,SEED_DEMO:'false',WORKER_MODE:'true'});
const {db,save,remove}=await import('../server/store.mjs');const {conversationScope}=await import('../server/agent/conversation-scope.mjs');
test('stable project is explicit or inherited from stable thread membership, never guessed from names',()=>{
 const a=save('project',{name:'同名'}),b=save('project',{name:'同名'}),note=save('note',{projectId:a.id}),thread=save('thread',{source:{kind:'note',id:note.id}});
 assert.equal(conversationScope({},thread.id).projectId,a.id);assert.equal(conversationScope({projectId:''},thread.id).projectId,'');assert.equal(conversationScope({project:'同名'},thread.id).projectId,'');
 assert.equal(conversationScope({projectId:b.id,project:'同名'},thread.id).projectId,b.id);assert.equal(conversationScope({projectId:b.id,project:'同名'},thread.id).project,'');
 save('conversation',{threadId:thread.id,projectId:b.id,query:'继续讨论',body:'回复'});assert.equal(conversationScope({},thread.id).projectId,b.id);
 remove(b.id,'project',b.revision);assert.throws(()=>conversationScope({},thread.id),e=>e.status===422);assert.equal(conversationScope({projectId:''},thread.id).projectId,'');
});
after(async()=>{db.close();await rm(root,{recursive:true,force:true});});
