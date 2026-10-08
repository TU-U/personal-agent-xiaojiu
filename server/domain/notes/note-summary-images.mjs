import path from 'node:path';
import {readFile,lstat} from 'node:fs/promises';
const fail=message=>Object.assign(new Error(message),{status:422});
export async function readSummaryImages(note,uploads){
 const images=[];let total=0;
 for(const attachment of note.attachments||[]){
  if(!attachment.mime?.startsWith('image/'))continue;
  const name=attachment.name||attachment.id;
  if(!['image/png','image/jpeg','image/webp','image/gif'].includes(attachment.mime))throw fail(`无法分析图片“${name}”的格式，请转换为PNG/JPEG/WebP/GIF后重试；本次未遗漏图片继续归纳。`);
  if(typeof attachment.key!=='string'||!attachment.key||['.','..'].includes(attachment.key)||path.basename(attachment.key)!==attachment.key||attachment.key.includes('\\'))throw fail(`图片“${name}”存储标识无效。`);
  const location=path.join(uploads,attachment.key);
  const info=await lstat(location).catch(()=>{throw fail(`图片“${name}”原件无法读取，请检查来源。`);});
  if(!info.isFile())throw fail(`图片“${name}”不是普通文件。`);
  total+=info.size;
  if(total>20*1024*1024)throw fail(`读到图片“${name}”时总量超过20 MB，请拆分记录或压缩图片；本次未生成部分归纳。`);
  const data=await readFile(location).catch(()=>{throw fail(`图片“${name}”原件无法读取，请检查来源。`);});
  if(!data.length||data.length!==info.size)throw fail(`图片“${name}”为空或读取期间发生变化，请重试。`);
  images.push({id:attachment.id,name,mime:attachment.mime,data});
 }
 return images;
}
