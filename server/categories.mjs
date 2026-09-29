import {createHash} from 'node:crypto';
import {z} from 'zod';
import {all,get,save,transaction,db} from './store.mjs';
import {memorySourceIssue} from './memory-source.mjs';
import {memoryScopeIssue} from './memory-scope.mjs';
import {validate} from './validation.mjs';

export const builtinCategories=[['diary','日记'],['finance','理财'],['reading','读书笔记'],['work','个人工作'],['life','生活'],['reflection','感悟'],['idea','灵感'],['study','study plan'],['question','Q（问题）']];
const name=z.string().trim().min(1).max(80);
const identifier=z.string().min(1).max(100);
const revision=z.number().int().positive();
const fail=(message,status=422)=>Object.assign(new Error(message),{status});
const normalized=value=>value.normalize('NFKC').trim().toLocaleLowerCase();
export function ensureCategories(){transaction(()=>{for(const [index,[key,label]] of builtinCategories.entries())if(!get('category-'+key,'noteCategory'))save('noteCategory',{id:'category-'+key,name:label,kind:'builtin',sortOrder:index});});}
export function categories(){return all('noteCategory').sort((a,b)=>a.sortOrder-b.sortOrder||a.id.localeCompare(b.id));}
function uniqueName(value,except){if(categories().some(c=>c.id!==except&&normalized(c.name)===normalized(value)))throw fail('类别名称已存在。',409);}
function project(id){const entity=get(id,'project');if(!entity)throw fail('项目不存在或已删除。',404);return entity;}

