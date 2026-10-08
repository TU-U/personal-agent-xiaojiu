import path from 'node:path';
import {lstat,statfs} from 'node:fs/promises';
const locations=[
 ['shiguang.sqlite','数据库','记录、要事、对话、长期记忆原文、账目、任务状态和调研检查点。'],
 ['uploads','上传原件','图片、录音、要事图片副本和账单原文件。'],
 ['library','资料副本','已接入项目的电脑文件副本；不会管理或改写E盘原件。'],
 ['task-artifacts','成果文件','任务生成的文件；结构化报告也保存在数据库中。'],
 ['backups','备份目录','已创建的备份，和在线数据分开；同一磁盘备份不防磁盘损坏。'],
 ['logs','日志目录','调用及错误日志，可能包含用户输入和模型输出。']
];
export async function storageStatus(dataDir){
 const root=path.resolve(dataDir);
 const items=await Promise.all(locations.map(async([name,label,description])=>{
  const location=path.join(root,name);let state;
  try{const info=await lstat(location);state=info.isSymbolicLink()?'linked':info.isFile()||info.isDirectory()?'present':'unavailable';}
  catch(error){state=error.code==='ENOENT'?'missing':'unavailable';}
  return {name,label,description,path:location,state};
 }));
 let disk;
 try{const fs=await statfs(root,{bigint:true});disk={available:true,totalBytes:(fs.blocks*fs.bsize).toString(),freeBytes:(fs.bavail*fs.bsize).toString()};}
 catch{disk={available:false,notice:'暂时无法读取数据目录所在磁盘的空间，请检查目录和权限。'};}
 return {checkedAt:new Date().toISOString(),dataDir:root,items,disk,indexNotice:'Qdrant保存可重建的检索索引，服务数据目录由检索服务配置管理；原文和业务状态以数据库及资料副本为准。',diskNotice:'空间为数据目录所在文件系统的容量与当前进程可用空间，不是拾光独占用量；未扫描文件内容或链接目标。'};
}
