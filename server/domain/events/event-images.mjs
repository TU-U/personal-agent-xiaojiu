import {randomUUID,createHash} from 'node:crypto';
import {copyFile,readFile,unlink,lstat,open} from 'node:fs/promises';
import path from 'node:path';
import {DATA_DIR,get} from '../../store.mjs';
const fail=(message,status=422)=>Object.assign(new Error(message),{status});
function location(key){if(typeof key!=='string'||!key||key==='.'||key==='..'||path.basename(key)!==key||key.includes('\\'))throw fail('图片存储标识无效。');return path.join(DATA_DIR,'uploads',key);}
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
export function assertEventImageSource(note){if(!note||get(note.id,'note')?.revision!==note.revision)throw fail('复制图片期间来源记录已变化，本次未保存，请重新打开最新来源。',409);}
export async function discardEventImages(images=[]){await Promise.all(images.map(async image=>{try{await unlink(location(image.key));}catch(error){if(error.code!=='ENOENT')console.error('[event-images] 临时图片清理失败：',error.code||error.name);}}));}
export async function copyEventImages(note,{copy=copyFile}={}){
 assertEventImageSource(note);
 const staged=[],images=[];
 try{
  for(const image of note.attachments?.filter(a=>a.mime?.startsWith('image/'))||[]){
   const source=location(image.key),info=await lstat(source);
   if(!info.isFile())throw fail('来源图片不是普通文件：'+image.name);
   const expectedHash=digest(await readFile(source));
   const key=randomUUID(),target=location(key),reserved=await open(target,'wx',0o600);staged.push({key});await reserved.close();
   await copy(source,target);
   const [original,copied]=await Promise.all([readFile(source),readFile(target)]);
   const sha256=digest(copied);
   if(!copied.length||expectedHash!==sha256||digest(original)!==sha256||image.sha256&&image.sha256!==sha256||typeof image.size==='number'&&image.size!==copied.length)throw fail('来源图片大小或校验和发生变化：'+image.name);
   images.push({id:randomUUID(),key,name:image.name,mime:image.mime,size:copied.length,sha256,sourceAttachmentId:image.id,sourceRevision:note.revision});
  }
  assertEventImageSource(note);return images;
 }catch(error){await discardEventImages(staged);if(error.status)throw error;throw fail('来源图片无法复制，请检查原图是否仍可打开；本次未保存。');}
}
