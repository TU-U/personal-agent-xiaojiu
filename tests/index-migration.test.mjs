import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const dir=mkdtempSync(path.join(os.tmpdir(),'index-migration-'));
Object.assign(process.env,{DATA_DIR:dir,SEED_DEMO:'false',WORKER_MODE:'true',QDRANT_URL:'http://qdrant.test',EMBEDDING_BASE_URL:'http://old.test/v1',EMBEDDING_MODEL:'bge-m3'});
const {db,save,get,remove,setSetting}=await import('../server/store.mjs');
const {fileJobs}=await import('../server/jobs/file-jobs.mjs');
const {createQwenMigration,migrationStatus,reconcileIndexMigrations,migrationHandlers}=await import('../server/retrieval/index/index-migration.mjs');
const {verifyIndexMigration}=await import('../server/retrieval/index/index-verification.mjs');
const {indexSource,searchIndex,indexPending}=await import('../server/retrieval/retrieval.mjs');
const {managedIndex,preserveIndexProfile}=await import('../server/retrieval/index/managed-index.mjs');
const {qwenProfile}=await import('../server/ai/embedding-contract.mjs');
const handler=migrationHandlers['index-migration-source'];
const oldFetch=globalThis.fetch,oldLog=console.log;
console.log=()=>{};
let exists=false,hook=null;
const points=new Map();
const pointFor=id=>[...points.values()].find(p=>p.payload.entityId===id&&p.payload.chunk===0);
globalThis.fetch=async(url,options={})=>{
 const u=String(url),b=options.body?JSON.parse(options.body):null;
 if(hook)await hook(u,b);
 const reply=(result,status=200)=>new Response(JSON.stringify({status:'ok',result}),{status});
 if(u.endsWith('/embeddings'))return new Response(JSON.stringify({data:[{embedding:Array(1024).fill(1)}]}));
 if(u.includes('/points/query'))return reply({points:[...points.values()].slice(0,b.limit)});
 if(u.includes('/points/scroll'))return reply({points:[...points.values()],next_page_offset:null});
 if(u.includes('/points/delete')){for(const id of b.points)points.delete(id);return reply(true);}
 if(u.includes('/points?')){for(const p of b.points)points.set(p.id,p);return reply(true);}
 if(options.method==='PUT'){exists=true;return reply(true);}
 return exists?reply({config:{params:{vectors:{dense:{size:1024,distance:'Cosine'}},sparse_vectors:{lexical:{}}}}}):reply({},404);
};
async function runPending(){
 reconcileIndexMigrations();
 for(const pending of fileJobs.pending()){
  const job=fileJobs.claim(pending.id,'test-'+pending.id,60000);if(!job)continue;
  try{const result=await handler.run(job);fileJobs.finish(job.id,job.lease_token,result,handler.commit);}
  catch(error){fileJobs.fail(job.id,job.lease_token,error.message);throw error;}
 }
 reconcileIndexMigrations();
}
test('shadow queue does not consume active outbox, resumes chunk progress and catches changes/deletes',async()=>{
 const note=save('note',{title:'原始文档',content:'长文'.repeat(2100),status:'ready'});
 const migration=createQwenMigration();assert.equal(createQwenMigration().id,migration.id);
 let seen=0;
 hook=async(u,b)=>{if(u.includes('/points?')){seen++;if(seen===2){hook=null;throw new Error('interrupt second chunk');}}};
 await assert.rejects(runPending(),/无法连接/);
 assert.equal(points.size,1);
 assert.equal(migrationStatus(migration.id).failed.length,1);
 const row=db.prepare('SELECT job_id FROM index_migration_items WHERE migration_id=?').get(migration.id);
 const progressWrites=pointFor(note.id);
 assert.ok(fileJobs.retry(row.job_id));
 await runPending();
 assert.equal(migrationStatus(migration.id).state,'ready');assert.equal(points.size,3);
 assert.equal(pointFor(note.id),progressWrites,'first successful chunk is not regenerated on retry');
 assert.equal(db.prepare('SELECT revision FROM search_outbox WHERE entity_id=?').get(note.id).revision,1,'active outbox remains untouched');
 let latest=save('note',{...get(note.id,'note'),content:'新文档'},note.revision);
 hook=async(u,b)=>{if(u.endsWith('/embeddings')&&b.input.startsWith('原始文档\n')){hook=null;latest=save('note',{...get(note.id,'note'),content:'再次修订'},latest.revision);}};
 await runPending();assert.notEqual(migrationStatus(migration.id).state,'ready');
 await runPending();assert.equal(migrationStatus(migration.id).state,'ready');assert.equal(points.size,1);assert.equal(pointFor(note.id).payload.revision,latest.revision);
 remove(note.id,'note',latest.revision);await runPending();assert.equal(points.size,0);
 assert.equal(db.prepare('SELECT revision FROM search_outbox WHERE entity_id=?').get(note.id).revision,latest.revision+1);
 // A recreated remote collection must invalidate completed coverage and jobs must
 // use a fresh epoch while preserving old completed job audit rows.
 const a=save('note',{title:'甲',content:'保留'});await runPending();
 const jobsBefore=db.prepare("SELECT COUNT(*) n FROM background_jobs WHERE state='completed'").get().n;
 exists=false;points.clear();save('note',{title:'乙',content:'新增触发重建'});
 await runPending();await runPending();
 assert.ok(pointFor(a.id));assert.equal(migrationStatus(migration.id).state,'ready');
 assert.ok(db.prepare("SELECT COUNT(*) n FROM background_jobs WHERE state='completed'").get().n>=jobsBefore);
 const proof=await verifyIndexMigration(migration.id);assert.equal(proof.coverageVerified,true);assert.equal(proof.qualityVerified,false);
 const original=pointFor(a.id).payload.text;pointFor(a.id).payload.text='远端错误正文';
 const corrupted=await verifyIndexMigration(migration.id);assert.equal(corrupted.coverageVerified,false);assert.equal(corrupted.mismatchCount,1);
 pointFor(a.id).payload.text=original;
 hook=async(u)=>{if(u.includes('/points/scroll')){hook=null;const value=get(a.id,'note');save('note',{...value,content:'检查期间修订'},value.revision);}};
 await assert.rejects(verifyIndexMigration(migration.id),/检查期间资料发生变化/);
});
test('a delayed Qwen PUT cannot overwrite or delete a newer revision point',async()=>{
 const source=save('note',{title:'迟到请求',content:'旧事实'});
 const c={model:'qwen3-embedding-0.6b',indexProfile:qwenProfile,qdrant:'http://qdrant.test',embedding:'http://qwen.test/v1'};
 let release,entered;const reached=new Promise(r=>entered=r),gate=new Promise(r=>release=r);
 hook=async(u,b)=>{if(u.includes('/points?')&&b.points[0].payload.entityId===source.id){hook=null;entered();await gate;}};
 const old=indexSource({entity_id:source.id,kind:'note',revision:source.revision},c);
 await reached;
 const changed=save('note',{...get(source.id,'note'),content:'新事实'},source.revision);
 assert.equal(await indexSource({entity_id:source.id,kind:'note',revision:changed.revision},c),true);
 const newPoint=pointFor(source.id);assert.equal(newPoint.payload.revision,changed.revision);
 release();assert.equal(await old,false);
 assert.equal(pointFor(source.id),newPoint,'the new point survives the late old PUT and cleanup');
 assert.equal([...points.values()].filter(p=>p.payload.entityId===source.id).length,1);
});
test('high fusion score alone cannot admit an unrelated Qwen result and empty evidence is explicit',async()=>{
 points.clear();
 const good=save('note',{title:'相关资料',content:'证据'}),bad=save('note',{title:'无关资料',content:'其他主题'});
 const c={model:'qwen3-embedding-0.6b',indexProfile:qwenProfile,qdrant:'http://qdrant.test',embedding:'http://qwen.test/v1'};
 const make=(entity,vector,score)=>({id:entity.id,payload:{entityId:entity.id,kind:'note',revision:entity.revision,text:entity.content},vector:{dense:vector},score});
 points.set(bad.id,make(bad,Array.from({length:1024},(_,i)=>i%2?1:-1),100));
 points.set(good.id,make(good,Array(1024).fill(1),0.001));
 let found=await searchIndex('查询',{limit:1},c,{seed:false});
 assert.equal(found[0].id,good.id);assert.equal(found.retrievalInfo.weakCount,1);assert.equal(found[0].semanticSimilarity,1);
 points.delete(good.id);found=await searchIndex('查询',{limit:1},c,{seed:false});
 assert.equal(found.length,0);assert.equal(found.retrievalInfo.evidenceStatus,'insufficient');assert.match(found.retrievalInfo.notice,/不足以支持回答/);
});
test('managed active indexing uses the queue and same-endpoint settings preserve its profile',async()=>{
 const migration=createQwenMigration();
 const c={model:'qwen3-embedding-0.6b',indexProfile:qwenProfile,qdrant:'http://qdrant.test',embedding:'http://127.0.0.1:4320/v1'};
 setSetting('retrieval',c);setSetting('activeIndexMigration',migration.id);
 const before=db.prepare('SELECT COUNT(*) n FROM search_outbox').get().n;
 await indexPending();assert.equal(db.prepare('SELECT COUNT(*) n FROM search_outbox').get().n,before);
 assert.equal(managedIndex(c).id,migration.id);
 const fresh=save('note',{title:'切换后的更新',content:'队列完成后才清待处理项'});
 for(let i=0;i<5&&db.prepare('SELECT 1 FROM search_outbox WHERE entity_id=?').get(fresh.id);i++)await runPending();
 assert.equal(db.prepare('SELECT 1 FROM search_outbox WHERE entity_id=?').get(fresh.id),undefined);
 assert.equal(pointFor(fresh.id).payload.revision,fresh.revision);
 assert.deepEqual(preserveIndexProfile(c,{...c,embedding:c.embedding+'/'}),{indexProfile:qwenProfile});
 assert.deepEqual(preserveIndexProfile(c,{...c,model:'another'}),{});
 db.prepare("UPDATE index_migrations SET state='invalidated' WHERE id=?").run(migration.id);
 assert.equal(managedIndex(c).compatible,false);
 await assert.rejects(searchIndex('查询',{},c),/迁移状态已变化/);
});
after(()=>{globalThis.fetch=oldFetch;console.log=oldLog;db.close();rmSync(dir,{recursive:true,force:true});});
