import path from 'node:path';
import {z} from 'zod';
import {db,get} from './store.mjs';
import {sourceProjectId} from './categories.mjs';
import {validate} from './validation.mjs';

const day=z.string().refine(value=>!value||/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value,'日期无效').default('');
const directory=z.string().max(1000).transform(value=>value.trim().replaceAll('\\','/').replace(/\/+$/,'')).refine(value=>!value||!value.startsWith('/')&&!value.includes(':')&&!value.split('/').some(part=>!part||part==='.'||part==='..'),'请填写相对目录').default('');
export const libraryFilterFields={
 status:z.enum(['','ready','pending','copied','queued','copying','failed','skipped','duplicate','archived']).default(''),
 projectId:z.string().max(100).default(''),project:z.string().max(200).default(''),directory,
 extension:z.string().max(30).trim().toLowerCase().refine(value=>!value||/^\.[a-z0-9]+$/.test(value)).default(''),
 dateFrom:day,dateTo:day,
};
export function parseLibraryQuery(input,extra={}){
 const result=validate(z.strictObject({...libraryFilterFields,...extra}),input,{label:'资料筛选'});
 if(result.dateFrom&&result.dateTo&&result.dateFrom>result.dateTo)throw Object.assign(new Error('开始日期不能晚于结束日期。'),{status:400});
 if(result.projectId&&!get(result.projectId,'project'))throw Object.assign(new Error('筛选项目不存在或已删除，请重新选择。'),{status:400});
 return result;
}
export function libraryMatches(file,filters={}){
 if(filters.status&&file.status!==filters.status)return false;
 if(filters.projectId&&(!get(filters.projectId,'project')||sourceProjectId(file,'libraryFile')!==filters.projectId))return false;
 if(filters.project&&file.project!==filters.project)return false;
 const source=String(file.sourcePath||'').replaceAll('\\','/');
 if(filters.directory&&!source.startsWith(filters.directory+'/'))return false;
 if(filters.extension&&path.posix.extname(source||file.title||'').toLowerCase()!==filters.extension)return false;
 if(filters.dateFrom||filters.dateTo){
  const stamp=Date.parse(file.createdAt);if(!Number.isFinite(stamp))return false;
  const date=new Date(stamp+8*3600000).toISOString().slice(0,10);
  if(filters.dateFrom&&date<filters.dateFrom||filters.dateTo&&date>filters.dateTo)return false;
 }
 return true;
}
// Metadata only: filtering must precede paging and vector candidate selection.
export const libraryMetadata=()=>db.prepare("SELECT id,revision,json_remove(data,'$.content') data FROM entities WHERE kind='libraryFile' AND deleted=0 ORDER BY updated_at DESC,id").all().map(row=>({...JSON.parse(row.data),id:row.id,revision:row.revision}));
export const libraryCandidateIds=filters=>libraryMetadata().filter(file=>file.status==='ready'&&libraryMatches(file,filters)).map(file=>file.id);
