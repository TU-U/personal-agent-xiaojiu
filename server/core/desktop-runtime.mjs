// Local process control, not a public HTTP API. Credentials never enter the renderer.
import net from 'node:net';
import path from 'node:path';
import {randomUUID,randomBytes} from 'node:crypto';
import {writeFileSync,renameSync,realpathSync,readFileSync,unlinkSync} from 'node:fs';
import {withExecutionContext} from './execution-context.mjs';
export function createDesktopRuntime({db,dataDir,root,port,stop,owner=process.env.XIAOJIU_DESKTOP_OWNER||''}){
 const instance=randomUUID(),secret=randomBytes(32).toString('hex'),clients=new Set(),closing=new Set(),active=new Map();
 let shared=false,stopping=false;
 const file=path.join(dataDir,'desktop-runtime.json');
 db.exec('CREATE TABLE IF NOT EXISTS desktop_job_owners(job_id TEXT PRIMARY KEY, client_id TEXT NOT NULL)');
 const jobs=client=>db.prepare(`SELECT j.id,j.kind,j.entity_id FROM background_jobs j JOIN desktop_job_owners o ON o.job_id=j.id WHERE o.client_id=? AND j.state IN ('pending','running') AND j.due_at<=?`).all(client,Date.now());
 const ownedJobs=client=>{try{return jobs(client);}catch(error){if(error.message.includes('no such table: background_jobs'))return [];throw error;}};
 function status(client){return {service:'xiaojiu',protocol:1,instance,pid:process.pid,root:realpathSync(root),dataDir:realpathSync(dataDir),port,owned:!!owner&&client===owner,shared,activeRequests:[...active.values()].filter(r=>r.client===client).length,jobs:ownedJobs(client),recovery:db.prepare("SELECT value FROM settings WHERE key='desktopRecovery'").get()?.value||null};}
 function middleware(req,res,next){
  res.setHeader('X-Xiaojiu-Instance',instance);
  if(!req.path.startsWith('/api'))return next();
  const client=req.headers['x-xiaojiu-client'];
  // A provenance nonce survives backend restarts. It never grants login or local control;
  // authenticated API middleware and the separate control credential still authorize those.
  if(typeof client==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(client))clients.add(client);
  if(!clients.has(client)){shared=true;return next();}
  if(closing.has(client))return res.status(503).json({error:'桌面正在退出，已保存的内容会保留。'});
  if(['GET','HEAD','OPTIONS'].includes(req.method))return next();
  const controller=new AbortController(),id=randomUUID();active.set(id,{client,controller});
  // finish, not close: closing a window must not cancel a running server task.
  res.once('finish',()=>active.delete(id));
  return withExecutionContext({client,signal:controller.signal},next);
 }
 async function command(message){
  if(message.secret!==secret)throw new Error('本机控制凭证不匹配。');
  const client=message.client;
  if(typeof client!=='string'||!/^[-a-zA-Z0-9]{20,100}$/.test(client))throw new Error('桌面标识无效。');
  if(message.action==='attach'){clients.add(client);return status(client);}
  if(!clients.has(client))throw new Error('桌面尚未连接此服务。');
  if(message.action==='status')return status(client);
  if(message.action!=='quit')throw new Error('未知本机控制命令。');
  closing.add(client);
  const pending=ownedJobs(client),requests=[...active.values()].filter(r=>r.client===client);
  const notice='桌面已确认退出；已保存进度保留，请在原任务查看并重试或继续。';
  if(pending.length||requests.length){
   db.prepare("INSERT INTO settings(key,value) VALUES('desktopRecovery',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(JSON.stringify({at:new Date().toISOString(),message:notice,jobs:pending,requests:requests.length}));
   // Revoke leases first: late external responses cannot commit a completed result.
   const update=db.prepare("UPDATE background_jobs SET state='failed',error=?,lease_token=NULL,lease_until=NULL,updated_at=? WHERE id=? AND state IN ('pending','running')");
   for(const job of pending)update.run(notice,Date.now(),job.id);
   for(const request of requests)request.controller.abort(Object.assign(new Error(notice),{code:'DESKTOP_EXIT',status:409}));
  }
  const before=Date.now();while([...active.values()].some(r=>r.client===client)&&Date.now()-before<5000)await new Promise(r=>setTimeout(r,50));
  const result=status(client);clients.delete(client);
  // Sharing is sticky for this process lifetime. Unknown usage means keep alive.
  let otherRunningJobs=0;try{otherRunningJobs=db.prepare("SELECT count(*) n FROM background_jobs WHERE state='running'").get().n;}catch(error){if(!error.message.includes('no such table: background_jobs'))throw error;}
  const exclusive=result.owned&&!shared&&clients.size===0&&active.size===0&&otherRunningJobs===0;
  if(exclusive&&!stopping){stopping=true;setTimeout(stop,250).unref();}
  return {...result,stopped:exclusive,retained:!exclusive};
 }
 const control=net.createServer(socket=>{
  socket.setTimeout(12000,()=>socket.destroy());let input='';
  socket.on('error',()=>{});socket.on('data',chunk=>{input+=chunk;if(input.length>4096)return socket.destroy();const end=input.indexOf('\n');if(end<0)return;socket.pause();Promise.resolve().then(()=>command(JSON.parse(input.slice(0,end)))).then(result=>socket.end(JSON.stringify({result})+'\n'),error=>socket.end(JSON.stringify({error:error.message})+'\n'));});
 });
 function start(){control.listen(0,'127.0.0.1',()=>{const record={protocol:1,pid:process.pid,instance,controlPort:control.address().port,secret,port,root:realpathSync(root),dataDir:realpathSync(dataDir)};writeFileSync(file+'.tmp',JSON.stringify(record),{mode:0o600});renameSync(file+'.tmp',file);});control.on('error',e=>console.error('[desktop-runtime]',e.message));}
 function cleanup(){try{if(JSON.parse(readFileSync(file,'utf8')).instance===instance)unlinkSync(file);}catch{}control.close();}
 process.once('exit',cleanup);
 return {middleware,start,status,instance,close:()=>{process.removeListener('exit',cleanup);cleanup();}};
}
