import {sourceReading} from '../domain/shared/source-content.mjs';
import {memorySourceValid} from '../domain/memory/memory-source.mjs';
import {libraryCandidateIds} from '../domain/library/library-filters.mjs';
import {existsSync} from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import { db, all, get, getSetting, setSetting, transaction } from '../store.mjs';
import {embeddingInput,checkedVector,indexCollection,indexDescriptor} from '../ai/embedding-contract.mjs';
import {managedIndex} from './index/managed-index.mjs';
import {relevancePolicy,cosineSimilarity} from './retrieval-relevance.mjs';
import {sourceApplies,retrievalPayload,retrievalFilter} from './retrieval-scope.mjs';
import { splitText } from '../domain/library/library.mjs';
import { logAiEvent, registerAiSecret } from '../core/ai-log.mjs';

const segmenter = new Intl.Segmenter('zh-CN', { granularity: 'word' });
const localInstalled=!process.env.DATA_DIR&&existsSync('.local-model/bge-m3-Q4_K_M.gguf')&&existsSync('.local-model/qdrant/qdrant');
export const retrievalConfig = () => { const saved=getSetting('retrieval',null); if(saved)return {...saved,key:saved.apiKey||''}; return ({
  qdrant: (process.env.QDRANT_URL || (localInstalled?'http://127.0.0.1:6333':'')).replace(/\/$/, ''),
  embedding: (process.env.EMBEDDING_BASE_URL || (localInstalled?'http://127.0.0.1:4319/v1':'')).replace(/\/$/, ''),
  model: process.env.EMBEDDING_MODEL || (localInstalled?'bge-m3':''),
  key: process.env.EMBEDDING_API_KEY || '',
}); };
const config=retrievalConfig;
export async function testEmbedding(){const c=config();if(!c.embedding||!c.model)throw unavailable('尚未配置 Embedding 服务');const vector=await embed('能力连接测试',c);return {dimensions:vector.length,model:c.model};}
export const hybridAvailable = () => { const c = config(); return !!(c.qdrant && c.embedding && c.model); };
const collectionName = indexCollection;
const unavailable = (message) => Object.assign(new Error(message), { status: 503 });

function lexicalVector(text) {
  const counts = new Map();
  const words = [...segmenter.segment(String(text).toLowerCase())]
    .filter(part => part.isWordLike && part.segment.length > 1)
    .map(part => part.segment);
  for (const word of words) {
    // Stable feature hashing supplies an exact-term signal without a separate sparse model.
    const digest = createHash('sha256').update(word).digest();
    const index = digest.readUInt32BE(0) & 0x7fffffff;
    counts.set(index, (counts.get(index) || 0) + 1);
  }
  const indices = [...counts.keys()].sort((a, b) => a - b);
  return { indices, values: indices.map(index => 1 + Math.log(counts.get(index))) };
}

