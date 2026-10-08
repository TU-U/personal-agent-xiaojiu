import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {mkdtemp,mkdir,writeFile,readFile,rm,access} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createBackup,verifyBackup,restoreBackup} from '../server/core/backups/backups.mjs';

async function fixture(){
 const root=await mkdtemp(path.join(os.tmpdir(),'shiguang-backup-')),dataDir=path.join(root,'data');await mkdir(path.join(dataDir,'uploads'),{recursive:true});await mkdir(path.join(dataDir,'library'));
 const db=new DatabaseSync(path.join(dataDir,'shiguang.sqlite'));
 db.exec(`PRAGMA journal_mode=WAL; CREATE TABLE entities(id TEXT PRIMARY KEY,kind TEXT,data TEXT,revision INTEGER,deleted INTEGER);CREATE TABLE settings(key TEXT PRIMARY KEY,value TEXT);CREATE TABLE changes(seq INTEGER);CREATE TABLE operations(id TEXT);CREATE TABLE sessions(token TEXT);`);
 db.prepare('INSERT INTO settings VALUES(?,?)').run('provider',JSON.stringify({model:'fixture',apiKey:'backup-private-credential'}));db.exec("INSERT INTO settings VALUES('braveSearchKey','\"private-search-key\"');INSERT INTO sessions VALUES('private-session');");
 for(const [id,kind,props] of [['note','note',{attachments:[{key:'image'}]}],['event','event',{images:[{key:'image'}]}],['memory','memory',{sourceId:'note',status:'active'}],['task','workTask',{status:'paused'}],['file','libraryFile',{copyName:'doc.txt'}]]){
  db.prepare('INSERT INTO entities VALUES(?,?,?,?,0)').run(id,kind,JSON.stringify({id,revision:1,...props}),1);
 }
 await writeFile(path.join(dataDir,'uploads/image'),'IMAGE BYTES');await writeFile(path.join(dataDir,'library/doc.txt'),'正文');
 return {root,dataDir,db,cleanup:async()=>{db.close();await rm(root,{recursive:true,force:true});}};
}

test('complete backup restores DB and attachments into a new directory and excludes credentials by default',async()=>{
 const f=await fixture();try{
  const directory=path.join(f.root,'backup');await createBackup({dataDir:f.dataDir,destination:directory});
  assert.equal((await verifyBackup(directory)).entities,5);
  const dest=path.join(f.root,'restored');await restoreBackup({directory,destination:dest});
  assert.equal(await readFile(path.join(dest,'uploads/image'),'utf8'),'IMAGE BYTES');
  const restored=new DatabaseSync(path.join(dest,'shiguang.sqlite'),{readOnly:true});try{
   assert.equal(JSON.parse(restored.prepare("SELECT value FROM settings WHERE key='provider'").get().value).apiKey,'');
   assert.equal(restored.prepare('SELECT COUNT(*) n FROM sessions').get().n,0);
   assert.equal(restored.prepare("SELECT value FROM settings WHERE key='braveSearchKey'").get(),undefined);
  }finally{restored.close();}
  const original=JSON.parse(f.db.prepare("SELECT value FROM settings WHERE key='provider'").get().value);assert.equal(original.apiKey,'backup-private-credential');
  assert.equal((await readFile(path.join(directory,'shiguang.sqlite'))).includes(Buffer.from('backup-private-credential')),false);
 }finally{await f.cleanup();}
});

test('damaged or traversal backup fails without replacing existing data',async()=>{
 const f=await fixture();try{
  const directory=path.join(f.root,'backup');await createBackup({dataDir:f.dataDir,destination:directory});
  await writeFile(path.join(directory,'uploads/image'),'corrupt');
  await assert.rejects(restoreBackup({directory,destination:path.join(f.root,'new')}),/哈希/);
  await assert.rejects(access(path.join(f.root,'new')));
  await assert.rejects(restoreBackup({directory,destination:f.dataDir}),/EEXIST/);
  assert.equal(await readFile(path.join(f.dataDir,'uploads/image'),'utf8'),'IMAGE BYTES');
  const manifest=JSON.parse(await readFile(path.join(directory,'manifest.json'),'utf8'));manifest.files[0].path='../outside';await writeFile(path.join(directory,'manifest.json'),JSON.stringify(manifest));
  await assert.rejects(verifyBackup(directory),/非法备份相对路径/);
 }finally{await f.cleanup();}
});

test('backup refuses incomplete references and preserves explicit private migration snapshots',async()=>{
 const f=await fixture();try{
  const directory=path.join(f.root,'private');await createBackup({dataDir:f.dataDir,destination:directory,includeSecrets:true});
  const copy=new DatabaseSync(path.join(directory,'shiguang.sqlite'),{readOnly:true});assert.match(copy.prepare("SELECT value FROM settings WHERE key='provider'").get().value,/backup-private-credential/);copy.close();
  await rm(path.join(f.dataDir,'uploads/image'));
  await assert.rejects(createBackup({dataDir:f.dataDir,destination:path.join(f.root,'missing')}),/缺少引用/);
  await assert.rejects(access(path.join(f.root,'missing')));
 }finally{await f.cleanup();}
});
