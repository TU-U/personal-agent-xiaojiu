// One isolated, non-personal provider sample. Read configuration only; never
// initialize the application store or place test entities into the user's DB.
import {DatabaseSync} from 'node:sqlite';
import {mkdtemp,writeFile,access} from 'node:fs/promises';
import {tmpdir} from 'node:os';import {join,resolve} from 'node:path';
const destination=resolve(process.argv[2]||'artifacts/research-model-metering.json');
try{await access(destination);throw new Error('Evaluation already exists; inspect it rather than repeat a paid call.');}catch(error){if(error.code!=='ENOENT')throw error;}
let privateProvider={};try{privateProvider=(await import('../../server/ai/provider.local.mjs')).default||{};}catch(error){if(error.code!=='ERR_MODULE_NOT_FOUND')throw error;}
const live=new DatabaseSync(resolve('.data/shiguang.sqlite'),{readOnly:true});
const saved=live.prepare('SELECT value FROM settings WHERE key=?').get('provider');live.close();
const provider=saved?JSON.parse(saved.value):{...privateProvider,...(process.env.LLM_BASE_URL?{baseUrl:process.env.LLM_BASE_URL}:{}),...(process.env.LLM_MODEL?{model:process.env.LLM_MODEL}:{}),...(process.env.LLM_API_KEY?{apiKey:process.env.LLM_API_KEY}:{})};
process.env.DATA_DIR=await mkdtemp(join(tmpdir(),'research-real-model-'));process.env.WORKER_MODE='true';process.env.SEED_DEMO='false';
const {createResearchBudget}=await import('../../server/agent/research/research-budget.mjs');
const {completeResearch}=await import('../../server/agent/research/research-model.mjs');
const db=new DatabaseSync(join(process.env.DATA_DIR,'budget.sqlite')),ledger=createResearchBudget(db);ledger.initialize('provider-sample');
let evaluation;
try{
 const result=await completeResearch({ledger,runId:'provider-sample',stepKey:'one-small-sample',provider,system:'你正在进行一个无个人资料的接口测试。只回复用户指定的测试词。',user:'请只回复：计费验证成功',maxTokens:64,timeoutMs:30000});
 const persisted=ledger.attempt('provider-sample','one-small-sample');
 evaluation={checkedAt:new Date().toISOString(),providerOrigin:new URL(provider.baseUrl).origin,requestedModel:provider.model,output:result.content,receipt:result.receipt,price:result.price,inputTokenBound:result.inputTokenBound,outputTokenBound:result.outputTokenBound,budget:ledger.snapshot('provider-sample'),chargeBasis:result.chargeBasis,persisted:!!persisted,passed:result.content.includes('计费验证成功')&&result.chargeBasis==='usage-upper-bound',limitations:['真实小样本不证明所有文本的上界；后续每次仍核验实际用量。','费用按高峰价格保守核算，不是供应商扣款账单。','尚未验收应用调研图、网页与搜索链路。']};
}catch(error){evaluation={checkedAt:new Date().toISOString(),passed:false,code:error.code||'UNKNOWN',budget:ledger.snapshot('provider-sample'),limitations:['小样本失败；未自动重试。']};}
finally{db.close();}
await writeFile(destination,JSON.stringify(evaluation,null,2)+'\n',{flag:'wx',mode:0o600});
console.log(JSON.stringify({destination,passed:evaluation.passed,budget:evaluation.budget,code:evaluation.code}));
if(!evaluation.passed)process.exitCode=1;
