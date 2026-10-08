import {spawn} from 'node:child_process';
import {mkdtemp,rm,mkdir,open} from 'node:fs/promises';
import os from 'node:os';import path from 'node:path';
import {providerConfig} from '../server/ai/engine.mjs';
const provider=providerConfig();if(!provider.baseUrl||!provider.model)throw new Error('没有可用模型配置，未执行真实模型验证。');
const temporary=await mkdtemp(path.join(os.tmpdir(),'shiguang-context-quality-'));await mkdir('.data/logs',{recursive:true});const log=await open('.data/logs/context-quality-check.log','a');
const code=`
import {writeFile,mkdir} from 'node:fs/promises';
import {setSetting,db} from './server/store.mjs';
let input='';for await(const chunk of process.stdin)input+=chunk;setSetting('provider',JSON.parse(input));
const {complete}=await import('./server/ai/engine.mjs');const {compressContextBatch}=await import('./server/agent/context-compression.mjs');
const user='我计划周五晚上八点再确认这件事，目前还没开始。预算上限100元，不接受付费订阅。只讨论方案，不要替我执行。';
const answer='助手建议先整理资料，再列出可选方案；这些只是建议，用户还没有接受。'.repeat(500)+'最后补充：不得把计划写成已经完成，周五晚上八点由用户确认。';
const result=await compressContextBatch('synthetic-check',{text:''},[{id:'public-synthetic-turn',query:user,body:answer,references:[]}],complete,()=>{}, {maxCalls:5,budgetMs:95000});
if(!result.text)throw new Error('本次预算内未合并完成');
await mkdir('artifacts',{recursive:true});await writeFile('artifacts/context-summary-check.json',JSON.stringify({checkedAt:new Date().toISOString(),input:{user,assistantDescription:'反复提醒仅为建议，未获用户接受；末段要求保留周五确认和未完成状态。',assistantCharacters:answer.length},summary:result.text,checks:{budget:result.text.includes('100'),friday:result.text.includes('周五'),time:/八点|8点|20:00/.test(result.text),notStarted:/未开始|没开始|尚未开始/.test(result.text),noSubscription:/付费订阅|订阅/.test(result.text),noExecution:/不.*执行|禁止.*执行|不得.*执行/.test(result.text)},notice:'只是一条合成中文样本，不代表所有真实话题质量。'},null,2));db.close();
`;
try{const child=spawn(process.execPath,['--input-type=module','-e',code],{env:{...process.env,DATA_DIR:temporary,SEED_DEMO:'false',WORKER_MODE:'true'},stdio:['pipe',log.fd,log.fd]});child.stdin.end(JSON.stringify(provider));const exitCode=await new Promise(resolve=>child.on('exit',resolve));if(exitCode!==0)throw new Error('真实摘要检查未完成，请查看本地日志');console.log('已写入 artifacts/context-summary-check.json');}finally{await log.close();await rm(temporary,{recursive:true,force:true});}
