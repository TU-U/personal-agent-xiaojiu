import {randomUUID} from 'node:crypto';
import {db,transaction,getSetting,setSetting} from './store.mjs';
import {fileJobs} from './file-jobs.mjs';
import {retrievalConfig,indexSource,prepareIndex} from './retrieval.mjs';
import {indexCollection,qwenProfile} from './embedding-contract.mjs';
import {managedIndex} from './managed-index.mjs';
const kinds=['note','memory','event','libraryFile'];
db.exec(`CREATE TABLE IF NOT EXISTS index_migrations (
 id TEXT PRIMARY KEY, target TEXT NOT NULL, collection_name TEXT NOT NULL,
 state TEXT NOT NULL, cursor INTEGER NOT NULL, created_at TEXT NOT NULL, epoch INTEGER NOT NULL DEFAULT 0
); CREATE TABLE IF NOT EXISTS index_migration_items (
 migration_id TEXT NOT NULL, entity_id TEXT NOT NULL, kind TEXT NOT NULL, revision INTEGER NOT NULL,
 state TEXT NOT NULL, job_id TEXT, PRIMARY KEY(migration_id,entity_id)
);`);
const decode=row=>row?{...row,target:JSON.parse(row.target)}:null;
export const getIndexMigration=id=>decode(db.prepare('SELECT * FROM index_migrations WHERE id=?').get(id));
const upsert=db.prepare(`INSERT INTO index_migration_items(migration_id,entity_id,kind,revision,state)
 VALUES(?,?,?,?,'pending') ON CONFLICT(migration_id,entity_id) DO UPDATE SET
 kind=excluded.kind,revision=excluded.revision,state='pending',job_id=NULL
 WHERE excluded.revision>index_migration_items.revision`);
