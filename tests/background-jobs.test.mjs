import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtemp, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { once } from 'node:events';
import path from 'node:path';
import os from 'node:os';
import { createJobRepository, createBackgroundQueue } from '../server/background-jobs.mjs';

const input = key => ({key,kind:'parse',entityId:'source',revision:1,payload:{text:'资料'}});
const waitFor = async fn => { for(let i=0;i<120;i++){if(await fn())return;await new Promise(r=>setTimeout(r,50));}throw new Error('状态等待超时'); };

test('job outbox composes with source transactions and rejects changed idempotency inputs',()=>{
 const db=new DatabaseSync(':memory:');const repo=createJobRepository(db);
 try{
  db.exec('BEGIN');repo.enqueue(input('rollback'));db.exec('ROLLBACK');assert.equal(repo.pending().length,0);
  const row=repo.enqueue(input('stable'));assert.equal(repo.enqueue(input('stable')).id,row.id);
  assert.throws(()=>repo.enqueue({...input('stable'),revision:2}),/不同输入/);
  assert.equal(repo.pending().length,1);
 }finally{db.close();}
});

test('cancelled jobs and expired workers cannot commit results; replacement worker commits once',()=>{
 let time=1000;const db=new DatabaseSync(':memory:');const repo=createJobRepository(db,()=>time);
 db.exec('CREATE TABLE results(id TEXT PRIMARY KEY)');
 const commit=()=>db.prepare('INSERT INTO results VALUES(?)').run('once');
 try{
  const row=repo.enqueue(input('lease'));repo.claim(row.id,'old',100);time=1200;
  assert.equal(repo.finish(row.id,'old',{},commit),false);
  assert.equal(repo.heartbeat(row.id,'old',100),false);
  repo.fail(row.id,'old','迟到的失败');assert.equal(repo.get(row.id).state,'running');
  repo.claim(row.id,'new',100);assert.equal(repo.finish(row.id,'old',{},commit),false);
  assert.equal(repo.finish(row.id,'new',{},commit),true);assert.equal(repo.finish(row.id,'new',{},commit),false);
  const cancelled=repo.enqueue(input('cancel'));repo.claim(cancelled.id,'cancel',100);repo.cancel(cancelled.id);
  assert.equal(repo.finish(cancelled.id,'cancel',{},commit),false);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM results').get().n,1);
 }finally{db.close();}
});

test('business write and job completion roll back together on commit error',()=>{
 const db=new DatabaseSync(':memory:');const repo=createJobRepository(db);db.exec('CREATE TABLE results(id TEXT)');
 try{
  const row=repo.enqueue(input('atomic'));repo.claim(row.id,'worker',60000);
  assert.throws(()=>repo.finish(row.id,'worker',{},()=>{db.exec("INSERT INTO results VALUES('partial')");throw new Error('failed business validation');}));
  assert.equal(db.prepare('SELECT COUNT(*) n FROM results').get().n,0);assert.equal(repo.get(row.id).state,'running');
 }finally{db.close();}
});

test('real Redis/BullMQ executes persisted jobs and suppresses repeated delivery',async()=>{
 const runtime=path.resolve('.local-runtime/redis');
 const bin=process.env.REDIS_SERVER_BIN||path.join(runtime,'usr/bin/redis-server');
 assert.ok(existsSync(bin),'真实队列验收需要 Redis，可用 REDIS_SERVER_BIN 指定');
 const dir=await mkdtemp(path.join(os.tmpdir(),'shiguang-queue-'));
 const listener=createServer();listener.listen(0,'127.0.0.1');await once(listener,'listening');const port=listener.address().port;await new Promise(resolve=>listener.close(resolve));
 const redis=spawn(bin,['--bind','127.0.0.1','--port',String(port),'--dir',dir,'--appendonly','yes','--save',''],{env:{...process.env,LD_LIBRARY_PATH:path.join(runtime,'usr/lib/x86_64-linux-gnu')},stdio:['ignore','pipe','pipe']});
 let logs='';redis.stdout.on('data',b=>logs+=b);redis.stderr.on('data',b=>logs+=b);
 const db=new DatabaseSync(path.join(dir,'jobs.sqlite'));const repo=createJobRepository(db);let service;
 try{
  await waitFor(()=>{if(redis.exitCode!==null)throw new Error(logs);return logs.includes('Ready to accept connections');});
  db.exec('CREATE TABLE results(id TEXT PRIMARY KEY, value TEXT)');let calls=0;
  service=createBackgroundQueue({repository:repo,connection:{host:'127.0.0.1',port,maxRetriesPerRequest:null},handlers:{parse:{run:async row=>{calls++;return row.payload.text+'已解析';},commit:(row,result)=>db.prepare('INSERT INTO results VALUES(?,?)').run(row.id,result)}}});
  const row=repo.enqueue(input('real'));await service.dispatch();await waitFor(()=>repo.get(row.id).state==='completed');
  assert.equal(repo.get(row.id).result,'资料已解析');
  const job=await service.queue.getJob(row.id);await waitFor(async()=>await job.getState()==='completed');await job.remove();
  await service.queue.add('parse',{id:row.id},{jobId:row.id});await waitFor(async()=>await (await service.queue.getJob(row.id)).getState()==='completed');
  assert.equal(calls,1);assert.equal(db.prepare('SELECT COUNT(*) n FROM results').get().n,1);
  await service.close();service=null;
  redis.kill('SIGTERM');await once(redis,'exit');
  // A new request remains durable even with Redis stopped.
  const offline=repo.enqueue(input('offline'));assert.equal(repo.get(offline.id).state,'pending');
  const second=new DatabaseSync(path.join(dir,'jobs.sqlite'));assert.equal(createJobRepository(second).get(offline.id).state,'pending');second.close();
 }finally{
  await service?.close();if(redis.exitCode===null){redis.kill('SIGTERM');await once(redis,'exit');}
  db.close();await rm(dir,{recursive:true,force:true});
 }
});
