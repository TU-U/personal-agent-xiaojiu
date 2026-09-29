import {createHash} from 'node:crypto';
import {db,get,transaction,setSetting} from './store.mjs';
import {getIndexMigration} from './index-migration.mjs';
import {scrollIndex} from './retrieval.mjs';
import {splitText} from './library.mjs';
import {retrievalPayload} from './retrieval-scope.mjs';
import {indexCollection} from './embedding-contract.mjs';
export function indexSourceSnapshot(){
 const rows=db.prepare("SELECT id,kind,revision,deleted FROM entities WHERE kind IN ('note','memory','event','libraryFile') ORDER BY id").all();
 return {rows,signature:createHash('sha256').update(JSON.stringify(rows)).digest('hex')};
}
export async function verifyIndexMigration(id){
 const migration=getIndexMigration(id);
 if(!migration||migration.state!=='ready')throw new Error('回填尚未完成，不能验证覆盖。');
 if(indexCollection(migration.target)!==migration.collection_name)throw new Error('模型协议已变化，旧回填不能验证为新索引。');
 const before=indexSourceSnapshot(),expected=new Map();let sourceCount=0;
 for(const row of before.rows){
  const entity=get(row.id,row.kind);
  if(!entity||(row.kind==='memory'&&entity.status!=='active')||(row.kind==='libraryFile'&&entity.status!=='ready'))continue;
  const chunks=splitText(entity.content||entity.summary||'');if(chunks.length)sourceCount++;
  for(const part of chunks)expected.set(row.id+':'+part.index,{entityId:row.id,kind:row.kind,revision:row.revision,status:entity.status||'ready',text:part.text,start:part.start,end:part.end,...retrievalPayload(entity,row.kind)});
 }
 const seen=new Set(),mismatches=[];let offset,remoteCount=0,ended=false;
 for(let page=0;page<1000;page++){
  const result=await scrollIndex(migration.target,offset);
  if(!Array.isArray(result.points))throw new Error('索引检查返回格式无效。');
  for(const point of result.points){
   remoteCount++;const payload=point.payload||{},key=payload.entityId+':'+payload.chunk,want=expected.get(key);
   if(!want||seen.has(key)||Object.entries(want).some(([k,v])=>payload[k]!==v))mismatches.push({id:String(point.id),entityId:payload.entityId,reason:'不存在、重复、范围或正文版本不匹配'});
   else seen.add(key);
  }
  if(result.next_page_offset===null||result.next_page_offset===undefined){ended=true;break;}
  if(result.next_page_offset===offset)throw new Error('索引分页未前进，停止覆盖检查。');
  offset=result.next_page_offset;
 }
 if(!ended)throw new Error('覆盖检查达到分页上限，未完成全量检查。');
 return transaction(()=>{
  const current=getIndexMigration(id),after=indexSourceSnapshot();
  if(current?.state!=='ready'||before.signature!==after.signature)throw new Error('检查期间资料发生变化，请等待新版本回填后重试。');
  const missing=[...expected.keys()].filter(key=>!seen.has(key));
  const result={migrationId:id,collection:migration.collection_name,checkedAt:new Date().toISOString(),sourceSignature:before.signature,
   sourceCount,expectedPoints:expected.size,remotePoints:remoteCount,missingCount:missing.length,mismatchCount:mismatches.length,
   missing:missing.slice(0,20),mismatches:mismatches.slice(0,20),coverageVerified:!missing.length&&!mismatches.length,
   qualityVerified:false,note:'这是正文/版本/范围/分段覆盖验证，不是语义检索质量验收；不会自动切换在线检索。'};
  setSetting('index-verification:'+id,result);return result;
 });
}
