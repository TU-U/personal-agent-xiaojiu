import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {performance} from 'node:perf_hooks';
import {embeddingInput,checkedVector,indexDescriptor,indexCollection,qwenProfile} from '../../server/ai/embedding-contract.mjs';
const config={model:'qwen3-embedding-0.6b',indexProfile:qwenProfile};
const base='http://127.0.0.1:4320';
const timings=[];
async function vector(text,role){
 const begin=performance.now();
 const r=await fetch(base+'/v1/embeddings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:config.model,input:embeddingInput(text,config,role),truncate:false}),signal:AbortSignal.timeout(30000)});
 const body=await r.json();if(!r.ok)throw new Error(JSON.stringify(body));
 const raw=body.data?.[0]?.embedding;
 const norm=Math.sqrt(raw.reduce((sum,x)=>sum+x*x,0));
 if(Math.abs(norm-1)>.001)throw new Error('Runtime vector is not L2 normalized');
 timings.push({role,characters:text.length,milliseconds:Math.round(performance.now()-begin),dimensions:raw.length,rawNorm:norm});
 return checkedVector(raw,config);
}
const docs=[{id:'book',text:'周六下午在深圳图书馆参加读书分享会，需要提前报名。'},{id:'backup',text:'服务器数据库每天凌晨备份到独立硬盘，恢复时先校验文件哈希。'},{id:'walk',text:'晚饭后在公园散步半小时，有助于放松和规律作息。'}];
const queries=[{text:'我想找个交流阅读心得的活动，去哪里？',expected:'book'},{text:'How do I recover my database after a disk failure?',expected:'backup'}];
const vectors=[];for(const doc of docs)vectors.push(await vector(doc.text,'document'));
const results=[];
for(const query of queries){const q=await vector(query.text,'query');const ranked=docs.map((d,i)=>({id:d.id,score:q.reduce((n,x,k)=>n+x*vectors[i][k],0)})).sort((a,b)=>b.score-a.score);results.push({...query,ranked,pass:ranked[0].id===query.expected});}
await vector('项目开发记录：已经完成数据库备份，接下来验证恢复流程。'.repeat(60),'document');
// A service must reject oversize input, never return an embedding for an unseen tail.
const overflow=await fetch(base+'/v1/embeddings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:config.model,input:'记录内容。'.repeat(10000),truncate:false}),signal:AbortSignal.timeout(30000)});
const overflowBody=await overflow.json();
if(overflow.ok)throw new Error('Oversize input silently accepted; inspect truncation behavior');
let memory=null;try{const pid=(await readFile('.data/qwen-embedding.pid','utf8')).trim();memory=(await readFile('/proc/'+pid+'/status','utf8')).split('\n').filter(x=>/^Vm(RSS|Peak):/.test(x));}catch{}
const artifact={checkedAt:new Date().toISOString(),descriptor:indexDescriptor(config),collection:indexCollection(config),base,docs,results,timings,memory,overflow:{status:overflow.status,error:overflowBody.error?.message||overflowBody.error},note:'Two synthetic smoke queries only; not the representative 20-query RET-A05 evaluation. Active BGE configuration unchanged.'};
await mkdir('artifacts',{recursive:true});await writeFile('artifacts/qwen-embedding-check.json',JSON.stringify(artifact,null,2)+'\n');
console.log(JSON.stringify({ok:results.every(r=>r.pass),results:results.map(r=>({expected:r.expected,actual:r.ranked[0].id})),timings,memory,overflowStatus:overflow.status}));
if(results.some(r=>!r.pass))process.exitCode=1;
