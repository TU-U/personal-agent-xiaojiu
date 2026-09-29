import {test} from 'node:test';import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import {createServer} from 'node:http';
test('answer prompt includes every supplied uncompressed turn and full assistant tail',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'shiguang-context-prompt-'));process.env.DATA_DIR=dir;process.env.SEED_DEMO='false';process.env.WORKER_MODE='true';let prompt='';
 const model=createServer(async(req,res)=>{let raw='';for await(const chunk of req)raw+=chunk;prompt=JSON.parse(raw).messages.map(m=>m.content).join('\n');res.setHeader('Content-Type','application/json');res.end(JSON.stringify({choices:[{message:{content:'根据上下文继续讨论，仍需核实。'},finish_reason:'stop'}]}));});await new Promise(r=>model.listen(0,'127.0.0.1',r));
 const {db,setSetting}=await import('../server/store.mjs');setSetting('provider',{baseUrl:`http://127.0.0.1:${model.address().port}`,model:'context-fixture',apiKey:'fixture'});const {answer}=await import('../server/engine.mjs');
 try{const history=Array.from({length:9},(_,i)=>({query:'独立约束'+i,body:'原回答'.repeat(200)+'末尾重要条件'+i}));await answer('接着分析','',history,[],[],'更早用户确认的摘要');assert.match(prompt,/独立约束0/);assert.match(prompt,/独立约束8/);assert.match(prompt,/末尾重要条件0/);assert.match(prompt,/末尾重要条件8/);assert.match(prompt,/更早用户确认的摘要/);}finally{await new Promise(r=>model.close(r));db.close();await rm(dir,{recursive:true,force:true});}
});
