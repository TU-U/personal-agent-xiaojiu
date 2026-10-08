import {storageStatus} from '../storage-status.mjs';
import path from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import { mkdir, readFile, rm } from 'node:fs/promises';
import JSZip from 'jszip';
import { z } from 'zod';
import { createBackup, verifyBackup, restoreBackup } from './backups.mjs';
import { validate } from '../validation.mjs';

export function installBackups(app, dataDir) {
 const root=path.join(dataDir,'backups');
 app.get('/api/settings/storage',async(_req,res)=>res.json(await storageStatus(dataDir)));
 const action=handler=>async(req,res)=>{try{await handler(req,res);}catch(error){if(!error.status){error.status=error.code==='ENOENT'?404:422;error.message=error.code==='ENOENT'?'备份不存在或文件不完整，请重新创建。':error.code?'无法读写备份目录，请检查磁盘空间和权限。':error.message;}throw error;}};
 const locate=id=>path.join(root,validate(z.string().uuid(),id,{label:'备份标识'}));
 let creating=false;
 app.post('/api/backups',action(async(req,res)=>{
  validate(z.strictObject({}),req.body,{label:'备份请求'});
  if(creating)throw Object.assign(new Error('已有备份正在创建，请稍后重试。'),{status:409});
  creating=true;const id=randomUUID();
  try{
   const {manifest}=await createBackup({dataDir,destination:locate(id)});
   res.status(201).json({id,createdAt:manifest.createdAt,files:manifest.files.length,bytes:manifest.files.reduce((sum,file)=>sum+file.size,0),includesCredentials:false,downloadUrl:`/api/backups/${id}/download`});
  }finally{creating=false;}
 }));
 app.get('/api/backups/:id/download',action(async(req,res)=>{
  const directory=locate(req.params.id),{manifest}=await verifyBackup(directory);
  if(manifest.includeSecrets)throw Object.assign(new Error('含凭据的内部备份不能通过网页下载。'),{status:403});
  if(manifest.files.reduce((sum,file)=>sum+file.size,0)>512*1024*1024)throw Object.assign(new Error('备份超过网页下载上限512MB，请从本地备份目录获取。'),{status:413});
  const zip=new JSZip();zip.file('manifest.json',JSON.stringify(manifest,null,2));
  for(const file of manifest.files){const bytes=await readFile(path.join(directory,file.path));if(bytes.length!==file.size||createHash('sha256').update(bytes).digest('hex')!==file.sha256)throw new Error('备份文件已变化，请重新创建。');zip.file(file.path,bytes);}
  res.setHeader('Content-Type','application/zip');res.setHeader('Content-Disposition',`attachment; filename="shiguang-backup-${req.params.id}.zip"`);
  zip.generateNodeStream({type:'nodebuffer',streamFiles:true,compression:'STORE'}).on('error',error=>res.destroy(error)).pipe(res);
 }));
 app.post('/api/backups/:id/verify-restore',action(async(req,res)=>{
  validate(z.strictObject({}),req.body,{label:'恢复验证请求'});
  const directory=locate(req.params.id),trialRoot=path.join(dataDir,'restore-checks');await mkdir(trialRoot,{recursive:true});
  const destination=path.join(trialRoot,randomUUID());
  try{const result=await restoreBackup({directory,destination});res.json({ok:true,entities:result.entities,message:'已在隔离目录恢复并核验数据库、附件与哈希，当前数据未被替换。'});}
  finally{await rm(destination,{recursive:true,force:true});}
 }));
}
