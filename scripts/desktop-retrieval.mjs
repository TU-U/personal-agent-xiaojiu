import {existsSync,mkdirSync,openSync,closeSync} from 'node:fs';
import path from 'node:path';
import {spawn,spawnSync} from 'node:child_process';
const dataDir=path.resolve(process.env.DATA_DIR||'.data');
if(existsSync('.local-model/qdrant/qdrant')){
 const ready=await fetch('http://127.0.0.1:6333/healthz',{signal:AbortSignal.timeout(1500)}).then(r=>r.ok).catch(()=>false);
 if(!ready){const logs=path.join(dataDir,'logs');mkdirSync(logs,{recursive:true});const fd=openSync(path.join(logs,'qdrant.log'),'a',0o600);try{const child=spawn(path.resolve('.local-model/qdrant/qdrant'),[],{env:{...process.env,QDRANT__SERVICE__HOST:'127.0.0.1',QDRANT__STORAGE__STORAGE_PATH:path.join(dataDir,'qdrant'),QDRANT__TELEMETRY_DISABLED:'true'},detached:true,stdio:['ignore',fd,fd]});child.on('error',error=>console.error(error.message));child.unref();}finally{closeSync(fd);}}
}
const result=spawnSync(process.execPath,['scripts/embedding/start-if-active.mjs'],{stdio:'inherit'});if(result.status)process.exitCode=result.status;
