import {existsSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
const filename=path.resolve(process.env.DATA_DIR||'.data','shiguang.sqlite');
if(existsSync(filename)){
 const db=new DatabaseSync(filename,{readOnly:true});let active;
 try{const row=db.prepare("SELECT value FROM settings WHERE key='retrieval'").get();active=row?JSON.parse(row.value):null;}finally{db.close();}
 if(active?.indexProfile==='qwen3-local-v1'&&active.embedding==='http://127.0.0.1:4320/v1'){
  const child=spawnSync('python3',['scripts/embedding/start.py'],{stdio:'inherit'});
  if(child.error)throw child.error;if(child.status!==0)process.exitCode=child.status||1;
 }
}
