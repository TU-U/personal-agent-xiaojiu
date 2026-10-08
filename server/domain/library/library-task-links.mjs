import {createHash} from 'node:crypto';
import {z} from 'zod';
import {all,db,get,save,transaction} from '../../store.mjs';
import {validate} from '../../core/validation.mjs';
import {pageItems} from '../../agent/source-threads.mjs';
const editable=new Set(['draft','paused','failed','waiting','review']);
const fail=(message,status=409)=>Object.assign(new Error(message),{status});
export function taskLibraryReferences(task){
 return (task.libraryReferences||[]).map(ref=>{const source=get(ref.id,'libraryFile');const issue=!source?'资料已删除':source.status!=='ready'?'资料当前不可检索':source.revision!==ref.revision?'资料已更新，请重新关联当前版本':'';return {...ref,available:!issue,issue,currentRevision:source?.revision||null};});
}
export function linkLibraryTask(sourceId,input){
 const body=validate(z.strictObject({opId:z.string().min(8).max(100),taskId:z.string().min(1).max(100),taskRevision:z.number().int().positive(),sourceRevision:z.number().int().positive()}),input);
 const key='library-task-link:'+body.opId,fingerprint=createHash('sha256').update(JSON.stringify({sourceId,...body})).digest('hex');
 return transaction(()=>{
  const task=get(body.taskId,'workTask');if(!task)throw fail('任务不存在或已删除。',404);
  const old=db.prepare('SELECT result FROM operations WHERE id=?').get(key);
  if(old){if(JSON.parse(old.result).fingerprint!==fingerprint)throw fail('操作标识已用于其他关联。');return task;}
  if(task.executionMode==='research')throw fail('调研资料已随简报固定，请在调研入口核对，不能从旧任务接口修改。');
  if(task.revision!==body.taskRevision)throw fail('任务已变化，请刷新任务列表后重新选择。');
  if(!editable.has(task.status))throw fail('请先暂停任务再修改资料关联；已取消的任务不能新增关联。');
  const source=get(sourceId,'libraryFile');if(!source)throw fail('资料不存在或已删除。',404);
  if(source.status!=='ready'||!source.content?.trim())throw fail('资料尚无可读取正文，请先完成解析。',422);
  if(source.revision!==body.sourceRevision)throw fail('资料已更新，请重新打开后关联当前版本。');
  const refs=task.libraryReferences||[],existing=refs.find(ref=>ref.id===source.id);
  if(!existing&&refs.length>=20)throw fail('每个任务最多关联20份资料，请先移除不需要的关联。',422);
  let result=task;
  if(existing?.revision!==source.revision){
   const ref={id:source.id,kind:'libraryFile',title:source.title,revision:source.revision,sourcePath:source.sourcePath};
   result=save('workTask',{...task,libraryReferences:[...refs.filter(item=>item.id!==source.id),ref],logs:[...(task.logs||[]),{at:new Date().toISOString(),type:'library_link',content:JSON.stringify({previous:existing||null,current:ref})}]},task.revision);
  }
  db.prepare('INSERT INTO operations(id,result) VALUES(?,?)').run(key,JSON.stringify({fingerprint}));return result;
 });
}
export function unlinkLibraryTask(taskId,sourceId,input){
 const body=validate(z.strictObject({revision:z.number().int().positive()}),input);
 return transaction(()=>{
  const task=get(taskId,'workTask');if(!task)throw fail('任务不存在。',404);
  const previous=(task.libraryReferences||[]).find(ref=>ref.id===sourceId);if(!previous)return task;
  if(task.executionMode==='research')throw fail('调研资料已随简报固定，请在调研入口核对，不能从旧任务接口修改。');
  if(task.revision!==body.revision)throw fail('任务已变化，请刷新后重试。');
  if(!editable.has(task.status))throw fail('当前任务状态不能修改关联，请先暂停任务。');
  return save('workTask',{...task,libraryReferences:task.libraryReferences.filter(ref=>ref.id!==sourceId),logs:[...(task.logs||[]),{at:new Date().toISOString(),type:'library_unlink',content:JSON.stringify(previous)}]},task.revision);
 });
}
export function installLibraryTaskLinks(app){
 app.get('/api/library/:id/tasks',(req,res)=>{
  if(!get(req.params.id,'libraryFile'))throw fail('资料不存在。',404);
  const {q,limit,cursor}=validate(z.strictObject({q:z.string().max(200).default(''),limit:z.coerce.number().int().min(1).max(100).default(30),cursor:z.string().max(1000).optional()}),req.query);
  const rows=all('workTask').filter(t=>t.executionMode!=='research'&&editable.has(t.status)&&(!q||t.title?.includes(q))).map(t=>({id:t.id,revision:t.revision,title:t.title,status:t.status}));
  res.json(pageItems(rows,{limit,...(cursor?{cursor}:{})},'library-task-candidates:'+createHash('sha256').update(req.params.id+':'+q).digest('hex')));
 });
 app.post('/api/library/:id/tasks',(req,res)=>res.json(linkLibraryTask(req.params.id,req.body)));
 app.get('/api/work-tasks/:id/library', (req,res)=>{const task=get(req.params.id,'workTask');if(!task)throw fail('任务不存在。',404);res.json({items:taskLibraryReferences(task),revision:task.revision,editable:task.executionMode!=='research'&&editable.has(task.status)});});
 app.delete('/api/work-tasks/:id/library/:sourceId',(req,res)=>res.json(unlinkLibraryTask(req.params.id,req.params.sourceId,req.body)));
}
