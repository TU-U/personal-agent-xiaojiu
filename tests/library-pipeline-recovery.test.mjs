import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';

// Actual copy/parser/SQLite/checkpoints and separate processes. The remote
// embedding/Qdrant responses are deterministic; this is not a quality test.
const child = String.raw`
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';
const phase=process.env.PIPELINE_PHASE;
const remotePath=join(process.env.PIPELINE_ROOT,'remote.json');
const remote=existsSync(remotePath)?JSON.parse(readFileSync(remotePath,'utf8')):{exists:false,points:[],embedded:[]};
const print=console.log;console.log=()=>{};
let embeds=0;
globalThis.fetch=async(url,options={})=>{
 const u=String(url),body=options.body?JSON.parse(options.body):null;
 const reply=(result,status=200)=>new Response(JSON.stringify({status:'ok',result}),{status});
 if(u.endsWith('/embeddings')){
  if(body.input!=='资料索引'){
   if(phase==='fail-index'&&++embeds===2)return reply({},503);
   remote.embedded.push(body.input);
  }
  return new Response(JSON.stringify({data:[{embedding:Array(1024).fill(1)}]}));
 }
 if(u.includes('/points/scroll'))return reply({points:remote.points,next_page_offset:null});
 if(u.includes('/points/delete')){remote.points=remote.points.filter(p=>!body.points.includes(p.id));return reply(true);}
 if(u.includes('/points?')){for(const p of body.points){remote.points=remote.points.filter(v=>v.id!==p.id);remote.points.push(p);}return reply(true);}
 if(options.method==='PUT'){remote.exists=true;return reply(true);}
 return remote.exists?reply({config:{params:{vectors:{dense:{size:1024,distance:'Cosine'}},sparse_vectors:{lexical:{}}}}}):reply({},404);
};
const {db,save,get,all,setSetting,getSetting}=await import('./server/store.mjs');
const {runLibrary,decideLibrary,libraryRoot}=await import('./server/domain/library/library.mjs');
const {createQwenMigration,getIndexMigration,reconcileIndexMigrations,migrationHandlers}=await import('./server/retrieval/index/index-migration.mjs');
const {fileJobs}=await import('./server/jobs/file-jobs.mjs');
const {libraryIndexState,retryLibraryIndex}=await import('./server/domain/library/library-index-state.mjs');
const handler=migrationHandlers['index-migration-source'];
if(phase==='fail-copy'){
 const file=save('libraryFile',{title:'recovery.md',sourcePath:'recovery.md',status:'queued',content:''});
 setSetting('libraryJob',{status:'copying',queue:[],path:''});await runLibrary();
 assert.equal(get(file.id,'libraryFile').status,'failed');
 assert.equal(libraryIndexState(get(file.id,'libraryFile')).state,'waiting_parse');
 print(JSON.stringify({id:file.id,status:'failed'}));
}else{
 let file=all('libraryFile')[0];
 if(phase==='fail-index'){
  await decideLibrary(file.id,'retry',{revision:file.revision,opId:'pipeline-copy-retry'});
  for(let i=0;i<300&&getSetting('libraryJob').status!=='done';i++)await new Promise(r=>setTimeout(r,10));
  file=get(file.id,'libraryFile');assert.equal(file.status,'ready');
  assert.equal(readFileSync(join(libraryRoot,file.copyName),'utf8'),readFileSync(join(process.env.COMPUTER_FILES_ROOT,'recovery.md'),'utf8'));
  const migration=createQwenMigration(),target=getIndexMigration(migration.id).target;
  setSetting('retrieval',target);setSetting('activeIndexMigration',migration.id);
 }else{
  assert.equal(libraryIndexState(file).state,'failed');
  assert.equal(remote.points.length,1);
  assert.equal(retryLibraryIndex(file.id,{revision:file.revision}).state,'queued');
 }
 reconcileIndexMigrations();
 for(const pending of fileJobs.pending()){
  const job=fileJobs.claim(pending.id,'pipeline-'+phase,60000);assert.ok(job);
  try{const result=await handler.run(job);fileJobs.finish(job.id,job.lease_token,result,handler.commit);}
  catch(error){fileJobs.fail(job.id,job.lease_token,error.message);if(phase!=='fail-index')throw error;}
 }
 reconcileIndexMigrations();
 const index=libraryIndexState(file);
 assert.equal(index.state,phase==='fail-index'?'failed':'indexed');
 assert.equal(all('libraryFile').length,1);
 const pending=!!db.prepare('SELECT 1 FROM search_outbox WHERE entity_id=?').get(file.id);
 assert.equal(pending,phase==='fail-index');
 writeFileSync(remotePath,JSON.stringify(remote));
 print(JSON.stringify({id:file.id,copyName:file.copyName,revision:file.revision,index,points:remote.points.length,embeds:remote.embedded.length,pending}));
}
db.close();
`;

test('copy failure then embedding failure recover across processes without duplicate source or successful chunk',()=>{
 const root=mkdtempSync(join(tmpdir(),'library-pipeline-')),source=join(root,'source');mkdirSync(source);
 const content='完整正文\n'+'恢复资料段落。'.repeat(600)+'\n末尾约定：周五八点人工确认。';
 const env={...process.env,DATA_DIR:join(root,'data'),COMPUTER_FILES_ROOT:source,SEED_DEMO:'false',WORKER_MODE:'true',PIPELINE_ROOT:root,QDRANT_URL:'http://qdrant.test',EMBEDDING_BASE_URL:'http://old.test/v1',EMBEDDING_MODEL:'bge-m3'};
 const run=phase=>{
  const result=spawnSync(process.execPath,['--input-type=module','-e',child],{cwd:process.cwd(),env:{...env,PIPELINE_PHASE:phase},encoding:'utf8',timeout:15000});
  assert.equal(result.status,0,result.stderr||result.stdout);return JSON.parse(result.stdout.trim());
 };
 try{
  const failedCopy=run('fail-copy');
  writeFileSync(join(source,'recovery.md'),content);
  const failedIndex=run('fail-index');assert.equal(failedIndex.id,failedCopy.id);assert.equal(failedIndex.points,1,JSON.stringify(failedIndex));assert.equal(failedIndex.embeds,1);
  const recovered=run('recover');assert.equal(recovered.id,failedIndex.id);assert.equal(recovered.revision,failedIndex.revision);assert.equal(recovered.copyName,failedIndex.copyName);
  assert.equal(recovered.points,recovered.index.completedChunks);assert.equal(recovered.embeds,recovered.points,'successful first chunk must not be embedded again');
  const remote=JSON.parse(readFileSync(join(root,'remote.json'),'utf8'));
  assert.equal(remote.points.sort((a,b)=>a.payload.chunk-b.payload.chunk).map(p=>p.payload.text).join(''),content);
  assert.equal(readFileSync(join(source,'recovery.md'),'utf8'),content);
  assert.equal(readFileSync(join(root,'data','library',recovered.copyName),'utf8'),content);
 }finally{rmSync(root,{recursive:true,force:true});}
});