export function createQwenMigration(){
 const active=retrievalConfig();
 if(!active.qdrant)throw new Error('请先配置Qdrant。');
 const target={qdrant:active.qdrant,embedding:'http://127.0.0.1:4320/v1',model:'qwen3-embedding-0.6b',indexProfile:qwenProfile,key:''};
 const collection=indexCollection(target);
 if(collection===indexCollection(active))throw new Error('当前已在使用该索引，无需重复创建迁移。');
 return transaction(()=>{
  const existing=db.prepare('SELECT * FROM index_migrations WHERE target=? AND collection_name=?').get(JSON.stringify(target),collection);
  if(existing)return migrationStatus(existing.id);
  const id=randomUUID(),cursor=db.prepare('SELECT COALESCE(MAX(seq),0) n FROM changes').get().n;
  db.prepare("INSERT INTO index_migrations(id,target,collection_name,state,cursor,created_at) VALUES(?,?,?,'building',?,?)").run(id,JSON.stringify(target),collection,cursor,new Date().toISOString());
  for(const row of db.prepare('SELECT id,kind,revision FROM entities').all())if(kinds.includes(row.kind))upsert.run(id,row.id,row.kind,row.revision);
  return migrationStatus(id);
 });
}
export function migrationStatus(id){
 const m=getIndexMigration(id);if(!m)throw new Error('索引迁移不存在。');
 const counts=Object.fromEntries(db.prepare('SELECT state,COUNT(*) n FROM index_migration_items WHERE migration_id=? GROUP BY state').all(id).map(r=>[r.state,r.n]));
 const failed=db.prepare(`SELECT i.entity_id,i.kind,i.revision,j.error,j.attempts FROM index_migration_items i
 JOIN background_jobs j ON j.id=i.job_id WHERE i.migration_id=? AND j.state='failed' LIMIT 20`).all(id);
 return {id,state:m.state,collection:m.collection_name,cursor:m.cursor,counts,failed,createdAt:m.created_at,model:m.target.model};
}
export function reconcileIndexMigrations(){
 for(const initial of db.prepare("SELECT id FROM index_migrations WHERE state IN ('building','ready')").all())transaction(()=>{
  const m=getIndexMigration(initial.id);
  if(indexCollection(m.target)!==m.collection_name){db.prepare("UPDATE index_migrations SET state='invalidated' WHERE id=?").run(m.id);return;}
  if(getSetting('index-rebuild-required:'+m.collection_name,false)){
   const done=db.prepare("SELECT COUNT(*) n FROM index_migration_items WHERE migration_id=? AND state='indexed'").get(m.id).n;
   if(done){db.prepare('UPDATE index_migrations SET epoch=epoch+1 WHERE id=?').run(m.id);m.epoch++;
    db.prepare("UPDATE index_migration_items SET state='pending',job_id=NULL WHERE migration_id=? AND state='indexed'").run(m.id);}
   setSetting('index-rebuild-required:'+m.collection_name,false);
  }
  const changes=db.prepare('SELECT * FROM changes WHERE seq>? ORDER BY seq LIMIT 500').all(m.cursor);
  for(const change of changes)if(kinds.includes(change.kind))upsert.run(m.id,change.entity_id,change.kind,change.revision);
  if(changes.length)db.prepare('UPDATE index_migrations SET cursor=? WHERE id=?').run(changes.at(-1).seq,m.id);
  const pending=db.prepare("SELECT * FROM index_migration_items WHERE migration_id=? AND state='pending' AND job_id IS NULL ORDER BY entity_id LIMIT 3").all(m.id);
  for(const item of pending){
   const job=fileJobs.enqueue({key:`index-migrate-${m.id}-${m.epoch}-${item.entity_id}-${item.revision}`,kind:'index-migration-source',entityId:item.entity_id,revision:item.revision,payload:{migrationId:m.id,sourceKind:item.kind}});
   db.prepare('UPDATE index_migration_items SET job_id=? WHERE migration_id=? AND entity_id=? AND revision=?').run(job.id,m.id,item.entity_id,item.revision);
  }
  const remaining=db.prepare("SELECT COUNT(*) n FROM index_migration_items WHERE migration_id=? AND state!='indexed'").get(m.id).n;
  const caughtUp=!db.prepare('SELECT 1 FROM changes WHERE seq>? LIMIT 1').get(getIndexMigration(m.id).cursor);
  db.prepare('UPDATE index_migrations SET state=? WHERE id=?').run(remaining===0&&caughtUp?'ready':'building',m.id);
  if(managedIndex(retrievalConfig())?.id===m.id){const failure=db.prepare("SELECT j.error FROM index_migration_items i JOIN background_jobs j ON j.id=i.job_id WHERE i.migration_id=? AND j.state='failed' LIMIT 1").get(m.id);setSetting('indexStatus',{status:failure?'failed':remaining?'indexing':'ready',pending:remaining,...(failure?{error:failure.error}:{}),checkedAt:new Date().toISOString()});}
 });
}
function validJob(job){
 const migration=getIndexMigration(job.payload.migrationId),item=db.prepare('SELECT * FROM index_migration_items WHERE migration_id=? AND entity_id=?').get(job.payload.migrationId,job.entity_id);
 const running=fileJobs.get(job.id);
 return migration&&['building','ready'].includes(migration.state)&&indexCollection(migration.target)===migration.collection_name&&
  item?.revision===job.revision&&item.job_id===job.id&&running?.state==='running'&&running.lease_token===job.lease_token&&running.lease_until>=Date.now();
}
export const migrationHandlers={'index-migration-source':{
 async run(job){
  if(!validJob(job))return {indexed:false};
  const migration=getIndexMigration(job.payload.migrationId);
  const prepared=await prepareIndex(migration.target,{seed:false});
  if(prepared.created){
   // A deleted remote collection invalidates previously completed local coverage.
   transaction(()=>{
    setSetting('index-rebuild-required:'+migration.collection_name,false);
    const rows=db.prepare("SELECT * FROM index_migration_items WHERE migration_id=? AND state='indexed'").all(migration.id);
    if(rows.length)db.prepare('UPDATE index_migrations SET epoch=epoch+1 WHERE id=?').run(migration.id);
    for(const row of rows){
  
     db.prepare("UPDATE index_migration_items SET state='pending',job_id=NULL WHERE migration_id=? AND entity_id=?").run(migration.id,row.entity_id);
    }
   });
  }
  const indexed=await indexSource({entity_id:job.entity_id,kind:job.payload.sourceKind,revision:job.revision},migration.target,
   {isCurrent:()=>validJob(job),onProgress:value=>fileJobs.progress(job.id,job.lease_token,value)});
  return {indexed,collection:migration.collection_name};
 },
 commit(job,result){
  if(!result.indexed||!validJob(job))return;
  const source=db.prepare('SELECT kind,revision FROM entities WHERE id=?').get(job.entity_id);
  if(source?.revision!==job.revision||source.kind!==job.payload.sourceKind)return;
  db.prepare("UPDATE index_migration_items SET state='indexed' WHERE migration_id=? AND entity_id=? AND revision=? AND job_id=?")
   .run(job.payload.migrationId,job.entity_id,job.revision,job.id);
  if(managedIndex(retrievalConfig())?.id===job.payload.migrationId)db.prepare('DELETE FROM search_outbox WHERE entity_id=? AND revision=?').run(job.entity_id,job.revision);
 }
}};
export function retryIndexMigration(id){
 if(!getIndexMigration(id))throw new Error('索引迁移不存在。');
 for(const item of db.prepare('SELECT job_id FROM index_migration_items WHERE migration_id=?').all(id))if(item.job_id)fileJobs.retry(item.job_id);
 return migrationStatus(id);
}
