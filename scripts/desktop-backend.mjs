// Invoked by Electron via WSL or native Node. No renderer-supplied command/path.
import net from 'node:net';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readFileSync,realpathSync,mkdirSync,openSync,closeSync,rmSync,writeFileSync} from 'node:fs';
import {spawn,spawnSync} from 'node:child_process';
const root=realpathSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'));
process.chdir(root);
const dataDir=path.resolve(process.env.DATA_DIR||'.data'),file=path.join(dataDir,'desktop-runtime.json');
const action=process.argv[2],client=process.argv[3];
const wait=ms=>new Promise(r=>setTimeout(r,ms));
export function rpc(record,action,client){return new Promise((resolve,reject)=>{const socket=net.connect(record.controlPort,'127.0.0.1');let text='';socket.setTimeout(15000,()=>socket.destroy(new Error('本机后台响应超时。')));socket.on('connect',()=>socket.write(JSON.stringify({action,client,secret:record.secret})+'\n'));socket.on('error',reject);socket.on('data',chunk=>{text+=chunk;if(text.length>1000000)socket.destroy(new Error('后台响应过大。'));});socket.on('end',()=>{try{const value=JSON.parse(text);value.error?reject(new Error(value.error)):resolve(value.result);}catch(e){reject(e);}});});}
async function inspect(){
 const record=JSON.parse(readFileSync(file,'utf8'));
 if(record.protocol!==1||record.root!==root||record.dataDir!==realpathSync(dataDir)||record.port!==Number(process.env.PORT||4317))throw new Error('后台身份、数据目录或版本不匹配。');
 const state=await rpc(record,'attach',client);
 if(state.instance!==record.instance)throw new Error('后台实例已变化。');
 const response=await fetch('http://127.0.0.1:'+state.port+'/api/v1/health',{signal:AbortSignal.timeout(2000)});
 const contractVersion=JSON.parse(readFileSync(path.join(root,'contracts/package.json'),'utf8')).version;
 if(response.headers.get('x-contract-version')!==contractVersion)throw new Error('后台业务协议版本不兼容，请更新/重启原服务。');
 if(!response.ok||response.headers.get('x-xiaojiu-instance')!==state.instance)throw new Error('端口服务与本机后台身份不一致，请查看日志。');
 return {record,state};
}
async function ensure(){
 try{return (await inspect()).state;}catch{}
 const port=Number(process.env.PORT||4317);
 const occupied=await new Promise(resolve=>{const s=net.connect(port,'127.0.0.1');s.setTimeout(1000,()=>{s.destroy();resolve(false);});s.on('connect',()=>{s.destroy();resolve(true);});s.on('error',()=>resolve(false));});
 if(occupied)throw new Error('4317 端口已有服务，但身份无法确认。请先升级/重启现有拾光后台；不会另建数据库或终止未知进程。');
 mkdirSync(dataDir,{recursive:true});const lock=path.join(dataDir,'desktop-start.lock');
 let locked=false;
 try{
  try{mkdirSync(lock);locked=true;writeFileSync(path.join(lock,'pid'),String(process.pid));}catch{for(let n=0;n<40;n++){await wait(250);try{return (await inspect()).state;}catch{}}let old;try{old=Number(readFileSync(path.join(lock,'pid'),'utf8'));}catch{}if(Number.isSafeInteger(old)&&old>0){let alive=true;try{process.kill(old,0);}catch(e){if(e.code==='ESRCH')alive=false;}if(!alive){rmSync(lock,{recursive:true,force:true});return ensure();}}throw new Error('另一进程正在启动后台；若启动中断，请查看 server.log。');}
  // Only initialize the configured retrieval service; do not choose another chat model.
  const logs=path.join(dataDir,'logs');mkdirSync(logs,{recursive:true});const fd=openSync(path.join(logs,'server.log'),'a',0o600);
  try{
   spawnSync(process.execPath,['scripts/ensure-queue.mjs'],{cwd:root,stdio:['ignore',fd,fd],timeout:20000});
   spawnSync(process.execPath,['scripts/desktop-retrieval.mjs'],{cwd:root,stdio:['ignore',fd,fd],timeout:20000});
   const child=spawn(process.execPath,['server/index.mjs'],{cwd:root,env:{...process.env,DATA_DIR:dataDir,HOST:'127.0.0.1',XIAOJIU_DESKTOP_OWNER:client},detached:true,stdio:['ignore',fd,fd]});child.unref();
  }finally{closeSync(fd);}
  for(let n=0;n<100;n++){await wait(250);try{return (await inspect()).state;}catch{}}
  throw new Error('后台未能启动，请查看 .data/logs/server.log。');
 }finally{if(locked)rmSync(lock,{recursive:true,force:true});}
}
try{const value=action==='ensure'?await ensure():await (async()=>{const {record}=await inspect();return rpc(record,action,client);})();process.stdout.write(JSON.stringify(value)+'\n');}catch(error){process.stderr.write(error.message+'\n');process.exitCode=1;}
