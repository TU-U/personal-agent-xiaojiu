import Redis from 'ioredis';
import { spawn } from 'node:child_process';
import { mkdirSync, openSync, closeSync } from 'node:fs';
import path from 'node:path';
const host=process.env.REDIS_HOST||'127.0.0.1',port=Number(process.env.REDIS_PORT||6381);
async function ping(){const client=new Redis({host,port,lazyConnect:true,connectTimeout:500,maxRetriesPerRequest:0,retryStrategy:()=>null});client.on('error',()=>{});try{await client.connect();return await client.ping()==='PONG';}catch{return false;}finally{client.disconnect();}}
if(await ping())console.log('后台Redis队列已就绪');
else if(host!=='127.0.0.1'&&host!=='localhost'){console.error('配置的Redis不可用；未自动启动远程服务。');process.exitCode=1;}
else{
 const logs=path.resolve(process.env.DATA_DIR||'.data','logs');mkdirSync(logs,{recursive:true});const fd=openSync(path.join(logs,'redis.log'),'a',0o600);
 const child=spawn('bash',['scripts/start-queue.sh'],{cwd:path.resolve('.'),env:process.env,stdio:['ignore',fd,fd],detached:true});closeSync(fd);child.unref();
 let ready=false;for(let i=0;i<30;i++){await new Promise(resolve=>setTimeout(resolve,100));if(await ping()){ready=true;break;}}
 if(ready)console.log('后台Redis队列已启动，日志：'+path.join(logs,'redis.log'));
 else{console.error('Redis启动未成功，请查看redis.log；保存的后台任务会保留。');process.exitCode=1;}
}
