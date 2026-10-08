// Opt-in, isolated local integration check. Never writes the user's SQLite/index.
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {randomUUID} from 'node:crypto';
import {mkdtemp,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
if(process.env.SHIGUANG_CHECK_TRANSCRIPT_RETRIEVAL!=='1')throw new Error('Set SHIGUANG_CHECK_TRANSCRIPT_RETRIEVAL=1 to run the isolated local check');
const live=new DatabaseSync('.data/shiguang.sqlite',{readOnly:true});
const config=JSON.parse(live.prepare("SELECT value FROM settings WHERE key='retrieval'").get()?.value||'null');live.close();
assert.ok(config);for(const endpoint of [config.embedding,config.qdrant])assert.ok(['127.0.0.1','localhost','[::1]'].includes(new URL(endpoint).hostname),'Only installed local services may be used');
assert.equal(config.model,'qwen3-embedding-0.6b');
const dir=await mkdtemp(join(tmpdir(),'shiguang-transcript-index-'));
const prefix='transcript_eval_'+randomUUID().replaceAll('-','');
Object.assign(process.env,{DATA_DIR:dir,SEED_DEMO:'false',WORKER_MODE:'true',QDRANT_COLLECTION:prefix});
const {db,save,setSetting}=await import('../server/store.mjs');
const {indexCollection}=await import('../server/ai/embedding-contract.mjs');
const {prepareIndex,indexPending,searchIndex,scrollIndex}=await import('../server/retrieval/retrieval.mjs');
const {sourceReading}=await import('../server/domain/shared/source-content.mjs');
const {validateRetrievedEvidence}=await import('../server/agent/research/research-retrieval.mjs');
const collection=indexCollection(config);assert.ok(collection.startsWith(prefix+'_'));
setSetting('retrieval',config);
const record={checkedAt:new Date().toISOString(),model:config.model,collection,dataDir:dir,scope:'One synthetic audio source, actual local Qwen/Qdrant; no ASR or text generation'};
const evidence=hit=>({sourceId:hit.id,kind:hit.kind,title:hit.title,revision:hit.revision,sourceField:'transcriptContent',start:hit.start,end:hit.end,quote:hit.content,selectionMethod:'hybrid_search'});
try{
 const note=save('note',{title:'合成温室计划会议',type:'audio',status:'ready',content:'人工附记：本段为测试资料。',tags:[],attachments:[],transcript:{transcriptRevision:1,segments:[{startMs:0,endMs:3000,speakerId:'speaker_1',text:'火星温室计划预算为32元，周五讨论，尚未批准执行。'}]}});
 await prepareIndex(config,{seed:false});await indexPending();
 const query='温室计划预算多少元，何时讨论？';
 const search=()=>searchIndex(query,{kind:'note'},config,{readOnly:true,seed:false,sourceIds:[note.id]});
 const old=await search();assert.ok(old.length);assert.match(old[0].content,/32元/);
 for(const hit of old){assert.equal(sourceReading(note,'note').text.slice(hit.start,hit.end),hit.content);validateRetrievedEvidence([evidence(hit)],{});}
 const updated=save('note',{...note,transcript:{...note.transcript,transcriptRevision:2,edited:true,segments:[{startMs:0,endMs:3000,speakerId:'speaker_2',text:'修订：月球温室计划预算为86元，周六讨论，尚未批准执行。'}]}},note.revision);
 assert.equal(db.prepare('SELECT revision FROM search_outbox WHERE entity_id=?').get(note.id).revision,updated.revision);
 assert.throws(()=>validateRetrievedEvidence(old.map(evidence),{}),/已修改/);
 const pending=await search();assert.equal(pending.length,0,'The stale Qdrant revision must not escape SQL validation while reindexing is pending');
 await indexPending();
 assert.equal(db.prepare('SELECT revision FROM search_outbox WHERE entity_id=?').get(note.id),undefined);
 const current=await search();assert.ok(current.length);
 for(const hit of current){assert.equal(hit.revision,updated.revision);assert.equal(sourceReading(updated,'note').text.slice(hit.start,hit.end),hit.content);assert.match(hit.content,/86元/);assert.doesNotMatch(hit.content,/32元/);validateRetrievedEvidence([evidence(hit)],{});}
 const inventory=await scrollIndex(config);assert.ok(inventory.points.length);assert.ok(inventory.points.every(p=>p.payload.revision===updated.revision),'Old revision points should be removed');
 record.before=old.map(evidence);record.whilePending=pending;record.after=current.map(evidence);record.oldPointsRemoved=true;record.outboxCleared=true;record.result='passed';
}finally{
 // No indexer/server was started, so no background writer can recreate this collection.
 const url=config.qdrant+'/collections/'+encodeURIComponent(collection);
 const deleted=await fetch(url,{method:'DELETE'});assert.ok(deleted.ok||deleted.status===404);
 record.cleanupStatus=(await fetch(url)).status;assert.equal(record.cleanupStatus,404);
 db.prepare("DELETE FROM settings WHERE key='retrieval'").run();db.close();
 await writeFile(join(dir,'result.json'),JSON.stringify(record,null,2)+'\n');
 console.log(JSON.stringify({result:record.result||'failed',artifact:join(dir,'result.json'),cleanupStatus:record.cleanupStatus}));
}
