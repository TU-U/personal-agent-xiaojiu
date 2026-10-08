import {createHash} from 'node:crypto';
import {z} from 'zod';
import {db,get,save,transaction,getSetting,setSetting} from '../../store.mjs';
import {validate} from '../../core/validation.mjs';

const copyStates=new Set(['pending','failed','skipped','duplicate','copied']);
const skipStates=new Set(['pending','failed','queued','duplicate']);
export function libraryActions(file){return [...(copyStates.has(file.status)?['copy']:[]),...(skipStates.has(file.status)?['skip']:[])];}
const schema=z.strictObject({opId:z.string().min(8).max(100),action:z.enum(['copy','skip','retry']),items:z.array(z.strictObject({id:z.string().min(1).max(100),revision:z.number().int().positive()})).min(1).max(100)});
export function decideLibraryBatch(input){
 const body=validate(schema,input,{label:'资料批量操作'});
 if(new Set(body.items.map(item=>item.id)).size!==body.items.length)throw Object.assign(new Error('同一份资料不能重复选择。'),{status:400});
 const action=body.action==='retry'?'copy':body.action;
 const fingerprint=createHash('sha256').update(JSON.stringify({action,items:[...body.items].sort((a,b)=>a.id.localeCompare(b.id))})).digest('hex');
 const key='library-decision:'+body.opId;
 return transaction(()=>{
  const previous=db.prepare('SELECT result FROM operations WHERE id=?').get(key);
  if(previous){const cached=JSON.parse(previous.result);if(cached.fingerprint!==fingerprint)throw Object.assign(new Error('操作标识已用于另一批资料，请重新提交。'),{status:409});return cached.result;}
  const invalid=[],files=[];
  for(const ref of body.items){
   const file=get(ref.id,'libraryFile');
   const reason=!file?'资料不存在或已删除':file.revision!==ref.revision?'资料已更新，请重新选择当前版本':!libraryActions(file).includes(action)?'当前状态不支持此操作':'';
   if(reason)invalid.push({id:ref.id,reason,...(file?{revision:file.revision,status:file.status}:{})});else files.push(file);
  }
  if(invalid.length)throw Object.assign(new Error(`本批未执行，${invalid.length} 份资料已变化或不可操作。请检查已选清单。`),{status:409,current:{invalid}});
  const items=files.map(file=>{const updated=save('libraryFile',{...file,status:action==='skip'?'skipped':'queued',reason:action==='skip'?'用户选择跳过':'用户选择保留',error:''},file.revision);return {id:updated.id,revision:updated.revision,status:updated.status};});
  if(action==='copy'){
   const job=getSetting('libraryJob',{});
   if(!['scanning','paused','copying'].includes(job.status))setSetting('libraryJob',{...job,status:'copying'});
  }
  const result={ok:true,action,items};
  db.prepare('INSERT INTO operations(id,result) VALUES(?,?)').run(key,JSON.stringify({fingerprint,result}));
  return result;
 });
}
