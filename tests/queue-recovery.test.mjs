import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {mkdtemp,rm} from 'node:fs/promises';
import {spawn,fork} from 'node:child_process';
import {once} from 'node:events';
import {createServer} from 'node:net';
import os from 'node:os';
import path from 'node:path';
import {createJobRepository} from '../server/background-jobs.mjs';

async function until(fn){for(let i=0;i<200;i++){if(await fn())return;await new Promise(r=>setTimeout(r,50));}throw new Error('恢复超时');}
async function stop(child,signal='SIGTERM'){if(child&&child.exitCode===null&&child.signalCode===null){const exit=once(child,'exit');child.kill(signal);await exit;}}
test('killed worker and restarted Redis recover durable work without duplicate writes',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'shiguang-recovery-'));
 const listener=createServer();listener.listen(0,'127.0.0.1');await once(listener,'listening');const port=listener.address().port;await new Promise(r=>listener.close(r));
 const runtime=path.resolve('.local-runtime/redis'),location=path.join(dir,'jobs.sqlite');
 const db=new DatabaseSync(location);db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; CREATE TABLE results(id TEXT PRIMARY KEY,value TEXT)');const repo=createJobRepository(db);
 let redis,worker,logs='';
 async function startRedis(){logs='';redis=spawn(process.env.REDIS_SERVER_BIN||path.join(runtime,'usr/bin/redis-server'),['--bind','127.0.0.1','--port',String(port),'--dir',dir,'--appendonly','yes','--save',''],{env:{...process.env,LD_LIBRARY_PATH:path.join(runtime,'usr/lib/x86_64-linux-gnu')},stdio:['ignore','pipe','pipe']});redis.stdout.on('data',b=>logs+=b);redis.stderr.on('data',b=>logs+=b);await until(()=>{if(redis.exitCode!==null)throw new Error(logs);return logs.includes('Ready to accept connections');});}
 function startWorker(hold=false){worker=fork(new URL('./helpers/recovery-worker.mjs',import.meta.url),[],{env:{...process.env,JOB_DB:location,TEST_REDIS_PORT:String(port),HOLD:hold?'1':'0'},stdio:['ignore','ignore','pipe','ipc']});let error='';worker.stderr.on('data',b=>error+=b);worker.on('error',e=>{error+=e.message;});return ()=>{if(worker.exitCode!==null)throw new Error(error);};}
 const enqueue=key=>repo.enqueue({key,kind:'parse',entityId:key,revision:1,payload:{text:key}});
 try{
  await startRedis();const first=enqueue('worker-crash');const check=startWorker(true);await until(()=>{check();return repo.get(first.id).state==='running';});
  await stop(worker,'SIGKILL');startWorker();await until(()=>repo.get(first.id).state==='completed');assert.equal(repo.get(first.id).attempts,2);
  await stop(worker);await stop(redis);
  const offline=enqueue('redis-offline');assert.equal(repo.get(offline.id).state,'pending');
  await startRedis();startWorker();await until(()=>repo.get(offline.id).state==='completed');
  assert.equal(repo.get(first.id).attempts,2);assert.equal(repo.get(offline.id).attempts,1);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM results').get().n,2);
 }finally{await stop(worker,'SIGKILL');await stop(redis);db.close();await rm(dir,{recursive:true,force:true});}
});
