process.env.WORKER_MODE='true';process.env.SEED_DEMO='false';
const {readFile,writeFile,access}=await import('node:fs/promises');
const {createHash}=await import('node:crypto');
const path=await import('node:path');
const {DatabaseSync}=await import('node:sqlite');
const {performance}=await import('node:perf_hooks');
const root=process.cwd(),labelsRaw=await readFile('artifacts/retrieval-heldout-questions-v2.json','utf8');
const labels=JSON.parse(labelsRaw),digest=createHash('sha256').update(labelsRaw).digest('hex');
const privateRoot=path.join(root,'.data/evaluations/ret-heldout-v2');
const outputFile='artifacts/retrieval-heldout-result-v2.json';
try{await access(outputFile);throw new Error('Result already exists; refusing to overwrite held-out evidence');}catch(error){if(error.code!=='ENOENT')throw error;}
process.env.DATA_DIR=privateRoot;process.env.QDRANT_COLLECTION='shiguang_holdout_'+digest.slice(0,10);
const original=new DatabaseSync(path.join(root,'.data/shiguang.sqlite'),{readOnly:true});
const migration=original.prepare("SELECT target,collection_name FROM index_migrations WHERE id=? AND state='ready'").get(process.argv[2]);
original.close();if(!migration)throw new Error('Ready source migration required');
const config=JSON.parse(migration.target);
const rows=JSON.parse(await readFile(path.join(privateRoot,'corpus.json'),'utf8'));
const {db,getSetting,setSetting}=await import('../../server/store.mjs');
const {prepareIndex,indexSource,searchIndex,scrollIndex}=await import('../../server/retrieval.mjs');
const {indexCollection}=await import('../../server/embedding-contract.mjs');
const {splitText}=await import('../../server/library.mjs');
const {relevancePolicy}=await import('../../server/retrieval-relevance.mjs');
if(relevancePolicy(config)?.minimumCosine!==0.45)throw new Error('Policy changed after held-out labels were frozen');
for(const row of rows){
 const content=row.data.content||row.data.summary||'';
 if(createHash('sha256').update(content).digest('hex')!==row.hash)throw new Error('Private corpus hash mismatch');
 db.prepare('INSERT OR IGNORE INTO entities(id,kind,data,revision,updated_at) VALUES(?,?,?,?,?)').run(row.id,row.kind,JSON.stringify(row.data),row.revision,row.data.updatedAt||labels.frozenAt);
}
const target=indexCollection(config);
async function post(collection,suffix,payload){const r=await fetch(config.qdrant+'/collections/'+collection+suffix,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(20000)});if(!r.ok)throw new Error('Qdrant HTTP '+r.status);return (await r.json()).result;}
async function put(points){if(!points.length)return;const r=await fetch(config.qdrant+'/collections/'+target+'/points?wait=true',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({points}),signal:AbortSignal.timeout(20000)});if(!r.ok)throw new Error('Point copy failed HTTP '+r.status);}
const prepared=await prepareIndex(config,{seed:false});if(prepared.created)setSetting('heldout-copied',false);
const sourceMap=new Map(rows.filter(r=>r.origin==='existing-user-source').map(r=>[r.id,r]));
if(!getSetting('heldout-copied')){
 let offset;const seen=new Set();
 do{
  const result=await post(migration.collection_name,'/points/scroll',{limit:64,with_payload:true,with_vector:true,...(offset!==undefined?{offset}:{})});
  const accepted=[];
  for(const point of result.points){
   const source=sourceMap.get(point.payload?.entityId);if(!source)continue;
   const chunk=splitText(source.data.content||source.data.summary||'')[point.payload.chunk];
   if(point.payload.revision!==source.revision||!chunk||point.payload.text!==chunk.text)throw new Error('Source index differs from frozen corpus');
   if(!Array.isArray(point.vector?.dense)||point.vector.dense.length!==1024)throw new Error('Missing source dense vector');
   seen.add(source.id+':'+point.payload.chunk);accepted.push({id:point.id,vector:point.vector,payload:point.payload});
  }
  await put(accepted);offset=result.next_page_offset;
 }while(offset!==undefined&&offset!==null);
 const required=[...sourceMap.values()].reduce((n,r)=>n+splitText(r.data.content||r.data.summary||'').length,0);
 if(seen.size!==required)throw new Error('Incomplete source vector copy');
 setSetting('heldout-copied',true);
}
for(const row of rows.filter(r=>r.origin==='project-document-copy')){
 if(!await indexSource({entity_id:row.id,kind:row.kind,revision:row.revision},config))throw new Error('New document indexing was interrupted');
 console.error(JSON.stringify({indexedProjectDocument:row.data.title}));
}
// Verify every chunk before running any held-out query.
const expected=new Map();for(const row of rows)for(const part of splitText(row.data.content||row.data.summary||''))expected.set(row.id+':'+part.index,{row,part});
const seen=new Set();let offset;
do{const result=await scrollIndex(config,offset);for(const p of result.points){const key=p.payload.entityId+':'+p.payload.chunk,want=expected.get(key);if(!want||seen.has(key)||p.payload.revision!==want.row.revision||p.payload.text!==want.part.text||p.payload.start!==want.part.start||p.payload.end!==want.part.end)throw new Error('Held-out coverage mismatch');seen.add(key);}offset=result.next_page_offset;}while(offset!==null&&offset!==undefined);
if(seen.size!==expected.size)throw new Error('Held-out chunks missing');
const results=[];
for(const q of [...labels.questions,...labels.noAnswer]){
 const started=performance.now();
 const found=await searchIndex(q.query,{limit:10},config,{seed:false});
 const unique=[...new Map(found.map(x=>[x.id,{id:x.id,revision:x.revision,score:x.score,semanticSimilarity:x.semanticSimilarity}])).values()].slice(0,5);
 results.push({id:q.id,top5:unique,pass:q.expectedIds.length?unique.some(x=>q.expectedIds.includes(x.id)):!unique.length,milliseconds:Math.round(performance.now()-started),retrieval:found.retrievalInfo});
}
const hits=results.slice(0,labels.questions.length).filter(x=>x.pass).length,noAnswer=results.slice(labels.questions.length).filter(x=>x.pass).length;
const evidence={checkedAt:new Date().toISOString(),labelsSha256:digest,collection:target,sourceMigration:process.argv[2],corpus:rows.length,existingUserSources:sourceMap.size,projectDocuments:rows.length-sourceMap.size,coverage:{expected:expected.size,actual:seen.size},positiveHits:hits,positiveQuestions:labels.questions.length,noAnswerPasses:noAnswer,noAnswerQuestions:labels.noAnswer.length,gatePassed:rows.length>=50&&rows.length<=200&&hits>=16&&noAnswer===labels.noAnswer.length,policy:relevancePolicy(config),results,limitations:labels.limitations};
await writeFile(outputFile,JSON.stringify(evidence,null,2)+'\n',{flag:'wx'});
console.error(JSON.stringify({artifact:outputFile,positiveHits:hits,noAnswerPasses:noAnswer,gatePassed:evidence.gatePassed}));
db.close();
