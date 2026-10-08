import path from 'node:path';
import {existsSync} from 'node:fs';
import {readdir,realpath,stat} from 'node:fs/promises';

export const supportedFileExtensions=new Set(['.txt','.md','.markdown','.csv','.json','.pdf','.docx','.png','.jpg','.jpeg','.webp','.gif','.mp3','.wav','.m4a','.webm','.ogg']);
const configuredRoot=process.env.COMPUTER_FILES_ROOT?.trim()|| (existsSync('/mnt/e')?'/mnt/e':'');
export const computerFilesRoot=configuredRoot?path.resolve(configuredRoot):'';

function invalidPath(){return Object.assign(new Error('文件路径无效，或不在已映射的目录内。'),{status:400});}
export async function resolveComputerPath(relative=''){
 if(!computerFilesRoot)throw Object.assign(new Error('尚未映射电脑文件目录。请设置 COMPUTER_FILES_ROOT。'),{status:503});
 if(typeof relative!=='string'||relative.length>2000||relative.includes('\0')||relative.includes('\\')||path.isAbsolute(relative)||relative.split('/').includes('..'))throw invalidPath();
 const root=await realpath(computerFilesRoot).catch(()=>{throw Object.assign(new Error('电脑文件目录无法读取，请检查磁盘是否已连接。'),{status:503});});
 const target=await realpath(path.resolve(root,relative)).catch(()=>{throw Object.assign(new Error('文件或文件夹不存在，请刷新列表。'),{status:404});});
 if(target!==root&&!target.startsWith(root+path.sep))throw invalidPath();
 return {root,target};
}

export async function browseComputerFiles(relative=''){
 const {target}=await resolveComputerPath(relative);
 const details=await stat(target);
 if(!details.isDirectory())throw Object.assign(new Error('请选择文件夹。'),{status:400});
 const entries=await readdir(target,{withFileTypes:true});
 const items=entries.filter(entry=>!entry.isSymbolicLink()&&(entry.isDirectory()||entry.isFile()&&supportedFileExtensions.has(path.extname(entry.name).toLowerCase())))
  .sort((a,b)=>Number(b.isDirectory())-Number(a.isDirectory())||a.name.localeCompare(b.name,'zh-CN'))
  .slice(0,500).map(entry=>({name:entry.name,path:path.posix.join(relative,entry.name),kind:entry.isDirectory()?'directory':'file'}));
 return {path:relative,items,truncated:entries.length>500};
}

export async function searchComputerFiles(relative='',query=''){
 if(typeof query!=='string'||!query.trim()||query.length>100)throw Object.assign(new Error('请输入 1–100 字的文件名关键词。'),{status:400});
 const {target}=await resolveComputerPath(relative);
 if(!(await stat(target)).isDirectory())throw Object.assign(new Error('请选择文件夹。'),{status:400});
 const matches=[],queue=[{folder:target,relative,depth:0}];let inspected=0;
 while(queue.length&&inspected<5000&&matches.length<100){
  const current=queue.shift();let entries;
  try{entries=await readdir(current.folder,{withFileTypes:true});}catch{continue;}
  for(const entry of entries){
   if(++inspected>5000||matches.length>=100)break;
   if(entry.isSymbolicLink())continue;
   const entryPath=path.posix.join(current.relative,entry.name);
   if(entry.isDirectory()&&current.depth<8)queue.push({folder:path.join(current.folder,entry.name),relative:entryPath,depth:current.depth+1});
   else if(entry.isFile()&&supportedFileExtensions.has(path.extname(entry.name).toLowerCase())&&entry.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))matches.push({name:entry.name,path:entryPath,kind:'file'});
  }
 }
 return {path:relative,items:matches,truncated:!!queue.length||inspected>=5000||matches.length>=100};
}
