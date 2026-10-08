import {test} from 'node:test';import assert from 'node:assert/strict';
import {mkdtemp,rm,mkdir,writeFile} from 'node:fs/promises';import path from 'node:path';import os from 'node:os';import express from 'express';
test('task output download uses current saved revision instead of legacy file and rejects stale revision',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'shiguang-output-'));process.env.DATA_DIR=dir;process.env.SEED_DEMO='false';process.env.WORKER_MODE='true';
 const {save,db,remove}=await import('../server/store.mjs');const {installWorkTasks}=await import('../server/pet/supervision/work-tasks.mjs');
 const task=save('workTask',{title:'报告任务',status:'draft',outputs:[],logs:[]});const original=save('artifact',{title:'最初报告',body:'旧正文',mode:'model',taskId:task.id,sources:[]});
 await mkdir(path.join(dir,'task-artifacts'));await writeFile(path.join(dir,'task-artifacts',original.id+'.md'),'旧正文');
 const current=save('artifact',{...original,title:'人工修订报告',body:'# 当前保存版本\n\n待办仍未完成。',mode:'human',originMode:'model'},original.revision);
 const app=express();app.use(express.json());installWorkTasks(app);app.use((error,req,res,next)=>res.status(error.status||500).json({error:error.message}));const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const url=`http://127.0.0.1:${server.address().port}/api/work-tasks/${task.id}/artifacts/${current.id}`;
 try{const result=await fetch(url);assert.equal(result.status,200);assert.equal(result.headers.get('x-artifact-revision'),String(current.revision));assert.equal(await result.text(),current.body);assert.equal((await fetch(url+'?revision=1')).status,409);assert.equal((await fetch(url+'?revision=abc')).status,400);assert.equal((await fetch(url+'?revision='+current.revision)).status,200);remove(current.id,'artifact',current.revision);assert.notEqual((await fetch(url)).status,200);}finally{await new Promise(r=>server.close(r));db.close();await rm(dir,{recursive:true,force:true});}
});
