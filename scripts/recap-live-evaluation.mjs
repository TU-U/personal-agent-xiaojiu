import {DatabaseSync} from 'node:sqlite';import {mkdir,writeFile} from 'node:fs/promises';import path from 'node:path';
const root=process.cwd(),stamp=new Date().toISOString().replace(/[:.]/g,'-'),live=new DatabaseSync(path.join(root,'.data/shiguang.sqlite'),{readOnly:true});
const row=live.prepare("SELECT value FROM settings WHERE key='provider'").get();let provider=row?JSON.parse(row.value):null;live.close();if(!provider)provider=(await import('../server/ai/provider.local.mjs')).default;
Object.assign(process.env,{DATA_DIR:path.join(root,'.data/evaluations','recap-live-'+stamp),SEED_DEMO:'false',WORKER_MODE:'true'});
const {db,save,setSetting}=await import('../server/store.mjs');setSetting('provider',provider);
const {dailySupervisionRecap,generateSupervisionRecap}=await import('../server/pet/supervision/supervision-recap.mjs');
const output=path.join(root,'artifacts','recap-live-'+stamp+'.json'),result={syntheticOnly:true,createdAt:new Date().toISOString(),model:provider.model,checks:[],ok:false};
try{
 const task=save('workTask',{title:'学习消息队列'}),day='2026-09-29';
 const run=save('workRun',{taskId:task.id,day,status:'review',seconds:2700,conditionsSnapshot:{minimumSeconds:2700,conditions:[{id:'points',description:'列出消息队列三个用途并给出实践例子'}]},evidence:'用途是削峰、异步处理和解耦。实践例子：上传录音后由worker领取队列任务并转写，界面显示进度。尚未人工确认完成。'});
 const snapshot=dailySupervisionRecap(day),recap=await generateSupervisionRecap({day,signature:snapshot.signature,opId:'recap-live-once'});
 result.advice=recap.items;result.totals=snapshot.totals;result.checks.push({name:'real-model-matches-run',ok:recap.items.length===1&&recap.items[0].runId===run.id&&recap.items[0].advice.length>0},{name:'facts-remain-unconfirmed',ok:dailySupervisionRecap(day).totals.completed===0&&dailySupervisionRecap(day).totals.pending===1});result.ok=result.checks.every(item=>item.ok);
}catch(error){result.error=error.message;}
finally{await mkdir(path.dirname(output),{recursive:true});await writeFile(output,JSON.stringify(result,null,2));db.close();console.error(JSON.stringify({output,ok:result.ok}));}
if(!result.ok)process.exitCode=1;
