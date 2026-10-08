import {z} from 'zod';
import {all,get} from '../../store.mjs';
import {noteReadableText} from '../../domain/shared/source-content.mjs';
const fail=(message,status=409)=>Object.assign(new Error(message),{status});
export const evidenceReference=z.strictObject({kind:z.enum(['note','libraryFile','artifact']),id:z.string().min(1).max(100),revision:z.number().int().positive()});
export function readEvidenceSources(run,refs){
 const seen=new Set();return refs.map(ref=>{
  if(ref.id==='text')throw fail('证据编号与文字说明编号冲突。',422);
  if(seen.has(ref.id))throw fail('证据引用重复，请移除重复项。',422);seen.add(ref.id);
  const source=get(ref.id,ref.kind);
  if(!source||source.revision!==ref.revision)throw fail('证据不存在或版本已变化：'+ref.id);
  if(ref.kind==='libraryFile'&&source.status!=='ready')throw fail('文件尚无可用正文：'+ref.id);
  if(ref.kind==='artifact'){
   if(source.taskId!==run.taskId)throw fail('成果不属于本任务：'+ref.id);
   if(Date.parse(source.createdAt)<Date.parse(run.createdAt))throw fail('旧成果不能冒充本次的新交付：'+ref.id);
   if(all('workRun').some(other=>other.id!==run.id&&(other.artifactId===ref.id||(other.evidenceRefs||[]).some(item=>item.id===ref.id))))throw fail('该成果已用于另一次执行：'+ref.id);
  }
  const hasNoteText=ref.kind==='note'&&(source.content?.trim()||source.transcript?.segments?.some(segment=>segment.text?.trim()));
  const content=ref.kind==='artifact'?source.body:ref.kind==='note'?(hasNoteText?noteReadableText(source):''):source.content;
  if(typeof content!=='string'||!content.trim())throw fail('证据没有可检查的正文：'+ref.id,422);
  return {...ref,title:source.title||'引用资料',createdAt:source.createdAt,updatedAt:source.updatedAt,mode:source.mode||null,content};
 });
}

// Read-only consumers keep invalid selections visible without treating them as evidence.
export function inspectRunEvidence(run){
 const parsed=z.array(evidenceReference).max(10).safeParse(run.evidenceRefs||[]);
 if(!parsed.success)return [{invalid:'本次证据引用格式无效，需要重新核对。'}];
 const seen=new Set();
 return parsed.data.map(ref=>{
  try{if(seen.has(ref.id))throw fail('证据引用重复，请重新核对。',422);seen.add(ref.id);return readEvidenceSources(run,[ref])[0];}
  catch(error){if(![409,422].includes(error.status))throw error;const current=get(ref.id,ref.kind);return {...ref,title:current?.title||'已失效资料',currentRevision:current?.revision??null,missing:!current,invalid:error.message};}
 });
}
