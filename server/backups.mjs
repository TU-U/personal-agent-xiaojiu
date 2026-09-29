import { DatabaseSync, backup } from 'node:sqlite';
import { mkdir, readdir, lstat, readFile, writeFile, copyFile, rm, chmod } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { z } from 'zod';

const roots = ['uploads', 'library', 'task-artifacts'];
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const safePath = z.string().refine(value => value === 'shiguang.sqlite' ||
  roots.some(root => value.startsWith(root + '/')) && !value.includes('\\') &&
  value.split('/').every(part => part && part !== '.' && part !== '..' && !part.includes(':')),
  '非法备份相对路径');
const manifestSchema = z.strictObject({
  version: z.literal(1), createdAt: z.string(), includeSecrets: z.boolean(),
  files: z.array(z.strictObject({ path: safePath, size: z.number().int().nonnegative(), sha256: z.string().regex(/^[a-f0-9]{64}$/) })).min(1),
});
async function listFiles(root, relative = '') {
  const result = [];
  for (const entry of await readdir(path.join(root,relative),{withFileTypes:true})) {
    const name = relative ? relative+'/'+entry.name : entry.name;
    if (entry.isSymbolicLink()) throw new Error('备份不接受符号链接');
    if (entry.isDirectory()) result.push(...await listFiles(root,name));
    else if (entry.isFile()) result.push(name);
    else throw new Error('备份只接受普通文件');
  }
  return result.sort();
}
async function dataFiles(root) {
  const result = [];
  for (const name of roots) {
    try {
      const info = await lstat(path.join(root,name));
      if (!info.isDirectory() || info.isSymbolicLink()) throw new Error('数据子目录必须为普通目录');
      result.push(...(await listFiles(path.join(root,name))).map(file=>name+'/'+file));
    } catch (error) { if(error.code !== 'ENOENT') throw error; }
  }
  return result.sort();
}
async function fileInfo(root,name) {
  const location=path.join(root,name),info=await lstat(location);
  if(!info.isFile()||info.isSymbolicLink())throw new Error('备份文件类型无效');
  const bytes=await readFile(location);
  return {path:name,size:bytes.length,sha256:digest(bytes)};
}
function tableExists(db,table){return !!db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(table);}
function redactSnapshot(db) {
  db.exec('PRAGMA secure_delete=ON');
  for (const table of ['sessions','device_sessions']) if(tableExists(db,table)) db.exec(`DELETE FROM ${table}`);
  const sensitive = /api.?key|key$|token|secret|password|authorization/i;
  const redact = value => Array.isArray(value) ? value.map(redact) : value && typeof value === 'object'
    ? Object.fromEntries(Object.entries(value).map(([key,item])=>[key,sensitive.test(key)?'':redact(item)])) : value;
  for (const row of db.prepare('SELECT key,value FROM settings').all()) {
    if(row.key==='access'||sensitive.test(row.key))db.prepare('DELETE FROM settings WHERE key=?').run(row.key);
    else db.prepare('UPDATE settings SET value=? WHERE key=?').run(JSON.stringify(redact(JSON.parse(row.value))),row.key);
  }
  // Fresh login is required after restoring a portable backup.
  db.prepare("INSERT INTO settings(key,value) VALUES('demoAccess','true') ON CONFLICT(key) DO UPDATE SET value='true'").run();
  db.exec('VACUUM');
}
function validateDatabase(location, files) {
  const db=new DatabaseSync(location,{readOnly:true});
  try {
    if(db.prepare('PRAGMA integrity_check').get().integrity_check!=='ok')throw new Error('备份数据库完整性校验失败');
    for(const table of ['entities','settings','changes','operations'])if(!tableExists(db,table))throw new Error('备份缺少必需的数据表');
    const seen=new Set();
    for(const row of db.prepare('SELECT id,kind,data,revision,deleted FROM entities').all()) {
      if(typeof row.id!=='string'||!row.id||seen.has(row.id)||typeof row.kind!=='string'||!row.kind||!Number.isInteger(row.revision)||row.revision<1)throw new Error('备份实体标识或版本无效');
      seen.add(row.id);const entity=JSON.parse(row.data);
      if(!entity||typeof entity!=='object'||Array.isArray(entity))throw new Error('备份实体正文无效');
      if(row.deleted)continue;
      if(entity.id!==row.id||entity.revision!==row.revision)throw new Error('备份实体版本与索引不一致');
      for(const attachment of [...(entity.attachments||[]),...(entity.images||[])]){
        if(typeof attachment.key!=='string'||path.basename(attachment.key)!==attachment.key||!files.has('uploads/'+attachment.key))throw new Error('备份缺少引用的图片或附件');
      }
      if(row.kind==='libraryFile'&&entity.copyName&&(!files.has('library/'+entity.copyName)||path.basename(entity.copyName)!==entity.copyName))throw new Error('备份缺少资料副本');
    }
    return {entities:seen.size};
  } finally {db.close();}
}

