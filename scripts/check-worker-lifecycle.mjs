import {spawn,fork} from 'node:child_process';
import {mkdtempSync,writeFileSync} from 'node:fs';
import {createServer} from 'node:net';
import {once} from 'node:events';
import {fileURLToPath} from 'node:url';
// Isolated Redis and DATA_DIR: never stops the application's Redis.
const cwd=fileURLToPath(new URL('..',import.meta.url));
const data=mkdtempSync('/tmp/shiguang-worker-lifecycle-');
const probe=createServer();probe.listen(0,'127.0.0.1');await once(probe,'listening');const port=probe.address().port;await new Promise(r=>probe.close(r));
const env={...process.env,DATA_DIR:data,QUEUE_DATA_DIR:data+'/redis',REDIS_PORT:String(port),SEED_DEMO:'false',WORKER_MODE:'true'};
let redis,worker,latest,logs='',events=[];
async function startRedis(){redis=spawn('bash',['scripts/start-queue.sh'],{cwd,env,stdio:['ignore','pipe','pipe']});await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Redis startup timeout')),10000);redis.stdout.on('data',d=>{if(String(d).includes('Ready to accept connections')){clearTimeout(timer);resolve();}});redis.on('exit',code=>{clearTimeout(timer);reject(new Error('Redis exited '+code));});});}
async function stop(child){if(!child||child.exitCode!==null)return;const done=once(child,'exit');child.kill('SIGTERM');await done;}
async function waitState(predicate,label){const start=Date.now();while(Date.now()-start<20000){if(worker.exitCode!==null)throw new Error('worker exited: '+logs);if(latest&&predicate(latest)){events.push({label,...latest});return;}await new Promise(r=>setTimeout(r,100));}throw new Error(label+' timeout: '+JSON.stringify(latest)+' '+logs);}
try{await startRedis();worker=fork(cwd+'/server/jobs/workers/file-worker.mjs',[],{cwd,env,stdio:['ignore','ignore','pipe','ipc']});worker.stderr.on('data',d=>logs+=String(d));worker.on('message',m=>{if(m.type==='worker-status')latest=m;});await waitState(m=>m.queueReady&&!m.error,'ready');await stop(redis);await waitState(m=>!m.queueReady,'disconnected');await startRedis();await waitState(m=>m.queueReady&&!m.error,'recovered');writeFileSync(data+'/result.json',JSON.stringify({passed:true,events},null,2));console.log(JSON.stringify({passed:true,events,artifact:data+'/result.json'}));}finally{await stop(worker);await stop(redis);}
