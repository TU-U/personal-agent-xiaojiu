import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import net from 'node:net';
import {EventEmitter} from 'node:events';
import {createDesktopRuntime} from '../server/core/desktop-runtime.mjs';
import {createJobRepository} from '../server/core/background-jobs.mjs';
import {executionContext,executionSignal} from '../server/core/execution-context.mjs';
const a='desktop-client-11111111111',b='desktop-client-22222222222';
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function fixture(t,owner=''){
 const dir=mkdtempSync(path.join(tmpdir(),'xiaojiu-runtime-')),db=new DatabaseSync(':memory:');
 db.exec('CREATE TABLE settings(key TEXT PRIMARY KEY,value TEXT)');const jobs=createJobRepository(db);let stops=0;
 const service=createDesktopRuntime({db,dataDir:dir,root:dir,port:4329,owner,stop:()=>stops++});service.start();
 let record;for(let n=0;n<50;n++){try{record=JSON.parse(readFileSync(path.join(dir,'desktop-runtime.json'),'utf8'));break;}catch{await wait(10);}}
 assert.ok(record);
 const call=(action,client=a)=>new Promise((resolve,reject)=>{const socket=net.connect(record.controlPort,'127.0.0.1');let body='';socket.on('error',reject);socket.on('connect',()=>socket.write(JSON.stringify({secret:record.secret,action,client})+'\n'));socket.on('data',c=>body+=c);socket.on('end',()=>{const result=JSON.parse(body);result.error?reject(new Error(result.error)):resolve(result.result);});});
 t.after(()=>{service.close();db.close();rmSync(dir,{recursive:true,force:true});});
 await call('attach');return {call,service,jobs,stops:()=>stops};
}
test('desktop quit preserves pre-existing and browser-shared services',async t=>{
 const old=await fixture(t);assert.equal((await old.call('quit')).retained,true);
 const shared=await fixture(t,a);shared.service.middleware({path:'/api/bootstrap',method:'GET',headers:{}},{setHeader(){}},()=>{});
 assert.equal((await shared.call('quit')).retained,true);assert.equal(shared.stops(),0);
});
test('only this desktop owner with no shared clients can stop its service',async t=>{
 const f=await fixture(t,a);await f.call('attach',b);assert.equal((await f.call('quit')).retained,true);
 const system=await fixture(t,a);const job=system.jobs.enqueue({key:'system',kind:'reminder',entityId:'system',revision:1});system.jobs.claim(job.id,'system-lease',30000);assert.equal((await system.call('quit')).retained,true);
 const solo=await fixture(t,a);assert.equal((await solo.call('quit')).stopped,true);await wait(300);assert.equal(solo.stops(),1);
});
test('quit aborts its request and fences only its due jobs; late output cannot commit',async t=>{
 const f=await fixture(t);const response=new EventEmitter();response.setHeader=()=>{};
 let signal,mine,future;
 f.service.middleware({path:'/api/ask',method:'POST',headers:{'x-xiaojiu-client':a}},response,()=>{
  signal=executionSignal();assert.equal(executionContext().client,a);
  mine=f.jobs.enqueue({key:'mine',kind:'parse',entityId:'mine',revision:1});
  future=f.jobs.enqueue({key:'future',kind:'reminder',entityId:'future',revision:1,dueAt:Date.now()+86400000});
  signal.addEventListener('abort',()=>response.emit('finish'),{once:true});
 });
 const other=f.jobs.enqueue({key:'other',kind:'parse',entityId:'other',revision:1});f.jobs.claim(mine.id,'lease',30000);
 const result=await f.call('quit');assert.equal(result.retained,true);assert.equal(signal.aborted,true);
 assert.equal(f.jobs.get(mine.id).state,'failed');assert.equal(f.jobs.finish(mine.id,'lease',{},()=>assert.fail('late commit')),false);
 assert.equal(f.jobs.get(other.id).state,'pending');assert.equal(f.jobs.get(future.id).state,'pending');assert.ok(result.recovery);
 assert.equal(f.jobs.owner(mine.id),a);assert.equal(f.jobs.retry(mine.id),true);assert.equal(f.jobs.owner(mine.id),undefined,'Web retry is a new execution, not owned by the departed desktop');
});
