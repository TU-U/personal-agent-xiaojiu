import {DatabaseSync} from 'node:sqlite';
import {randomUUID} from 'node:crypto';
import {mkdtemp,writeFile,access} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve,join} from 'node:path';
const destination=resolve(process.argv[2]||'artifacts/research-retrieval-check.json');
try{await access(destination);throw new Error('Existing evaluation: inspect it before running another.');}catch(error){if(error.code!=='ENOENT')throw error;}
const live=new DatabaseSync(resolve('.data/shiguang.sqlite'),{readOnly:true});
const row=live.prepare("SELECT value FROM settings WHERE key='retrieval'").get();live.close();
if(!row)throw new Error('Local retrieval configuration missing');const config=JSON.parse(row.value);
process.env.DATA_DIR=await mkdtemp(join(tmpdir(),'research-real-retrieval-'));process.env.SEED_DEMO='false';process.env.WORKER_MODE='true';
process.env.QDRANT_COLLECTION='research_eval_'+randomUUID().replaceAll('-','');
const {db,save}=await import('../../server/store.mjs');
const {indexCollection}=await import('../../server/ai/embedding-contract.mjs');
const {prepareIndex,indexSource}=await import('../../server/retrieval/retrieval.mjs');
const {createResearchBudget}=await import('../../server/agent/research/research-budget.mjs');
const {retrieveResearchEvidence,researchRetrievalAvailable}=await import('../../server/agent/research/research-retrieval.mjs');
if(!researchRetrievalAvailable(config))throw new Error('Only installed local Qwen/Qdrant allowed');
const collection=indexCollection(config),ledger=createResearchBudget(db),task={id:randomUUID(),researchAttempt:1,researchReportVersion:1,threadId:'',researchBrief:{topic:'学习数据库事务',questions:['几次数据库写入中有一步失败，怎样撤销之前的修改？']}};
ledger.initialize(task.id);let checked;
try{
 await prepareIndex(config,{seed:false});
 const source=save('note',{title:'数据库学习材料',content:'日常活动记录：今天整理书架，打扫房间，做饭散步。\n'.repeat(160)+'无关背景。'.repeat(1000)+'\n事务的原子性要求所有操作一起成功或一起失败。执行 ROLLBACK 可以回滚事务，撤销尚未提交的修改，避免只保存了一部分写入。'});
 if(source.content.indexOf('事务的原子性')<=8000)throw new Error('Fixture tail is not beyond former limit');
 const unrelated=save('note',{title:'做饭记录',content:'今天煮饭炒菜，饭后散步，没有学习数据库。'});
 for(const item of [source,unrelated])await indexSource({entity_id:item.id,kind:'note',revision:item.revision},config);
 const result=await retrieveResearchEvidence({task,ledger,config,assertActive:()=>{}}),late=result.evidence.find(e=>e.sourceId===source.id&&e.start>8000&&e.quote.includes('ROLLBACK'));
 checked={checkedAt:new Date().toISOString(),passed:!!late,mode:'real-local-qwen-qdrant-isolated',evidence:result.evidence,notice:result.notice,budget:ledger.snapshot(task.id),limitations:['只验证真实本机混合检索、预算与准确片段；未调用生成模型或联网搜索。','使用临时SQLite与独立Qdrant集合，无用户资料。']};
}catch(error){checked={checkedAt:new Date().toISOString(),passed:false,error:error.message,code:error.code};}
finally{
 // The random namespace is created by this script only; never clear the live index.
 try{const response=await fetch(config.qdrant+'/collections/'+encodeURIComponent(collection),{method:'DELETE',signal:AbortSignal.timeout(15000)});if(!response.ok)throw new Error('cleanup HTTP '+response.status);checked.cleanup=true;}catch(error){checked.cleanup=false;checked.cleanupError=error.message;checked.passed=false;}
 db.close();
}
await writeFile(destination,JSON.stringify(checked,null,2)+'\n',{flag:'wx',mode:0o600});
console.log(JSON.stringify({destination,passed:checked.passed,cleanup:checked.cleanup,budget:checked.budget,error:checked.error}));if(!checked.passed)process.exitCode=1;
