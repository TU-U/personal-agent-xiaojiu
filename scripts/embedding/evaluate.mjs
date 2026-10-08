process.env.WORKER_MODE='true';process.env.SEED_DEMO='false';
const {readFile,writeFile,access}=await import('node:fs/promises');
const {createHash}=await import('node:crypto');
const {performance}=await import('node:perf_hooks');
const {get,all}=await import('../../server/store.mjs');
const {searchIndex,retrievalConfig}=await import('../../server/retrieval/retrieval.mjs');
const {getIndexMigration}=await import('../../server/retrieval/index/index-migration.mjs');
const destination=process.argv[3]||'artifacts/retrieval-baseline-v1.json';
try{await access(destination);throw new Error('Refusing to overwrite prior evaluation artifact: '+destination);}catch(error){if(error.code!=='ENOENT')throw error;}
const raw=await readFile('artifacts/retrieval-questions-v1.json','utf8'),labels=JSON.parse(raw);
const migration=getIndexMigration(process.argv[2]);
if(!migration||migration.state!=='ready')throw new Error('Pass the ready migration ID');
const hash=text=>createHash('sha256').update(text).digest('hex');
function assertSnapshot(){
 const current=[];
 for(const kind of ['note','memory','event','libraryFile'])for(const item of all(kind)){
  const content=item.content||item.summary||'';
  if(!content||kind==='memory'&&item.status!=='active'||kind==='libraryFile'&&item.status!=='ready')continue;
  current.push(item.id);
 }
 if(current.length!==labels.corpus.length)throw new Error('Corpus size changed after labels were frozen');
 for(const source of labels.corpus){const item=get(source.id,source.kind);if(!item||item.revision!==source.revision||hash(item.content||item.summary||'')!==source.contentHash)throw new Error('Frozen source changed: '+source.id);}
}
assertSnapshot();
const output={checkedAt:new Date().toISOString(),labelsSha256:hash(raw),corpus:labels.corpus.length,userSources:labels.userSourceCount,sampleSources:labels.sampleSourceCount,models:[],acceptancePassed:false,limitations:labels.limitations};
for(const [name,config] of [['BGE',retrievalConfig()],['Qwen',migration.target]]){
 const rows=[];
 for(const question of [...labels.questions,...labels.noAnswer]){
  const start=performance.now();
  try{
   const found=await searchIndex(question.query,{limit:10},config,{seed:false});
   const unique=[...new Map(found.map(item=>[item.id,{id:item.id,kind:item.kind,score:item.score,revision:item.revision}])).values()].slice(0,5);
   const noAnswer=question.expectedIds.length===0;
   rows.push({id:question.id,milliseconds:Math.round(performance.now()-start),top5:unique,pass:noAnswer?unique.length===0:unique.some(item=>question.expectedIds.includes(item.id)),noAnswer,retrieval:found.retrievalInfo});
  }catch(error){rows.push({id:question.id,milliseconds:Math.round(performance.now()-start),pass:false,error:error.message,noAnswer:!question.expectedIds.length});}
 }
 assertSnapshot();
 output.models.push({name,model:config.model,collection:name==='Qwen'?migration.collection_name:undefined,top5Hits:rows.filter(r=>!r.noAnswer&&r.pass).length,positiveQuestions:labels.questions.length,noAnswerPasses:rows.filter(r=>r.noAnswer&&r.pass).length,noAnswerQuestions:labels.noAnswer.length,rows});
}
await writeFile(destination,JSON.stringify(output,null,2)+'\n',{flag:'wx'});
console.error(JSON.stringify({artifact:destination,models:output.models.map(({name,top5Hits,noAnswerPasses})=>({name,top5Hits,noAnswerPasses})),acceptancePassed:false}));
