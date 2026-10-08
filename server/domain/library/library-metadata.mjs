import path from 'node:path';
import {createHash} from 'node:crypto';
import {z} from 'zod';
import {db,get,save,transaction} from '../../store.mjs';
import {validate} from '../../core/validation.mjs';
const schema=z.strictObject({opId:z.string().min(8).max(100),revision:z.number().int().positive(),title:z.string().trim().min(1).max(200),tags:z.array(z.string().trim().min(1).max(40)).max(20),projectId:z.string().max(100)});
export function editLibraryMetadata(id,input){
 const body=validate(schema,input,{label:'资料信息'});
 if(new Set(body.tags).size!==body.tags.length)throw Object.assign(new Error('标签不能重复，请检查后保存。'),{status:400});
 const operation='library-metadata:'+body.opId,fingerprint=createHash('sha256').update(JSON.stringify({id,...body})).digest('hex');
 return transaction(()=>{
  const previous=db.prepare('SELECT result FROM operations WHERE id=?').get(operation);
  const file=get(id,'libraryFile');if(!file)throw Object.assign(new Error('资料不存在或已删除，编辑内容未提交。'),{status:404});
  if(previous){const cached=JSON.parse(previous.result);if(cached.fingerprint!==fingerprint)throw Object.assign(new Error('此操作编号已用于其他修改。'),{status:409});return {file,savedRevision:cached.revision};}
  if(file.revision!==body.revision)throw Object.assign(new Error('资料已被更新，你的编辑仍保留；请重新读取当前版本后再编辑。'),{status:409,current:{revision:file.revision,title:file.title,projectId:file.projectId||'',tags:file.tags||[]}});
  if(body.projectId&&!get(body.projectId,'project'))throw Object.assign(new Error('所选项目已失效，请重新选择或取消项目关联。'),{status:422});
  const unchanged=file.title===body.title&&JSON.stringify(file.tags||[])===JSON.stringify(body.tags)&&(file.projectId||'')===body.projectId;
  const updated=unchanged?file:save('libraryFile',{...file,originalName:file.originalName||path.posix.basename(file.sourcePath||'')||file.title,title:body.title,tags:body.tags,projectId:body.projectId},file.revision);
  db.prepare('INSERT INTO operations(id,result) VALUES(?,?)').run(operation,JSON.stringify({fingerprint,revision:updated.revision}));
  return {file:updated,savedRevision:updated.revision};
 });
}