async function jsonRequest(url, options = {}, label = '检索服务') {
  let response;
  options.signal?.throwIfAborted();
  const signal=options.signal?AbortSignal.any([options.signal,AbortSignal.timeout(15000)]):AbortSignal.timeout(15000);
  try { response = await fetch(url, { ...options, signal }); }
  catch { options.signal?.throwIfAborted();throw unavailable(`${label}无法连接，请检查服务地址和运行状态。`); }
  options.signal?.throwIfAborted();
  if (!response.ok) throw Object.assign(unavailable(`${label}返回 ${response.status}，请检查配置。`),{status:[400,401,403,422,429].includes(response.status)?response.status:503});
  try { const result=await response.json();options.signal?.throwIfAborted();return result; }
  catch { options.signal?.throwIfAborted();throw unavailable(`${label}返回了无效数据。`); }
}
const body = value => ({ headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(value) });
async function embed(text, c, role='document',signal) {
  const input=embeddingInput(text,c,role);
  registerAiSecret(c.key);
  const callId=randomUUID(),started=Date.now();
  logAiEvent({stage:'request',kind:'embedding',callId,provider:c.embedding,model:c.model,role,indexProfile:c.indexProfile||null,input});
  let result;
  try {result = await jsonRequest(`${c.embedding}/embeddings`, {
    method: 'POST', signal, ...body({ model: c.model, input, ...(c.indexProfile?{truncate:false}:{}) }),
    headers: { 'Content-Type': 'application/json', ...(c.key ? { Authorization: `Bearer ${c.key}` } : {}) },
  }, 'Embedding 模型');}
  catch(error){logAiEvent({stage:'error',kind:'embedding',callId,durationMs:Date.now()-started,error:error.message});throw error;}
  const vector = result.data?.[0]?.embedding;
  if (!Array.isArray(vector) || !vector.length || vector.some(value => !Number.isFinite(value))) {logAiEvent({stage:'error',kind:'embedding',callId,durationMs:Date.now()-started,error:'模型没有返回有效向量',response:result});throw unavailable('Embedding 模型没有返回有效向量。');}
  let checked;try{checked=checkedVector(vector,c);}catch(error){logAiEvent({stage:'error',kind:'embedding',callId,durationMs:Date.now()-started,dimensions:vector.length,error:error.message});throw error;}
  logAiEvent({stage:'response',kind:'embedding',callId,durationMs:Date.now()-started,dimensions:vector.length,usage:result.usage});
  return checked;
}
async function qdrant(c, method, suffix, payload,signal) {
  const path = `/collections/${encodeURIComponent(collectionName(c))}${suffix}`;
  const result = await jsonRequest(`${c.qdrant}${path}`, { method, signal, ...(payload === undefined ? {} : body(payload)) }, 'Qdrant');
  if (result.status !== 'ok') throw unavailable('Qdrant 未确认检索操作。');
  return result.result;
}
async function ensureCollection(c, dimension, {seed=true,signal}={}) {
  signal?.throwIfAborted();
  let response;
  let created = false;
  try { response = await fetch(`${c.qdrant}/collections/${encodeURIComponent(collectionName(c))}`, { signal: signal?AbortSignal.any([signal,AbortSignal.timeout(15000)]):AbortSignal.timeout(15000) }); }
  catch { signal?.throwIfAborted();throw unavailable('Qdrant 无法连接，请先启动本机检索服务。'); }
  signal?.throwIfAborted();
  if (response.status === 404) {
    await qdrant(c, 'PUT', '', { vectors: { dense: { size: dimension, distance: 'Cosine' } }, sparse_vectors: { lexical: {} } },signal);
    created = true;
  } else if (!response.ok) throw unavailable(`Qdrant 返回 ${response.status}，请检查配置。`);
  else {
    let info;try{info=await response.json();}catch{signal?.throwIfAborted();throw unavailable('Qdrant集合配置无效。');}
    signal?.throwIfAborted();
    const params=info.result?.config?.params;
    if(info.status!=='ok'||params?.vectors?.dense?.size!==dimension||params?.vectors?.dense?.distance!=='Cosine'||!params?.sparse_vectors?.lexical)
      throw unavailable('Qdrant集合维度或向量配置不匹配，请使用独立索引迁移，不能混写。');
  }
  signal?.throwIfAborted();
  if(created){
    setSetting('index-rebuild-required:'+collectionName(c),true);
    for(const prefix of ['indexed:','index-inventory:','index-progress:','index-receipt:','index-error:'])db.prepare('DELETE FROM settings WHERE substr(key,1,?)=?').run((prefix+collectionName(c)+':').length,prefix+collectionName(c)+':');
  }
  const descriptor=indexDescriptor(c);
  if(descriptor)setSetting('index-contract:'+collectionName(c),descriptor);
  const marker = `search-index:${collectionName(c)}:scope-v1`;
  if (seed && (created || !getSetting(marker, false))) {
    const insert = db.prepare('INSERT INTO search_outbox(entity_id,kind,revision,updated_at) VALUES(?,?,?,?) ON CONFLICT(entity_id) DO UPDATE SET revision=excluded.revision,updated_at=excluded.updated_at');
    for (const kind of ['note', 'memory', 'event', 'libraryFile']) for (const entity of all(kind)) insert.run(entity.id, kind, entity.revision, entity.updatedAt);
    setSetting(marker, true);
  }
  return {created,collection:collectionName(c)};
}
export async function prepareIndex(c,options){const probe=await embed('资料索引',c);return ensureCollection(c,probe.length,options);}
export async function indexSource(row,c,{isCurrent=()=>true,onProgress=()=>{}}={}){
 const entity=get(row.entity_id,row.kind);
 const current=()=>{
   const actual=db.prepare('SELECT kind,revision FROM entities WHERE id=?').get(row.entity_id);
   return isCurrent()&&actual?.kind===row.kind&&actual.revision===row.revision;
 };
 if(!current())return false;
 const valid=entity&&(row.kind!=='memory'||entity.status==='active'&&memorySourceValid(entity))&&(row.kind!=='libraryFile'||entity.status==='ready');
 const content=valid?sourceReading(entity,row.kind).text:'';
 const pieces=splitText(content);
 const indexedKey='indexed:'+collectionName(c)+':'+row.entity_id;
 const inventoryKey='index-inventory:'+collectionName(c)+':'+row.entity_id;
 const progressKey='index-progress:'+collectionName(c)+':'+row.entity_id;
 const previous=getSetting(progressKey,{});
 // Include partial and uncertain writes from any prior revision. Otherwise a failed
 // long-document upload followed by a shorter revision leaks its old tail forever.
 const inventory=new Set([...getSetting(indexedKey,[]),...getSetting(inventoryKey,[]),...(previous.ids||[])]);
 const contentHash=createHash('sha256').update(content).digest('hex'),canResume=previous.revision===row.revision&&previous.contentHash===contentHash;
 const resume=canResume?previous.next||0:0;
 const ids=canResume?[...(previous.ids||[])]:[];
 let superseded=false;
 for(const part of pieces.slice(resume)){
 // New Qwen writes use revision-specific identities: a late remote PUT from an
 // expired worker cannot overwrite the point for a newer source revision.
 const identity=entity.id+':'+(c.indexProfile?entity.revision+':':'')+part.index;
 const id=!c.indexProfile&&part.index===0?entity.id:createHash('md5').update(identity).digest('hex').replace(/^(........)(....)(....)(....)(............)$/,'$1-$2-$3-$4-$5');
 const text=[entity.title,part.text,...(entity.tags||[]),entity.project||''].join('\n');
 const dense=await embed(text,c),lexical=lexicalVector(text);
 if(!current()){superseded=true;break;}
 // Persist intent before sending: a timeout can mean Qdrant accepted the point.
 inventory.add(id);setSetting(inventoryKey,[...inventory]);
 await qdrant(c,'PUT','/points?wait=true',{points:[{id,vector:{dense,...(lexical.indices.length?{lexical}:{})},payload:{entityId:entity.id,kind:row.kind,revision:entity.revision,...retrievalPayload(entity,row.kind),status:entity.status||'ready',text:part.text,start:part.start,end:part.end,chunk:part.index}}]});
 if(!current()){
   const latest=get(entity.id,row.kind);
   // Only obsolete source revisions can be removed here. A replacement worker
   // for the same revision may legitimately share this point identity.
   if(c.indexProfile&&(!latest||latest.revision!==row.revision))await qdrant(c,'POST','/points/delete?wait=true',{points:[id]});
   superseded=true;break;
 }
 ids.push(id);setSetting(progressKey,{revision:row.revision,contentHash,next:part.index+1,ids});onProgress({title:entity.title,chunk:part.index+1,total:pieces.length});
 }
 if(superseded||!current())return false;
 const obsolete=[...inventory].filter(id=>!ids.includes(id));
 if(obsolete.length)await qdrant(c,'POST','/points/delete?wait=true',{points:obsolete});
 return transaction(()=>{
   if(!current())return false;
   setSetting(indexedKey,ids);setSetting(inventoryKey,ids);setSetting('index-receipt:'+collectionName(c)+':'+row.entity_id,{revision:row.revision,chunks:ids.length,completedAt:new Date().toISOString()});db.prepare('DELETE FROM settings WHERE key=?').run('index-error:'+collectionName(c)+':'+row.entity_id);
   return true;
 });
}
let indexing=false;
export async function indexPending() {
 if(indexing||!hybridAvailable()||managedIndex(config()))return;
 indexing=true;const c=config();let currentRow;
 try {
 if(!db.prepare('SELECT 1 FROM search_outbox LIMIT 1').get()&&getSetting('search-index:'+collectionName(c)+':scope-v1',false))return;
 const probe=await embed('资料索引',c);await ensureCollection(c,probe.length);
 const rows=db.prepare('SELECT * FROM search_outbox ORDER BY updated_at LIMIT 10').all();
 for(const row of rows){
 currentRow=row;
 const isCurrent=()=>{
   const pending=db.prepare('SELECT revision,kind FROM search_outbox WHERE entity_id=?').get(row.entity_id);
   return pending?.revision===row.revision&&pending.kind===row.kind;
 };
 const done=await indexSource(row,c,{isCurrent,onProgress:progress=>setSetting('indexStatus',{status:'indexing',...progress,pending:db.prepare('SELECT COUNT(*) n FROM search_outbox').get().n,checkedAt:new Date().toISOString()})});
 if(done)db.prepare('DELETE FROM search_outbox WHERE entity_id=? AND revision=?').run(row.entity_id,row.revision);
 }
 const pending=db.prepare('SELECT COUNT(*) n FROM search_outbox').get().n;
 setSetting('indexStatus',{status:pending?'indexing':'ready',pending,checkedAt:new Date().toISOString()});
 }catch(e){if(currentRow&&get(currentRow.entity_id,currentRow.kind)?.revision===currentRow.revision)setSetting('index-error:'+collectionName(c)+':'+currentRow.entity_id,{revision:currentRow.revision,error:e.message});setSetting('indexStatus',{status:'failed',error:e.message,checkedAt:new Date().toISOString()});}finally{indexing=false;}
}
let indexTimer;
export function startIndexer(){if(indexTimer)return;void indexPending();indexTimer=setInterval(()=>void indexPending(),5000);indexTimer.unref();}

