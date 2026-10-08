import {DatabaseSync} from 'node:sqlite';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
const root=process.cwd(),stamp=new Date().toISOString().replace(/[:.]/g,'-');
const live=new DatabaseSync(path.join(root,'.data/shiguang.sqlite'),{readOnly:true});
const setting=name=>{const row=live.prepare('SELECT value FROM settings WHERE key=?').get(name);return row?JSON.parse(row.value):null;};
const retrieval=setting('retrieval');let provider=setting('provider');live.close();
if(!provider)provider=(await import('../server/ai/provider.local.mjs')).default;
if(!provider?.model||retrieval?.indexProfile!=='qwen3-local-v1')throw new Error('Configured generation and Qwen profile required');
const prefix='pet_eval_'+stamp.toLowerCase().replace(/[^a-z0-9]/g,'_');
Object.assign(process.env,{DATA_DIR:path.join(root,'.data/evaluations','pet-live-'+stamp),QDRANT_COLLECTION:prefix,SEED_DEMO:'false',WORKER_MODE:'true'});
const {save,setSetting,db}=await import('../server/store.mjs');setSetting('provider',provider);setSetting('retrieval',retrieval);
const {prepareIndex,indexSource,hybridSearch}=await import('../server/retrieval/retrieval.mjs');
const {indexCollection}=await import('../server/ai/embedding-contract.mjs');
const {petChat}=await import('../server/pet/pet-chat.mjs');
const collection=indexCollection(retrieval),output=path.join(root,'artifacts','pet-live-'+stamp+'.json');
if(!collection.startsWith(prefix+'_'))throw new Error('Isolated collection check failed');
const result={syntheticOnly:true,createdAt:new Date().toISOString(),providerModel:provider.model,embeddingModel:retrieval.model,collection,checks:[],ok:false};
try{
 await prepareIndex(retrieval,{seed:false});
 const memory=save('memory',{title:'安静放松偏好',content:'我在工作一天感到疲惫时，喜欢到安静的地方听轻柔的纯音乐放松。',status:'active',scope:'通用',scopeKind:'global',scopeId:''});
 const candidate=save('memory',{title:'未确认偏好',content:'工作疲惫时我只想去吵闹的聚会。',status:'candidate',scope:'通用',scopeKind:'global',scopeId:''});
 for(const entity of [memory,candidate])await indexSource({entity_id:entity.id,kind:'memory',revision:entity.revision},retrieval);
 const response=await petChat({message:'今天工作好累，想放松一下，你记得我喜欢什么方式吗？',history:[]});
 result.response=response;
 result.checks.push({name:'real-qwen-memory-in-context',ok:response.memoryUsage.some(item=>item.id===memory.id)&&!response.memoryUsage.some(item=>item.id===candidate.id)});
 result.checks.push({name:'real-model-nonempty-reply',ok:!!response.reply&&response.reply.length<=600});
 save('memory',{...memory,status:'paused'},memory.revision);
 const hits=await hybridSearch('工作疲惫放松喜欢什么方式',{kind:'memory',limit:6});
 result.checks.push({name:'paused-vector-residual-excluded',ok:!hits.some(item=>item.id===memory.id)});
 result.ok=result.checks.every(item=>item.ok);
}catch(error){result.error=error.message;}
finally{
 const cleanup=await fetch(retrieval.qdrant+'/collections/'+collection,{method:'DELETE',signal:AbortSignal.timeout(15000)}).catch(()=>null);
 result.cleanup={collectionDeleted:!!cleanup?.ok};await mkdir(path.dirname(output),{recursive:true});await writeFile(output,JSON.stringify(result,null,2));db.close();
 console.error(JSON.stringify({output,ok:result.ok,cleanup:result.cleanup}));
}
if(!result.ok)process.exitCode=1;
