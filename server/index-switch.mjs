import {readFile} from 'node:fs/promises';
import {createHash,randomUUID} from 'node:crypto';
import {db,get,getSetting,setSetting,transaction} from './store.mjs';
import {retrievalConfig,prepareIndex} from './retrieval.mjs';
import {getIndexMigration} from './index-migration.mjs';
import {verifyIndexMigration,indexSourceSnapshot} from './index-verification.mjs';
import {indexCollection} from './embedding-contract.mjs';
import {relevancePolicy} from './retrieval-relevance.mjs';
const digest=text=>createHash('sha256').update(text).digest('hex');
export async function qualityGate(id){
 const raw=await readFile(new URL('../artifacts/retrieval-heldout-questions-v2.json',import.meta.url),'utf8');
 const proofRaw=await readFile(new URL('../artifacts/retrieval-heldout-result-v2.json',import.meta.url),'utf8');
 const labels=JSON.parse(raw),proof=JSON.parse(proofRaw),migration=getIndexMigration(id);
 if(!migration||proof.sourceMigration!==id||proof.labelsSha256!==digest(raw)||JSON.stringify(proof.policy)!==JSON.stringify(relevancePolicy(migration.target)))throw new Error('质量证据与本次迁移或策略不匹配。');
 const sources=labels.corpus;
 if(sources.length<50||sources.length>200||new Set(sources.map(x=>x.id)).size!==sources.length||labels.questions.length!==20||!labels.noAnswer.length)throw new Error('质量验收资料或题目数量不符。');
 for(const source of sources){
  let content;
  if(source.origin==='project-document-copy')content=await readFile(new URL('../docs/'+source.title,import.meta.url),'utf8');
  else{const entity=get(source.id,source.kind);if(!entity||entity.revision!==source.revision)throw new Error('质量评测后来源已更新，需要重新验证。');content=entity.content||entity.summary||'';}
  if(digest(content)!==source.contentHash)throw new Error('质量评测原文已变化。');
 }
 if(proof.results.length!==labels.questions.length+labels.noAnswer.length)throw new Error('质量报告题目数量不匹配。');
 const sourceById=new Map(sources.map(x=>[x.id,x]));
 let hits=0;
 for(const q of [...labels.questions,...labels.noAnswer]){
  const rows=proof.results.filter(r=>r.id===q.id);if(rows.length!==1||rows[0].error)throw new Error('质量报告缺题、重复或存在执行错误。');
  const top=rows[0].top5;if(!Array.isArray(top)||top.length>5||new Set(top.map(x=>x.id)).size!==top.length)throw new Error('质量报告来源格式无效。');
  if(top.some(x=>!sourceById.has(x.id)||sourceById.get(x.id).revision!==x.revision||!Number.isFinite(x.semanticSimilarity)||x.semanticSimilarity<proof.policy.minimumCosine))throw new Error('质量结果的来源或相关度无效。');
  if(q.expectedIds.length){if(top.some(x=>q.expectedIds.includes(x.id)))hits++;}
  else if(top.length)throw new Error('无答案题未通过。');
 }
 if(hits<16||proof.coverage?.expected!==proof.coverage?.actual)throw new Error('质量或覆盖未达到切换要求。');
 return {labelsSha256:digest(raw),proofSha256:digest(proofRaw),hits,total:20,sourceCount:sources.length};
}
export async function activateIndex(id){
 const migration=getIndexMigration(id);if(!migration||migration.state!=='ready')throw new Error('索引回填未完成。');
 const before=JSON.stringify(retrievalConfig()),previousSetting=getSetting('retrieval',null),previousManaged=getSetting('activeIndexMigration',null);
 const quality=await qualityGate(id);
 await prepareIndex(migration.target,{seed:false});
 const coverage=await verifyIndexMigration(id);if(!coverage.coverageVerified)throw new Error('当前索引覆盖检查未通过。');
 return transaction(()=>{
  if(JSON.stringify(retrievalConfig())!==before||getIndexMigration(id)?.state!=='ready'||indexSourceSnapshot().signature!==coverage.sourceSignature)throw new Error('切换期间配置或原文变化，未切换。');
  if(previousManaged===id&&indexCollection(retrievalConfig())===migration.collection_name)return {active:true,migrationId:id,unchanged:true};
  const switchId=randomUUID();
  setSetting('index-switch:'+switchId,{id:switchId,migrationId:id,previousSetting,previousManaged,previousResolved:JSON.parse(before),target:migration.target,quality,coverage,switchedAt:new Date().toISOString()});
  setSetting('retrieval',{...migration.target,apiKey:migration.target.key||''});
  setSetting('activeIndexMigration',id);setSetting('search-index:'+migration.collection_name+':scope-v1',true);
  db.prepare(`DELETE FROM search_outbox WHERE EXISTS (SELECT 1 FROM index_migration_items i WHERE i.migration_id=? AND i.entity_id=search_outbox.entity_id AND i.revision=search_outbox.revision AND i.state='indexed')`).run(id);
  setSetting('capabilityConfigRevision',getSetting('capabilityConfigRevision',0)+1);
  setSetting('indexStatus',{status:'ready',pending:0,model:migration.target.model,checkedAt:new Date().toISOString()});
  return {active:true,switchId,migrationId:id,model:migration.target.model,collection:migration.collection_name};
 });
}
export async function rollbackIndex(switchId){
 const change=getSetting('index-switch:'+switchId);if(!change)throw new Error('切换记录不存在。');
 if(getSetting('activeIndexMigration')!==change.migrationId)throw new Error('当前配置已不属于此次切换，不能覆盖后续设置。');
 const before=JSON.stringify(retrievalConfig());
 if(indexCollection(retrievalConfig())!==indexCollection(change.target)||retrievalConfig().embedding!==change.target.embedding||retrievalConfig().qdrant!==change.target.qdrant)throw new Error('当前配置已修改，请先核对再回退。');
 await prepareIndex(change.previousResolved,{seed:false});
 return transaction(()=>{
  if(JSON.stringify(retrievalConfig())!==before)throw new Error('回退期间配置已变化。');
  setSetting('retrieval',change.previousSetting);setSetting('activeIndexMigration',change.previousManaged);
  // Previous index may have missed changes while inactive: refill before claiming ready.
  const insert=db.prepare('INSERT INTO search_outbox(entity_id,kind,revision,updated_at) VALUES(?,?,?,?) ON CONFLICT(entity_id) DO UPDATE SET revision=excluded.revision,updated_at=excluded.updated_at');
  for(const row of db.prepare("SELECT id,kind,revision,updated_at FROM entities WHERE kind IN ('note','memory','event','libraryFile')").all())insert.run(row.id,row.kind,row.revision,row.updated_at);
  setSetting('indexStatus',{status:'indexing',notice:'已恢复旧模型配置，正在补齐停用期间的索引变化。',checkedAt:new Date().toISOString()});
  setSetting('capabilityConfigRevision',getSetting('capabilityConfigRevision',0)+1);
  setSetting('index-switch:'+switchId,{...change,rolledBackAt:new Date().toISOString()});
  return {rolledBack:true,switchId,model:change.previousResolved.model};
 });
}
