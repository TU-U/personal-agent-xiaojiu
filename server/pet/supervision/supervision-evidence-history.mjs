import {z} from 'zod';
import {db,get,save} from '../../store.mjs';
import {validate} from '../../core/validation.mjs';
const kind='supervisionEvidenceCheck';
const fail=()=>Object.assign(new Error('执行记录或检查历史已不存在。'),{status:404});
function requireRun(id){const run=get(id,'workRun');if(!run||!get(run.taskId,'workTask'))throw fail();return run;}
// Called inside the acceptance transaction, before replacing the current result.
export function preserveLegacyAssessment(run){
 if(!run.assessment)return;
 const assessmentId=run.assessment.id||`legacy-${run.id}-${run.evidenceRevision||1}`;
 if(db.prepare("SELECT 1 FROM entities WHERE kind=? AND deleted=0 AND json_extract(data,'$.assessment.id')=? AND json_extract(data,'$.runId')=?").get(kind,assessmentId,run.id))return;
 save(kind,{runId:run.id,taskId:run.taskId,state:'legacy',finishedAt:run.assessment.checkedAt||null,inputEvidenceRevision:run.evidenceRevision||1,evidence:run.evidence||'',refs:run.evidenceRefs||[],requirements:run.conditionsSnapshot||null,sources:[],assessment:{...run.assessment,id:assessmentId},notice:'升级前保留的检查结果；当时的引用正文和更早检查过程未保存，不能还原。'});
}
export function saveEvidenceCheck(check){return save(kind,check);}
export function evidenceHistory(id,input={}){
 const query=validate(z.strictObject({before:z.coerce.number().int().positive().max(Number.MAX_SAFE_INTEGER).optional()}),input);
 requireRun(id);
 const rows=db.prepare("SELECT rowid AS seq,id,data FROM entities WHERE kind=? AND deleted=0 AND json_extract(data,'$.runId')=? AND rowid<? ORDER BY rowid DESC LIMIT 21").all(kind,id,query.before||Number.MAX_SAFE_INTEGER);
 const items=rows.slice(0,20).map(row=>{const check=JSON.parse(row.data);return {id:row.id,state:check.state,finishedAt:check.finishedAt,inputEvidenceRevision:check.inputEvidenceRevision,status:check.assessment?.status,error:check.error||'',notice:check.notice||''};});
 return {items,nextBefore:rows.length>20?rows[19].seq:null};
}
export function evidenceHistoryDetail(id,checkId){
 requireRun(id);const check=get(checkId,kind);if(!check||check.runId!==id)throw fail();
 return {...check,sources:check.sources.map(source=>{
  if(source.id==='text')return source;
  const current=get(source.id,source.kind);
  return {...source,sourceState:!current?'deleted':current.revision!==source.revision?'changed':'current'};
 })};
}