export async function searchIndex(query, options = {}, c=config(), {seed=true,readOnly=false,signal,sourceIds}={}) {
  signal?.throwIfAborted();
  if(sourceIds!==undefined&&(!Array.isArray(sourceIds)||sourceIds.length>100||sourceIds.some(id=>typeof id!=='string'||!id.trim()||id.length>100)||new Set(sourceIds).size!==sourceIds.length))throw Object.assign(new Error('检索来源范围无效。'),{status:400});
  const allowedIds=sourceIds===undefined?null:new Set(sourceIds);
  if(allowedIds?.size===0)return [];
  const {project='',limit=6,kind:onlyKind=''}=options;
  const managed=managedIndex(c);if(managed&&!managed.compatible)throw unavailable('索引协议或迁移状态已变化，请完成新索引迁移后再检索。');
  if(!Number.isInteger(limit)||limit<1||limit>100)throw Object.assign(new Error('检索数量需要为1至100。'),{status:400});
  if (!(c.qdrant&&c.embedding&&c.model)) throw unavailable('尚未配置 Qdrant 和 Embedding 模型。');
  const libraryIds=onlyKind==='libraryFile'&&options.libraryFilters?libraryCandidateIds(options.libraryFilters):null;
  if(libraryIds&&!libraryIds.length){const empty=[];Object.defineProperty(empty,'retrievalInfo',{value:{examined:0,truncated:false,evidenceStatus:'insufficient',notice:'筛选范围内没有可检索正文，请调整筛选或等待解析完成。'}});return empty;}
  const dense = await embed(query, c, 'query',signal);
  if(readOnly){
    // A research reader must not create a collection, seed indexing work, or
    // change the active index descriptor while it is collecting evidence.
    const info=await qdrant(c,'GET','',undefined,signal),params=info?.config?.params;
    if(params?.vectors?.dense?.size!==dense.length||params?.vectors?.dense?.distance!=='Cosine'||!params?.sparse_vectors?.lexical)throw unavailable('Qdrant集合维度或向量配置不匹配，请完成索引迁移。');
  }else await ensureCollection(c, dense.length,{seed,signal});
  signal?.throwIfAborted();

  const lexical = lexicalVector(query);
  const policy=relevancePolicy(c);let weakCount=0,bestSemanticScore=null;
  const filter=retrievalFilter(options);
  if(allowedIds)filter.must.push({key:'entityId',match:{any:[...allowedIds]}});
  if(libraryIds)filter.must.push({key:'entityId',match:{any:libraryIds}});
  const matches=[];const perEntity=new Map();const seen=new Set();
  // Re-query a larger fused prefix after SQLite rejects stale candidates. Offset
  // alone cannot retrieve beyond the original dense/sparse candidate windows.
  let window=Math.max(limit*4,20),exhausted=false;
  const cap=1000;
  for(let attempt=0;attempt<7;attempt++){
    signal?.throwIfAborted();
    const prefetch=[{query:dense,using:'dense',limit:window,filter}];
    if(lexical.indices.length)prefetch.push({query:lexical,using:'lexical',limit:window,filter});
    const results=await qdrant(c,'POST','/points/query',{prefetch,query:{rrf:{}},limit:window,with_payload:true,...(policy?{with_vector:['dense']} :{}),filter},signal);
    const points=results?.points||[];
    matches.length=0;perEntity.clear();weakCount=0;bestSemanticScore=null;const pageSeen=new Set();
    for(const point of points){
      signal?.throwIfAborted();
      const pointId=String(point.id);if(pageSeen.has(pointId))continue;pageSeen.add(pointId);seen.add(pointId);
      const kind=point.payload?.kind;
      if((onlyKind&&kind!==onlyKind)||!['note','memory','event','libraryFile'].includes(kind))continue;
      const entity=get(point.payload.entityId||pointId,kind);
      if(!entity||(allowedIds&&!allowedIds.has(entity.id))||entity.revision!==point.payload.revision||!sourceApplies(entity,kind,options))continue;
      if(readOnly){
        const original=sourceReading(entity,kind).text,{start,end,text}=point.payload;
        // Revision equality alone cannot prove that a vector payload is an
        // exact quotation. Research needs a locator into the SQL source.
        if(!Number.isInteger(start)||!Number.isInteger(end)||start<0||end<=start||end>original.length||typeof text!=='string'||original.slice(start,end)!==text)continue;
      }
      const semanticSimilarity=policy?cosineSimilarity(dense,point):null;
      if(policy){bestSemanticScore=Math.max(bestSemanticScore??-1,semanticSimilarity);if(semanticSimilarity<policy.minimumCosine){weakCount++;continue;}}
      if((perEntity.get(entity.id)||0)>=2)continue;perEntity.set(entity.id,(perEntity.get(entity.id)||0)+1);
      matches.push({...entity,content:point.payload.text||entity.content,chunk:point.payload.chunk,start:point.payload.start,end:point.payload.end,kind,score:point.score,...(policy?{semanticSimilarity}:{})});
      if(matches.length>=limit)break;
    }
    exhausted=points.length<window;
    if(matches.length>=limit||exhausted||window===cap)break;
    window=Math.min(window*2,cap);
  }
  Object.defineProperty(matches,'retrievalInfo',{value:{examined:seen.size,candidateLimit:window,truncated:matches.length<limit&&!exhausted,
    ...(policy?{relevancePolicy:policy.version,minimumCosine:policy.minimumCosine,bestSemanticScore,weakCount,evidenceStatus:matches.length?'related_candidates':exhausted?'insufficient':'limited'}:{}),
    notice:matches.length<limit&&!exhausted?'候选检查达到上限，可能还有未检查的结果。':policy&&!matches.length?'未找到相关度足够的资料，当前结果不足以支持回答。可以补充关键词或直接引用原文。':''}});
  logAiEvent({stage:'result',kind:'retrieval',query,project,matched:matches.map(item=>({id:item.id,kind:item.kind,score:item.score}))});
  return matches;
}

export const hybridSearch=(query,options)=>searchIndex(query,options);
export { lexicalVector };
export const scrollIndex=(c,offset)=>qdrant(c,'POST','/points/scroll',{limit:128,with_payload:true,with_vector:false,...(offset!==undefined?{offset}:{})});
