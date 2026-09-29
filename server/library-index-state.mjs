import {z} from 'zod';
import {db,get,getSetting,transaction} from './store.mjs';
import {retrievalConfig} from './retrieval.mjs';
import {indexCollection} from './embedding-contract.mjs';
import {managedIndex} from './managed-index.mjs';
import {validate} from './validation.mjs';

export function libraryIndexState(file){
 const base={sourceRevision:file.revision,retryable:false};
 if(['archived','skipped','duplicate'].includes(file.status))return {...base,state:'excluded',message:'当前来源状态不参与默认检索'};
 if(file.status!=='ready'||file.chunks===0||typeof file.content==='string'&&!file.content.trim())return {...base,state:'waiting_parse',message:'等待复制或正文解析，尚不能建立正文索引'};
 const config=retrievalConfig();
 if(!config.qdrant||!config.embedding||!config.model)return {...base,state:'unconfigured',message:'尚未配置向量检索服务'};
 const collection=indexCollection(config),managed=managedIndex(config);
 if(managed&&!managed.compatible)return {...base,state:'invalidated',message:'索引协议已变化，请先完成索引迁移'};
 if(getSetting('index-rebuild-required:'+collection,false))return {...base,state:'queued',message:'索引集合正在重建，等待重新处理'};
 const progress=getSetting('index-progress:'+collection+':'+file.id,null);
 const parts=progress?.revision===file.revision?{completedChunks:progress.next}:{};
 if(managed){
  const item=db.prepare('SELECT * FROM index_migration_items WHERE migration_id=? AND entity_id=?').get(managed.id,file.id);
  if(!item||item.revision!==file.revision)return {...base,state:'queued',message:'等待调度当前来源版本'};
  const job=item.job_id?db.prepare('SELECT state,error,result,updated_at FROM background_jobs WHERE id=?').get(item.job_id):null;
  const ids=getSetting('indexed:'+collection+':'+file.id,null);
  if(item.state==='indexed'&&Array.isArray(ids)&&ids.length)return {...base,state:'indexed',indexedRevision:item.revision,completedChunks:ids.length,message:'当前版本已完成索引；服务实时可用性以检索结果为准'};
  if(job?.state==='failed'||job?.state==='cancelled')return {...base,...parts,state:'failed',retryable:true,message:job.error||'索引任务已取消，可重新提交'};
  if(job?.state==='running')return {...base,...parts,state:'indexing',message:'正在建立向量与词项索引'};
  if(item.state==='indexed'||job?.state==='completed')return {...base,state:'unknown',retryable:true,message:'缺少当前版本的完整索引确认，可重新索引'};
  return {...base,...parts,state:'queued',message:'索引任务已排队'};
 }
 const failure=getSetting('index-error:'+collection+':'+file.id,null);
 if(failure?.revision===file.revision)return {...base,...parts,state:'failed',retryable:true,message:failure.error};
 const pending=db.prepare('SELECT revision FROM search_outbox WHERE entity_id=?').get(file.id);
 if(pending)return {...base,...parts,state:'queued',message:'当前版本等待索引；旧版本不算完成'};
 const receipt=getSetting('index-receipt:'+collection+':'+file.id,null);
 if(receipt?.revision===file.revision&&receipt.chunks>0)return {...base,state:'indexed',indexedRevision:receipt.revision,completedChunks:receipt.chunks,message:'当前版本已完成索引；服务实时可用性以检索结果为准'};
 return {...base,state:'unknown',retryable:true,message:'暂无当前版本的索引完成记录，可重新索引'};
}
export function retryLibraryIndex(id,input){
 const body=validate(z.strictObject({revision:z.number().int().positive()}),input);
 return transaction(()=>{
  const file=get(id,'libraryFile');if(!file)throw Object.assign(new Error('资料不存在或已删除。'),{status:404});
  if(file.revision!==body.revision)throw Object.assign(new Error('资料已更新，请重新打开当前版本。'),{status:409});
  const status=libraryIndexState(file);
  if(['queued','indexing','indexed'].includes(status.state))return status;
  if(!status.retryable)throw Object.assign(new Error(status.message),{status:409});
  const managed=managedIndex(retrievalConfig());
  if(managed){
   const item=db.prepare('SELECT * FROM index_migration_items WHERE migration_id=? AND entity_id=?').get(managed.id,file.id);
   const retried=item?.job_id?db.prepare("UPDATE background_jobs SET state='pending',error=NULL,lease_token=NULL,lease_until=NULL,updated_at=? WHERE id=? AND revision=? AND state IN ('failed','cancelled')").run(Date.now(),item.job_id,file.revision).changes:0;
   if(!retried){
    db.prepare('UPDATE index_migrations SET epoch=epoch+1 WHERE id=?').run(managed.id);
    db.prepare("UPDATE index_migration_items SET state='pending',job_id=NULL WHERE migration_id=? AND entity_id=? AND revision=?").run(managed.id,file.id,file.revision);
   }
  }
  db.prepare('DELETE FROM settings WHERE key=?').run('index-error:'+indexCollection(retrievalConfig())+':'+file.id);
  db.prepare('INSERT INTO search_outbox(entity_id,kind,revision,updated_at) VALUES(?,?,?,?) ON CONFLICT(entity_id) DO UPDATE SET revision=excluded.revision,updated_at=excluded.updated_at').run(file.id,'libraryFile',file.revision,new Date().toISOString());
  return libraryIndexState(file);
 });
}
