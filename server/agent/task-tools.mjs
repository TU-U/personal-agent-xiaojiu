import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {DATA_DIR,get} from '../store.mjs';
export function readLibrary(id,start=0,revision){const f=get(id,'libraryFile');if(!f?.copyName)throw new Error('资料尚无本地副本');if(revision!==undefined&&f.revision!==revision)throw new Error('关联资料已更新，请暂停任务并重新关联当前版本');if(f.status!=='ready')throw new Error('资料当前不是可读取的有效正文');const offset=Number(start);if(!Number.isInteger(offset)||offset<0||offset>(f.content?.length||0))throw new Error('正文读取位置无效');return {id,kind:'libraryFile',revision:f.revision,title:f.title,sourcePath:f.sourcePath,start:offset,end:Math.min(offset+12000,f.content?.length||0),total:f.content?.length||0,text:(f.content||'').slice(offset,offset+12000),notice:f.content?'':'尚未解析'};}
export {readPublicPage} from '../ai/web/public-page.mjs';
export async function persistArtifact(artifact){const dir=path.join(DATA_DIR,'task-artifacts');await mkdir(dir,{recursive:true});await writeFile(path.join(dir,artifact.id+'.r'+artifact.revision+'.md'),artifact.body,'utf8');}
