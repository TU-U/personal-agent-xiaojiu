import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const root=await mkdtemp(join(tmpdir(),'artifact-memories-'));Object.assign(process.env,{DATA_DIR:root,SEED_DEMO:'false',WORKER_MODE:'true'});
const {db,save}=await import('../server/store.mjs');
const {artifactMemories}=await import('../server/agent/artifact-memories.mjs');
after(async()=>{db.close();await rm(root,{recursive:true,force:true});});
test('artifact uses retrieved current applicable memories, never all active facts or stale vector text',async()=>{
 const memory=(content,extra={})=>save('memory',{content,status:'active',scope:'通用',scopeKind:'global',scopeId:'',...extra});
 const good=memory('先写结论',{scope:'周报'}),unrelated=memory('喜欢草莓'),paused=memory('已暂停',{status:'paused'}),article=memory('只用于文章',{scope:'文章'}),stale=memory('旧值');
 save('memory',{...stale,content:'新值'},stale.revision);
 const result=await artifactMemories({template:'weekly',instructions:'整理项目进展',sources:[{title:'项目进展'}]},{available:()=>true,search:async(query,options)=>{
  assert.match(query,/整理项目进展/);assert.deepEqual(options,{kind:'memory',purpose:'周报',limit:8});
  return [{...good,content:'向量库旧摘录'},good,paused,article,stale];
 }});
 assert.deepEqual(result.memories.map(m=>m.id),[good.id]);assert.equal(result.memories[0].content,'先写结论');assert.ok(!result.memories.some(m=>m.id===unrelated.id));
 const failed=await artifactMemories({template:'weekly'},{available:()=>true,search:async()=>{throw new Error('offline');}});assert.deepEqual(failed.memories,[]);assert.match(failed.notice,/未成功/);
 const unconfigured=await artifactMemories({template:'weekly'},{available:()=>false,search:()=>assert.fail()});assert.deepEqual(unconfigured.memories,[]);
});
