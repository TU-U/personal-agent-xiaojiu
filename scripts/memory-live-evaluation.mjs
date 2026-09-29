import {DatabaseSync} from 'node:sqlite';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
const stamp=new Date().toISOString().replace(/[:.]/g,'-'),root=process.cwd();
const output=path.join(root,'artifacts','memory-live-'+stamp+'.json');
const live=new DatabaseSync(path.join(root,'.data/shiguang.sqlite'),{readOnly:true});
const setting=name=>{const row=live.prepare('SELECT value FROM settings WHERE key=?').get(name);return row?JSON.parse(row.value):null;};
const retrieval=setting('retrieval');let provider=setting('provider');live.close();
if(!provider)provider=(await import('../server/provider.local.mjs')).default;
if(!provider?.baseUrl||!provider?.model||retrieval?.indexProfile!=='qwen3-local-v1')throw new Error('Configured generation provider and active Qwen profile required');
process.env.DATA_DIR=path.join(root,'.data/evaluations','memory-live-'+stamp);process.env.QDRANT_COLLECTION='memory_eval_'+stamp.toLowerCase().replace(/[^a-z0-9]/g,'_');process.env.SEED_DEMO='false';process.env.WORKER_MODE='true';
const {db,save,setSetting}=await import('../server/store.mjs');
setSetting('provider',provider);setSetting('retrieval',retrieval);
const {prepareIndex,indexSource,hybridSearch}=await import('../server/retrieval.mjs');
const {indexCollection}=await import('../server/embedding-contract.mjs');
const {findMemoryConflict,proposeTurnMemories}=await import('../server/engine.mjs');
const collection=indexCollection(retrieval),checks=[];
const result={createdAt:new Date().toISOString(),syntheticOnly:true,providerModel:provider.model,embeddingModel:retrieval.model,collection,checks};
const record=(name,ok,evidence)=>{checks.push({name,ok,...evidence});console.error(JSON.stringify({name,ok}));};
try{
 await prepareIndex(retrieval,{seed:false});
 const make=(content,extra={})=>save('memory',{title:content,content,status:'active',scope:'通用',scopeKind:'global',scopeId:'',...extra});
 const writing=make('我更喜欢先给出结论，用简短句子写工作总结。');
 const location=make('我目前长期居住在深圳，尚未搬到其他城市。');
 const paused=make('我的工作总结应当写得非常冗长。',{status:'paused'});
 const candidate=make('我的工作总结应当用英文。',{status:'candidate'});
 const p=save('project',{name:'测试项目'}),other=save('project',{name:'测试项目'}),thread=save('thread',{status:'active'}),otherThread=save('thread',{status:'active'});
 const scoped=make('在这个项目里，我给自动化助手起的代号是星桥。',{scopeKind:'project',scopeId:p.id});
 const wrong=make('在另一个项目里，自动化助手代号是月桥。',{scopeKind:'project',scopeId:other.id});
 const local=make('这个话题只讨论阳台番茄的浇水计划。',{scopeKind:'thread',scopeId:thread.id});
 const wrongThread=make('另一个话题只讨论兰花的浇水计划。',{scopeKind:'thread',scopeId:otherThread.id});
 for(const memory of [writing,location,paused,candidate,scoped,wrong,local,wrongThread])await indexSource({entity_id:memory.id,kind:'memory',revision:memory.revision},retrieval);
 let hits=await hybridSearch('汇报工作时我喜欢哪种叙述方式？',{kind:'memory',limit:5});
 record('semantic-paraphrase',hits.some(h=>h.id===writing.id),{hits:hits.map(h=>({title:h.title,scopeKind:h.scopeKind,score:h.score,semanticSimilarity:h.semanticSimilarity}))});
 record('unconfirmed-and-paused-excluded',!hits.some(h=>[paused.id,candidate.id].includes(h.id)),{});
 hits=await hybridSearch('星桥自动化助手的代号',{kind:'memory',projectId:p.id,limit:5});record('project-exact-term',hits.some(h=>h.id===scoped.id)&&!hits.some(h=>h.id===wrong.id),{titles:hits.map(h=>h.title)});
 hits=await hybridSearch('番茄浇水计划',{kind:'memory',threadId:thread.id,limit:5});record('thread-filter',hits.some(h=>h.id===local.id)&&!hits.some(h=>h.id===wrongThread.id),{titles:hits.map(h=>h.title)});
 const pausedWriting=save('memory',{...writing,status:'paused'},writing.revision);
 hits=await hybridSearch('工作总结先给结论',{kind:'memory',limit:5});record('pause-before-vector-cleanup',!hits.some(h=>h.id===pausedWriting.id),{});
 // Put the target beyond the old 80-item positional limit; fillers remain
 // unindexed to exercise the database snapshot alongside indexed priority hits.
 const fillers=Array.from({length:85},(_,i)=>make(`测试用户收藏的第${i+1}本植物图鉴编号为BOT-${i+1}。`));
 const started=Date.now();const conflict=await findMemoryConflict('我已经搬家，现在长期住在广州，不再住深圳。',[...fillers,location]);
 record('old-memory-after-80-conflict',conflict?.id===location.id,{classification:conflict?.conflictKind,reason:conflict?.conflictReason,elapsedMs:Date.now()-started});
 const proposal=await proposeTurnMemories('我长期偏好中文交流，写总结时先写结论，再用简短句子补充依据。');record('user-fact-proposals',proposal.items.length>0&&proposal.items.length<=3,{result:proposal});
 const empty=await proposeTurnMemories('请解释一下什么是消息队列？');record('temporary-question-no-memory',empty.items.length===0&&!empty.notice.includes('失败'),{result:empty});
 result.ok=checks.every(c=>c.ok);
}catch(error){result.ok=false;result.error=error.message;console.error('evaluation failed: '+error.message);}
finally{
 await mkdir(path.dirname(output),{recursive:true});await writeFile(output,JSON.stringify(result,null,2));
 // This unique test collection cannot address the application collection.
 const response=await fetch(retrieval.qdrant+'/collections/'+collection,{method:'DELETE',signal:AbortSignal.timeout(15000)}).catch(()=>null);
 result.cleanup={collectionDeleted:!!response?.ok};await writeFile(output,JSON.stringify(result,null,2));db.close();
 console.error(JSON.stringify({output,ok:result.ok,cleanup:result.cleanup}));
}
if(!result.ok)process.exitCode=1;
