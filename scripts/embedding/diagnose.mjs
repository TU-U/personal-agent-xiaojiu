process.env.WORKER_MODE='true';process.env.SEED_DEMO='false';
const {readFile,writeFile}=await import('node:fs/promises');
const {getIndexMigration}=await import('../../server/index-migration.mjs');
const {embeddingInput}=await import('../../server/embedding-contract.mjs');
const {lexicalVector}=await import('../../server/retrieval.mjs');
const labels=JSON.parse(await readFile('artifacts/retrieval-questions-v1.json','utf8'));
const m=getIndexMigration(process.argv[2]);if(!m)throw new Error('Migration ID required');
const titles=new Map(labels.corpus.map(s=>[s.id,s.title]));
async function post(url,payload){const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(15000)});if(!r.ok)throw new Error('HTTP '+r.status);return r.json();}
const results=[];
for(const question of [...labels.questions,...labels.noAnswer]){
 const embedding=await post(m.target.embedding+'/embeddings',{model:m.target.model,input:embeddingInput(question.query,m.target,'query'),truncate:false});
 const dense=embedding.data[0].embedding,lexical=lexicalVector(question.query);
 const url=m.target.qdrant+'/collections/'+m.collection_name+'/points/query';
 const a=await post(url,{query:dense,using:'dense',limit:30,with_payload:true});
 const b=await post(url,{query:lexical,using:'lexical',limit:30,with_payload:true});
 const describe=points=>points.map((p,i)=>({rank:i+1,id:p.payload.entityId,title:titles.get(p.payload.entityId),chunk:p.payload.chunk,score:p.score,expected:question.expectedIds.includes(p.payload.entityId)}));
 results.push({id:question.id,dense:describe(a.result.points),lexical:describe(b.result.points)});
}
await writeFile('artifacts/retrieval-diagnostics-v1.json',JSON.stringify(results,null,2)+'\n');
console.log(JSON.stringify(results.map(x=>({id:x.id,topDense:x.dense[0]?.score,denseExpected:x.dense.find(p=>p.expected)?.rank,lexicalExpected:x.lexical.find(p=>p.expected)?.rank})),null,2));
