import {inspectRunEvidence} from '../../pet/supervision/supervision-source-reading.mjs';
import {noteReadableText} from '../shared/source-content.mjs';
import {createHash} from 'node:crypto';
import {all,get} from '../../store.mjs';
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
export function eventReviewContext(event){
 const sources=[];
 function read(kind,id,select){const value=get(id,kind);sources.push({kind,id,revision:value?.revision??null,title:value?.title||id,missing:!value});return value?select(value):{id,missing:true};}
 function runEvidence(run){return inspectRunEvidence(run).map(item=>{if(item.kind)sources.push({kind:item.kind,id:item.id,revision:item.invalid?item.currentRevision:item.revision,title:item.title,missing:!!item.missing,...(item.invalid?{issue:item.invalid}:{})});return item;});}
 const input={event:{id:event.id,title:event.title,summary:event.summary,occurredAt:event.occurredAt||null,priority:event.priority,eventType:event.eventType,dueAt:event.dueAt,projectId:event.projectId||'',project:event.project||'',tags:event.tags||[],occurrenceId:event.currentOccurrenceId},source:null,images:(event.images||[]).map(image=>({id:image.id,key:image.key,name:image.name,mime:image.mime,description:image.description||image.caption||image.ocrText||'',imageRead:false})),relatedEvents:[],tasks:[]};
 if(event.sourceNoteId)input.source=read('note',event.sourceNoteId,n=>({id:n.id,title:n.title,content:noteReadableText(n),summary:n.summary||'',summaryMode:n.summaryMode||'',attachments:(n.attachments||[]).map(a=>({id:a.id,key:a.key,name:a.name,mime:a.mime}))}));
 for(const id of event.relatedEventIds||[])input.relatedEvents.push(read('event',id,e=>({id:e.id,title:e.title,summary:e.summary,occurredAt:e.occurredAt||null,priority:e.priority,eventType:e.eventType,lifecycleStatus:e.lifecycleStatus,dueAt:e.dueAt})));
 for(const id of event.relatedTaskIds||[]){
  const task=read('workTask',id,t=>({id:t.id,title:t.title,goal:t.goal,plan:t.plan,requirement:t.requirement,status:t.status,outputs:(t.outputs||[]).map(key=>read('artifact',key,a=>({id:a.id,title:a.title,body:a.body||'',mode:a.mode}))),runs:all('workRun').filter(r=>r.taskId===id).map(r=>read('workRun',r.id,x=>({id:x.id,day:x.day,status:x.status,conditionsSnapshot:x.conditionsSnapshot||null,evidence:x.evidence||'',evidenceSources:runEvidence(x),assessment:x.assessment||null,artifact:x.artifactId?read('artifact',x.artifactId,a=>({id:a.id,title:a.title,body:a.body||'',mode:a.mode})):null})))}));
  input.tasks.push(task);
 }
 // Hash actual consumed fields, excluding incidental revision changes caused by
 // another event's own review; otherwise mutually linked events retrigger forever.
 return {input,snapshot:{signature:hash(input),sources,eventRevision:event.revision,images:input.images.map(({key,...image})=>image),createdAt:new Date().toISOString()}};
}
export function eventReviewStale(event,check){return !!check&&!!check.reviewedDueAt&&event.priority==='high'&&check.reviewedDueAt===check.dueAt&&(!check.reviewSnapshot||check.reviewSnapshot.signature!==eventReviewContext(event).snapshot.signature);}
