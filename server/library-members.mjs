import path from 'node:path';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {all,get,save,transaction,DATA_DIR} from './store.mjs';

// Canonical identity is immutable content, never the first source member's ID.
// Each member retains its own project, source version and parsed-text snapshot.
export const canonicalId=hash=>'sha256:'+hash;
export async function verifiedLibraryCopy(member){
 if(!member?.copyName||!member.hash)return false;
 if(path.basename(member.copyName)!==member.copyName)throw new Error('资料副本路径无效。');
 let bytes;try{bytes=await readFile(path.join(DATA_DIR,'library',member.copyName));}catch(e){if(e.code==='ENOENT')return false;throw e;}
 if(createHash('sha256').update(bytes).digest('hex')!==member.hash)throw new Error('已有副本校验失败，请重新复制来源文件。');
 return true;
}
export function sharedMemberPatch(donor){
 const content=donor.content||'';
 return {parse:donor.parse||{state:content.trim()?'ready':'unknown'},canonicalId:canonicalId(donor.hash),hash:donor.hash,copyName:donor.copyName,content,
  status:content.trim()?'ready':'copied',chunks:donor.chunks||0,error:donor.error||'',duplicateOf:null,sharedCopy:true,
  reason:content.trim()?'复用相同内容副本；本来源可独立检索':'复用相同内容副本；正文尚未解析'};
}
export function archivePreviousMembers(item){
 for(const previous of all('libraryFile').filter(f=>f.id!==item.id&&f.sourcePath===item.sourcePath&&['ready','copied','duplicate'].includes(f.status)))
  save('libraryFile',{...previous,status:'archived',reason:'已有较新来源版本，保留历史副本'},previous.revision);
}
export async function migrateLegacyDuplicates(){
 let repaired=0,unresolved=0;
 for(const member of all('libraryFile').filter(f=>f.status==='duplicate')){
  const seen=new Set([member.id]);let donor=typeof member.duplicateOf==='string'?get(member.duplicateOf,'libraryFile'):null;
  while(donor&&!donor.copyName&&donor.duplicateOf&&!seen.has(donor.id)){seen.add(donor.id);donor=get(donor.duplicateOf,'libraryFile');}
  if(!donor?.copyName||donor.hash!==member.hash)donor=all('libraryFile').find(f=>f.hash===member.hash&&f.copyName);
  try{
   if(!await verifiedLibraryCopy(donor))throw new Error('相同内容的副本不存在，请重新复制此来源。');
   transaction(()=>{
    const current=get(member.id,'libraryFile'),currentDonor=get(donor.id,'libraryFile');
    if(current?.revision!==member.revision||currentDonor?.revision!==donor.revision)return;
    const newer=all('libraryFile').some(f=>f.id!==member.id&&f.sourcePath===member.sourcePath&&f.createdAt>member.createdAt&&['ready','copied'].includes(f.status));
    save('libraryFile',{...current,...sharedMemberPatch(donor),...(newer?{status:'archived',reason:'历史来源版本，保留共享副本'}:{})},current.revision);repaired++;
   });
  }catch(e){
   const current=get(member.id,'libraryFile');if(current?.revision===member.revision&&current.error!==e.message)save('libraryFile',{...current,error:e.message},current.revision);
   unresolved++;
  }
 }
 return {repaired,unresolved};
}
