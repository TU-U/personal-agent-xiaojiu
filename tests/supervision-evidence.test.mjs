import {test,after} from 'node:test';import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';import os from 'node:os';import path from 'node:path';
const root=await mkdtemp(path.join(os.tmpdir(),'supervision-evidence-'));Object.assign(process.env,{DATA_DIR:root,SEED_DEMO:'false',WORKER_MODE:'true'});
const {db,save,get}=await import('../server/store.mjs');const {assessRunEvidence:assess,confirmRunEvidence:confirm,evidenceOptions,resolveEvidenceSources}=await import('../server/supervision-evidence.mjs');
const {timerAction,checkpointTimer}=await import('../server/supervision-timer.mjs');
function fixture(minutes=45){const task=save('workTask',{status:'running',supervisionStatus:'active'});return save('workRun',{taskId:task.id,status:'open',evidenceRevision:1,seconds:0,timerAt:null,conditionsSnapshot:{version:1,minimumSeconds:minutes*60,conditions:[{id:'points',required:true,description:'三条心得'},{id:'example',required:true,description:'实践例子'}]}});}
const text='三条心得：甲、乙、丙。实践例子：做了一个演示。';
const output=(sourceId='text')=>({results:[{conditionId:'points',status:'satisfied',reason:'有三点',evidence:[{sourceId,quote:'三条心得：甲、乙、丙'}]},{conditionId:'example',status:'satisfied',reason:'有例子',evidence:[{sourceId,quote:'实践例子：做了一个演示'}]}]});
const body=(id='evidence-once')=>({action:'evidence',opId:id,evidenceRevision:1,evidence:text});
test('timer checkpoints do not invalidate evidence; time AND all conditions require manual confirmation and replay is idempotent',async()=>{
 const run=fixture(),t0=Date.now();timerAction(run.id,{action:'start'},{clock:()=>t0});
 const checked=await assess(run.id,body(),{generate:async()=>{checkpointTimer(run.id,{clock:()=>t0+30000});return JSON.stringify(output());}});
 assert.equal(checked.seconds,30);assert.equal(checked.evidenceRevision,2);assert.equal(checked.status,'review');assert.equal(checked.assessment.results.length,2);
 const confirmation={action:'confirm',opId:'confirm-once',evidenceRevision:2,assessmentId:checked.assessment.id};
 assert.throws(()=>confirm(run.id,confirmation,{clock:()=>t0+30000}),/投入时长/);
 timerAction(run.id,{action:'adjust',opId:'adjust-45min',minutes:45,reason:'纸上阅读'},{clock:()=>t0+30000});
 const completed=confirm(run.id,confirmation,{clock:()=>t0+30000});assert.equal(completed.status,'completed');assert.equal(completed.timerAt,null);assert.deepEqual(confirm(run.id,confirmation),completed);
 assert.deepEqual(await assess(run.id,body(),{generate:async()=>assert.fail('must replay receipt')}),checked);
 assert.equal(get(run.id,'workRun').status,'completed');
});
test('missing, duplicate, unknown conditions, illegal states and fabricated quotations fail closed',async()=>{
 const run=fixture(0),good=output();
 const bad=[{results:good.results.slice(0,1)},{results:[good.results[0],good.results[0]]},{results:[good.results[0],{...good.results[1],conditionId:'unknown'}]},{results:[good.results[0],{...good.results[1],status:'done'}]},{results:[good.results[0],{...good.results[1],evidence:[]}]},{results:[good.results[0],{...good.results[1],evidence:[{sourceId:'text',quote:'编造内容'}]}]},{...good,confirmed:true}];
 for(const [i,value] of bad.entries())await assert.rejects(assess(run.id,body('invalid-case-'+i),{generate:async()=>JSON.stringify(value)}),error=>error.status===502);
 assert.equal(get(run.id,'workRun').evidenceRevision,1);assert.equal(get(run.id,'workRun').assessment,undefined);
 const incomplete=await assess(run.id,body('missing-evidence'),{generate:async()=>JSON.stringify({results:[good.results[0],{...good.results[1],status:'missing',evidence:[]}]})});
 assert.throws(()=>confirm(run.id,{action:'confirm',opId:'incomplete-confirm',evidenceRevision:2,assessmentId:incomplete.assessment.id}),/必选条件/);
});
test('concurrent evidence and changed requirements cannot overwrite an accepted version',async()=>{
 const run=fixture(0);let release;const gate=new Promise(resolve=>release=resolve);let started;const ready=new Promise(resolve=>started=resolve);
 const late=assess(run.id,body('late-evidence'),{generate:async()=>{started();await gate;return JSON.stringify(output());}});await ready;
 const first=await assess(run.id,body('first-evidence'),{generate:async()=>JSON.stringify(output())});release();await assert.rejects(late,/证据已由其他操作更新/);assert.equal(get(run.id,'workRun').assessment.id,first.assessment.id);
 const other=fixture(0);await assert.rejects(assess(other.id,body('changed-condition'),{generate:async()=>{const r=get(other.id,'workRun');save('workRun',{...r,conditionsSnapshot:{...r.conditionsSnapshot,minimumSeconds:60}},r.revision);return JSON.stringify(output());}}),/完成要求变化/);
});
test('source revisions fence generation and final confirmation; wrong and old artifacts are rejected',async()=>{
 const run=fixture(0),note=save('note',{title:'证据',content:text});
 const request={...body('source-evidence'),evidence:'',evidenceRefs:[{kind:'note',id:note.id,revision:note.revision}]};
 const checked=await assess(run.id,request,{generate:async()=>JSON.stringify(output(note.id))});save('note',{...note,content:'已经修改'},note.revision);
 assert.throws(()=>confirm(run.id,{action:'confirm',opId:'source-confirm',evidenceRevision:2,assessmentId:checked.assessment.id}),/版本已变化/);
 const another=fixture(0),source=save('note',{content:text});await assert.rejects(assess(another.id,{...body('source-changes'),evidenceRefs:[{kind:'note',id:source.id,revision:source.revision}]},{generate:async()=>{save('note',{...source,content:'变化'},source.revision);return JSON.stringify(output());}}),/版本已变化/);
 for(const artifact of [save('artifact',{body:text,taskId:'another-task'}),save('artifact',{body:text,taskId:another.taskId,createdAt:'2000-01-01T00:00:00Z'})])await assert.rejects(assess(another.id,{...body('bad-artifact-'+artifact.id),artifactId:artifact.id},{generate:async()=>assert.fail('must reject before model')}),/不属于|旧成果/);
});
test('picker shares submission eligibility; selected old versions stay visible across pages and deletion',async()=>{
 const run=fixture(0),notes=Array.from({length:23},(_,i)=>save('note',{title:'选择器资料'+i,content:text}));
 const first=evidenceOptions(run.id,{kind:'note',q:'选择器资料'}),second=evidenceOptions(run.id,{kind:'note',q:'选择器资料',offset:'20'});
 assert.equal(first.total,23);assert.equal(first.items.length,20);assert.equal(second.items.length,3);assert.equal(new Set([...first.items,...second.items].map(x=>x.id)).size,23);
 const source=notes[0],ref={kind:'note',id:source.id,revision:source.revision};save('note',{...source,content:'改版正文'},source.revision);
 const old=resolveEvidenceSources(run.id,[ref]).items[0];assert.equal(old.revision,ref.revision);assert.equal(old.currentRevision,ref.revision+1);assert.match(old.invalid,/版本已变化/);
 await assert.rejects(assess(run.id,{...body('picker-stale'),evidenceRefs:[ref]},{generate:async()=>assert.fail('invalid selection must not call model')}),/版本已变化/);
 assert.throws(()=>evidenceOptions(run.id,{kind:'memory'}));assert.throws(()=>resolveEvidenceSources(run.id,[{...ref,revision:0}]));
 const ready=save('libraryFile',{title:'已解析',status:'ready',content:text}),pending=save('libraryFile',{title:'待解析',status:'pending',content:text});
 const files=evidenceOptions(run.id,{kind:'libraryFile'}).items;assert.ok(files.some(x=>x.id===ready.id));assert.ok(!files.some(x=>x.id===pending.id));assert.match(resolveEvidenceSources(run.id,[{kind:'libraryFile',id:pending.id,revision:pending.revision}]).items[0].invalid,/尚无可用正文/);
 const wrong=save('artifact',{title:'其他任务',taskId:'wrong',body:text});assert.ok(!evidenceOptions(run.id,{kind:'artifact'}).items.some(x=>x.id===wrong.id));
 const missing=resolveEvidenceSources(run.id,[{kind:'note',id:'deleted-note',revision:1}]).items[0];assert.equal(missing.id,'deleted-note');assert.match(missing.invalid,/不存在/);
});
after(async()=>{db.close();await rm(root,{recursive:true,force:true});});