export async function createBackup({ dataDir, destination, includeSecrets = false }) {
  dataDir=path.resolve(dataDir);destination=path.resolve(destination);
  if(destination===dataDir||dataDir.startsWith(destination+path.sep)||roots.some(root=>destination===path.join(dataDir,root)||destination.startsWith(path.join(dataDir,root)+path.sep)))throw new Error('备份目标不能覆盖数据目录');
  await mkdir(path.dirname(destination),{recursive:true});
  // Never reuse or overwrite an existing destination.
  await mkdir(destination,{mode:0o700});
  let db;
  try {
    db=new DatabaseSync(path.join(dataDir,'shiguang.sqlite'),{readOnly:true});
    const version=db.prepare('PRAGMA data_version').get().data_version;
    const before=await dataFiles(dataDir),files=[];
    await backup(db,path.join(destination,'shiguang.sqlite'));
    for(const name of before) {
      const info=await fileInfo(dataDir,name);await mkdir(path.dirname(path.join(destination,name)),{recursive:true});
      await copyFile(path.join(dataDir,name),path.join(destination,name));await chmod(path.join(destination,name),0o600);
      if(JSON.stringify(info)!==JSON.stringify(await fileInfo(destination,name)))throw new Error('复制期间文件发生变化，请重试备份');
      files.push(info);
    }
    if(version!==db.prepare('PRAGMA data_version').get().data_version||JSON.stringify(before)!==JSON.stringify(await dataFiles(dataDir)))throw new Error('备份期间数据发生变化，请重试');
    for(const info of files)if(JSON.stringify(info)!==JSON.stringify(await fileInfo(dataDir,info.path)))throw new Error('备份期间文件发生变化，请重试');
    // Re-check DB after final file read, including updates that raced with that read.
    if(version!==db.prepare('PRAGMA data_version').get().data_version)throw new Error('备份期间数据发生变化，请重试');
    db.close();db=null;
    const copy=new DatabaseSync(path.join(destination,'shiguang.sqlite'));
    try { copy.exec('PRAGMA journal_mode=DELETE'); if(!includeSecrets)redactSnapshot(copy); } finally { copy.close(); }
    await chmod(path.join(destination,'shiguang.sqlite'),0o600);
    files.unshift(await fileInfo(destination,'shiguang.sqlite'));
    const manifest={version:1,createdAt:new Date().toISOString(),includeSecrets,files};
    await writeFile(path.join(destination,'manifest.json'),JSON.stringify(manifest,null,2),{mode:0o600});
    await verifyBackup(destination);
    return {directory:destination,manifest};
  }catch(error){db?.close();await rm(destination,{recursive:true,force:true});throw error;}
}

export async function verifyBackup(directory) {
  directory=path.resolve(directory);
  const manifestStat=await lstat(path.join(directory,'manifest.json'));
  if(!manifestStat.isFile()||manifestStat.isSymbolicLink())throw new Error('备份清单必须是普通文件');
  const manifest=manifestSchema.parse(JSON.parse(await readFile(path.join(directory,'manifest.json'),'utf8')));
  const names=new Set(manifest.files.map(file=>file.path));
  if(names.size!==manifest.files.length||!names.has('shiguang.sqlite'))throw new Error('备份文件清单重复或缺少数据库');
  // Reject unlisted files and symlinks before opening SQLite or restoring anything.
  const actual=(await listFiles(directory)).filter(file=>file!=='manifest.json');
  if(actual.length!==names.size||actual.some(file=>!names.has(file)))throw new Error('备份文件与清单不一致');
  for(const entry of manifest.files){const actual=await fileInfo(directory,entry.path);if(entry.size!==actual.size||entry.sha256!==actual.sha256)throw new Error('备份文件哈希或大小不匹配');}
  const database=validateDatabase(path.join(directory,'shiguang.sqlite'),names);
  return {manifest,...database};
}

export async function restoreBackup({ directory, destination }) {
  directory=path.resolve(directory);destination=path.resolve(destination);
  if(destination===directory||directory.startsWith(destination+path.sep)||destination.startsWith(directory+path.sep))throw new Error('恢复目标不能覆盖备份');
  // Reserve a NEW directory; failures never touch an existing directory.
  await mkdir(destination,{mode:0o700});
  try {
    const verified=await verifyBackup(directory);
    for(const entry of verified.manifest.files){await mkdir(path.dirname(path.join(destination,entry.path)),{recursive:true});await copyFile(path.join(directory,entry.path),path.join(destination,entry.path));await chmod(path.join(destination,entry.path),0o600);}
    await writeFile(path.join(destination,'manifest.json'),JSON.stringify(verified.manifest),{mode:0o600});
    await verifyBackup(destination); // Catch source modification during the copy.
    return {directory:destination,entities:verified.entities};
  } catch(error){await rm(destination,{recursive:true,force:true});throw error;}
}