// Caller must include this operation and the source save in one SQLite transaction.
export function manualCategoryData(note,categoryId,operationId,reason='记录编辑时人工选择'){
 const id=validate(identifier,categoryId),category=get(id,'noteCategory');if(!category)throw fail('所选类别已失效，请重新选择。',404);
 if(note.categoryId===id&&note.classification?.state==='manual')return {note,correctionId:null};
 const correction=save('classificationCorrection',{sourceId:note.id,sourceTitle:note.title,sourceRevision:note.revision,oldCategoryName:note.categoryId?get(note.categoryId,'noteCategory')?.name||null:null,newCategoryName:category.name,oldCategoryId:note.categoryId||null,newCategoryId:id,classifierRevision:note.classification?.revision||0,model:note.classification?.model||null,promptVersion:note.classification?.promptVersion||null,reason,status:'open',operationId});
 return {note:{...note,categoryId:id,classification:{...note.classification,state:'manual',revision:(note.classification?.revision||0)+1}},correctionId:correction.id};
}
export function setCategories(input){
 const body=validate(z.strictObject({opId:z.string().min(8).max(100),categoryId:identifier,notes:z.array(z.strictObject({id:identifier,revision})).min(1).max(100),reason:z.string().max(500).default('')}),input);
 if(new Set(body.notes.map(n=>n.id)).size!==body.notes.length)throw fail('不能重复选择同一条记录。');
 const operation='classify-manual:'+body.opId,fingerprint=createHash('sha256').update(JSON.stringify(body)).digest('hex');
 return transaction(()=>{
  const old=db.prepare('SELECT result FROM operations WHERE id=?').get(operation);
  if(old){const value=JSON.parse(old.result);if(value.fingerprint!==fingerprint)throw fail('同一操作标识不能用于不同分类修改。',409);return value.result;}
  const category=get(body.categoryId,'noteCategory');if(!category)throw fail('所选类别已失效，请重新选择。',404);
  const notes=body.notes.map(ref=>{const n=get(ref.id,'note');if(!n)throw fail(`记录 ${ref.id} 已删除。`,404);if(n.revision!==ref.revision)throw fail(`记录 ${ref.id} 已更新，请刷新后重新选择。`,409);return n;});
  const corrections=[];
  for(const note of notes){
   const changed=manualCategoryData(note,category.id,operation,body.reason);
   if(changed.correctionId){corrections.push(changed.correctionId);save('note',changed.note,note.revision);}
  }
  const result={ok:true,ids:notes.map(n=>n.id),correctionIds:corrections};
  db.prepare('INSERT INTO operations(id,result) VALUES(?,?)').run(operation,JSON.stringify({fingerprint,result}));return result;
 });
}
// Explicit source membership wins; a project category is also an explicit stable link.
export function sourceProjectId(item,kind){return item.projectId||(kind==='note'&&item.categoryId?get(item.categoryId,'noteCategory')?.projectId:null)||null;}
const pageQuery={kind:z.enum(['note','event','libraryFile','artifact']),offset:z.coerce.number().int().min(0).default(0),limit:z.coerce.number().int().min(1).max(100).default(30)};
export function installCategories(app){
 ensureCategories();
 app.get('/api/categories',(_req,res)=>res.json({items:categories()}));
 app.post('/api/categories',(req,res)=>{
  const body=validate(z.strictObject({name,projectId:identifier}),req.body);
  const result=transaction(()=>{uniqueName(body.name);project(body.projectId);return save('noteCategory',{name:body.name,kind:'development_project',sortOrder:categories().length,projectId:body.projectId});});res.status(201).json(result);
 });
 app.patch('/api/categories/:id',(req,res)=>{
  const body=validate(z.strictObject({name,revision}),req.body);
  const result=transaction(()=>{const category=get(req.params.id,'noteCategory');if(!category)throw fail('类别不存在。',404);if(category.kind==='builtin')throw fail('固定类别名称保持不变。');uniqueName(body.name,category.id);return save('noteCategory',{...category,name:body.name},body.revision);});res.json(result);
 });
 app.post('/api/notes/categories',(req,res)=>res.json(setCategories(req.body)));
 app.get('/api/classification-corrections',(req,res)=>{
  const query=validate(z.strictObject({status:z.enum(['open','resolved']).optional(),offset:z.coerce.number().int().min(0).default(0),limit:z.coerce.number().int().min(1).max(100).default(30)}),req.query);
  const rows=all('classificationCorrection').filter(r=>!query.status||r.status===query.status);res.json({items:rows.slice(query.offset,query.offset+query.limit).map(row=>({...row,sourceTitle:row.sourceTitle||get(row.sourceId,'note')?.title||'来源记录已删除',oldCategoryName:row.oldCategoryName||(row.oldCategoryId?get(row.oldCategoryId,'noteCategory')?.name:null)||null,newCategoryName:row.newCategoryName||get(row.newCategoryId,'noteCategory')?.name||'类别已失效'})),total:rows.length});
 });
 app.patch('/api/classification-corrections/:id',(req,res)=>{
  const body=validate(z.strictObject({revision,status:z.enum(['open','resolved']),resolution:z.string().max(1000).default('')}),req.body);
  const result=transaction(()=>{const old=get(req.params.id,'classificationCorrection');if(!old)throw fail('问题记录不存在。',404);return save('classificationCorrection',{...old,status:body.status,resolution:body.resolution,history:[...(old.history||[]),{status:body.status,resolution:body.resolution,at:new Date().toISOString()}]},body.revision);});res.json(result);
 });
 app.get('/api/projects',(_req,res)=>res.json({items:all('project')}));
 app.post('/api/projects',(req,res)=>{
  const body=validate(z.strictObject({name,opId:z.string().min(8).max(100).optional()}),req.body);
  const result=transaction(()=>{
   const key=body.opId?'project-create:'+body.opId:null;
   const previous=key?db.prepare('SELECT result FROM operations WHERE id=?').get(key):null;
   if(previous){const saved=JSON.parse(previous.result);if(saved.name!==body.name)throw fail('同一创建操作不能用于不同项目名称。',409);return project(saved.id);}
   const created=save('project',{name:body.name});if(key)db.prepare('INSERT INTO operations(id,result) VALUES(?,?)').run(key,JSON.stringify({id:created.id,name:body.name}));return created;
  });res.status(201).json(result);
 });
 app.patch('/api/projects/:id',(req,res)=>{const body=validate(z.strictObject({name,revision}),req.body);res.json(transaction(()=>save('project',{...project(req.params.id),name:body.name},body.revision)));});
 app.post('/api/projects/:id/links',(req,res)=>{
  const body=validate(z.strictObject({kind:z.enum(['note','event','libraryFile','artifact']),id:identifier,revision}),req.body);
  res.json(transaction(()=>{const parent=project(req.params.id),source=get(body.id,body.kind);if(!source)throw fail('来源不存在或类型不匹配。',404);return save(body.kind,{...source,projectId:parent.id},body.revision);}));
 });
 app.get('/api/projects/:id/candidates',(req,res)=>{
  project(req.params.id);const query=validate(z.strictObject({...pageQuery,q:z.string().max(200).default('')}),req.query);
  const rows=all(query.kind).filter(item=>sourceProjectId(item,query.kind)!==req.params.id&&(!query.q||normalized(item.title||'').includes(normalized(query.q))));
  res.json({items:rows.slice(query.offset,query.offset+query.limit).map(item=>({id:item.id,revision:item.revision,title:item.title||'未命名',projectId:sourceProjectId(item,query.kind),projectName:sourceProjectId(item,query.kind)?get(sourceProjectId(item,query.kind),'project')?.name||'已失效项目':null})),total:rows.length});
 });
 app.get('/api/projects/:id/items',(req,res)=>{
  project(req.params.id);const query=validate(z.strictObject({kind:z.enum(['note','event','libraryFile','artifact','memory']),offset:z.coerce.number().int().min(0).default(0),limit:z.coerce.number().int().min(1).max(100).default(30)}),req.query);
  const items=all(query.kind).filter(item=>query.kind==='memory'?item.scopeKind==='project'&&item.scopeId===req.params.id:sourceProjectId(item,query.kind)===req.params.id);res.json({items:items.slice(query.offset,query.offset+query.limit).map(item=>query.kind==='memory'?{...item,sourceIssue:memoryScopeIssue(item)||memorySourceIssue(item)}:item),total:items.length});
 });
}
