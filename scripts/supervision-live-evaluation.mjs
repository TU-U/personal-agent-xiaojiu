import {DatabaseSync} from 'node:sqlite';import {mkdir,writeFile} from 'node:fs/promises';import path from 'node:path';
const root=process.cwd(),stamp=new Date().toISOString().replace(/[:.]/g,'-'),live=new DatabaseSync(path.join(root,'.data/shiguang.sqlite'),{readOnly:true});
const row=live.prepare("SELECT value FROM settings WHERE key='provider'").get();let provider=row?JSON.parse(row.value):null;live.close();if(!provider)provider=(await import('../server/ai/provider.local.mjs')).default;
Object.assign(process.env,{DATA_DIR:path.join(root,'.data/evaluations','supervision-live-'+stamp),SEED_DEMO:'false',WORKER_MODE:'true'});
const {db,save,setSetting}=await import('../server/store.mjs');setSetting('provider',provider);
const {assessRunEvidence,confirmRunEvidence}=await import('../server/pet/supervision/supervision-evidence.mjs');const {timerAction}=await import('../server/pet/supervision/supervision-timer.mjs');
const output=path.join(root,'artifacts','supervision-live-'+stamp+'.json'),result={syntheticOnly:true,createdAt:new Date().toISOString(),model:provider.model,checks:[],ok:false};
try{
 const task=save('workTask',{status:'running',supervisionStatus:'active'}),run=save('workRun',{taskId:task.id,status:'open',seconds:0,timerAt:null,evidenceRevision:1,conditionsSnapshot:{version:1,minimumSeconds:2700,conditions:[{id:'uses',kind:'evidence',required:true,description:'列出消息队列的三个用途'},{id:'example',kind:'evidence',required:true,description:'给出一个后台任务使用消息队列的具体例子'}]}});
 const checked=await assessRunEvidence(run.id,{action:'evidence',opId:'live-evidence-once',evidenceRevision:1,evidence:'今天学习消息队列，整理三个用途：第一，削峰填谷，缓冲突发工作量；第二，异步处理，让前端不必一直等待耗时任务；第三，解耦生产者和消费者，便于独立扩展。具体例子：用户上传录音后，接口先保存文件和转写任务，worker从队列领取任务调用ASR，完成后保存转写正文，网页读取任务状态展示结果。'});
 result.assessment=checked.assessment;result.checks.push({name:'real-model-two-conditions-with-verbatim-evidence',ok:checked.assessment.status==='satisfied'&&checked.assessment.results.length===2&&checked.assessment.results.every(item=>item.evidence.length>0)});
 const confirmation={action:'confirm',opId:'live-confirm-once',evidenceRevision:2,assessmentId:checked.assessment.id};let timeGate=false;try{confirmRunEvidence(run.id,confirmation);}catch(error){timeGate=error.message.includes('投入时长');}result.checks.push({name:'duration-still-required',ok:timeGate});
 timerAction(run.id,{action:'adjust',opId:'live-adjust-once',minutes:45,reason:'合成验收样例投入'});const done=confirmRunEvidence(run.id,confirmation);result.checks.push({name:'explicit-confirm-only-after-both-gates',ok:done.status==='completed'&&done.seconds===2700});result.ok=result.checks.every(item=>item.ok);
}catch(error){result.error=error.message;}
finally{await mkdir(path.dirname(output),{recursive:true});await writeFile(output,JSON.stringify(result,null,2));db.close();console.error(JSON.stringify({output,ok:result.ok}));}
if(!result.ok)process.exitCode=1;
