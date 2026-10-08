import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const dir = mkdtempSync(path.join(os.tmpdir(), 'shiguang-retrieval-'));
process.env.DATA_DIR = dir;
process.env.SEED_DEMO = 'false';
process.env.QDRANT_URL = 'http://qdrant.test';
process.env.EMBEDDING_BASE_URL = 'http://embedding.test/v1';
process.env.EMBEDDING_MODEL = 'test-embedding';
const { db, save, remove, get } = await import('../server/store.mjs');
const { hybridSearch, lexicalVector, indexPending,searchIndex,retrievalConfig } = await import('../server/retrieval/retrieval.mjs');
const originalFetch = globalThis.fetch;
const originalLog = console.log;
console.log = () => {};
const points = new Map();
const calls = [];
let collectionExists = false;
let collectionDimensions=3;
let intercept = null;
let queryPoints = null;
globalThis.fetch = async (url, options = {}) => {
  const target = String(url);
  const payload = options.body ? JSON.parse(options.body) : null;
  if(intercept) await intercept(target,payload);
  calls.push({ target, method: options.method || 'GET', payload });
  const reply = (result, status = 200) => new Response(JSON.stringify({ status: 'ok', result }), { status, headers: { 'Content-Type': 'application/json' } });
  if (target.endsWith('/embeddings')) return new Response(JSON.stringify({ data: [{ embedding: [0.1, 0.2, 0.3] }] }), { status: 200 });
  if (target.includes('/points/delete')) { for (const id of payload.points) points.delete(id); return reply({ status: 'completed' }); }
  if (target.includes('/points/query')) return reply({ points: (queryPoints||[...points.values()]).slice(0,payload.limit).map(point => ({ id: point.id, score: 0.9, payload: point.payload })) });
  if (target.includes('/points')) { for (const point of payload.points) points.set(point.id, point); return reply({ status: 'completed' }); }
  if ((options.method || 'GET') === 'PUT') { collectionExists = true; return reply(true); }
  return collectionExists ? reply({ status: 'green',config:{params:{vectors:{dense:{size:collectionDimensions,distance:'Cosine'}},sparse_vectors:{lexical:{}}}} }) : new Response('{}', { status: 404 });
};

test('hybrid retrieval indexes notes and confirmed memories, then rejects stale and paused entries', async () => {
  const note = save('note', { title: '旅行计划', content: '下周去杭州看展览', tags: ['旅行'], project: '', status: 'ready' });
  const memory = save('memory', { title: '喜欢展览', content: '我喜欢看艺术展览', status: 'active', scope: '通用' });
  const candidate = save('memory', { title: '待确认', content: '尚未确认的偏好', status: 'candidate', scope: '通用' });
  await indexPending();
  let found = await hybridSearch('去看艺术展', { limit: 6 });
  assert.deepEqual(new Set(found.map(item => item.id)), new Set([note.id, memory.id]));
  assert.equal(points.has(candidate.id), false);
  const query = calls.find(call => call.target.endsWith('/points/query'));
  assert.equal(query.payload.prefetch.length, 2);
  assert.deepEqual(query.payload.query, { rrf: {} });
  assert.ok(query.payload.prefetch[1].query.indices.length);

  const changed = save('note', { ...get(note.id, 'note'), content: '已经改成去苏州' }, note.revision);
  await indexPending();
  await hybridSearch('旅行', { limit: 6 });
  points.get(note.id).payload.revision = note.revision;
  found = await hybridSearch('旅行', { limit: 6 });
  assert.equal(found.some(item => item.id === note.id), false, 'stale vector revision must not be used');
  assert.equal(changed.revision, note.revision + 1);

  save('memory', { ...get(memory.id, 'memory'), status: 'paused' }, memory.revision);
  await indexPending();
  found = await hybridSearch('展览', { limit: 6 });
  assert.equal(found.some(item => item.id === memory.id), false);
  assert.equal(points.has(memory.id), false);
  remove(changed.id, 'note', changed.revision);
  await indexPending();
  await hybridSearch('旅行', { limit: 6 });
  assert.equal(points.has(note.id), false);
});

test('long documents index their tail without making a query drain the queue',async()=>{const note=save('note',{title:'长文',content:'前文'.repeat(6000)+'\n尾部独特证据',tags:[],status:'ready'});await hybridSearch('尾部');assert.equal(points.has(note.id),false);await indexPending();const chunks=[...points.values()].filter(p=>p.payload.entityId===note.id);assert.ok(chunks.length>1);assert.ok(chunks.some(p=>p.payload.text.includes('尾部独特证据')));});

test('source mutation during embedding or point submission preserves the newer outbox and removes uncertain old chunks',async()=>{
  const note=save('note',{title:'版本竞态',content:'旧内容'.repeat(1500),tags:[],status:'ready'});
  let changed;
  intercept=async(target,payload)=>{
    if(target.endsWith('/embeddings')&&payload.input.startsWith('版本竞态\n')){
      intercept=null;
      changed=save('note',{...get(note.id,'note'),content:'较短的新内容'},note.revision);
    }
  };
  await indexPending();
  assert.equal(points.has(note.id),false,'changed source must not be uploaded after embedding finishes');
  assert.equal(db.prepare('SELECT revision FROM search_outbox WHERE entity_id=?').get(note.id).revision,changed.revision);
  await indexPending();
  assert.equal(points.get(note.id).payload.revision,changed.revision);

  const longer=save('note',{...get(note.id,'note'),content:'长文段落'.repeat(1600)},changed.revision);
  let newRevision;
  intercept=async(target,payload)=>{
    if(target.includes('/points?')&&payload.points?.[0]?.payload.entityId===note.id&&payload.points[0].payload.chunk===1){
      intercept=null;
      newRevision=save('note',{...get(note.id,'note'),content:'最终短文'},longer.revision);
      // Simulate a committed remote PUT whose response is lost.
      for(const point of payload.points)points.set(point.id,point);
      throw new Error('response lost');
    }
  };
  await indexPending();
  assert.equal(db.prepare('SELECT revision FROM search_outbox WHERE entity_id=?').get(note.id).revision,newRevision.revision);
  assert.equal([...points.values()].filter(p=>p.payload.entityId===note.id).length,2);
  assert.equal((await hybridSearch('长文段落')).some(p=>p.id===note.id),false,'old revision remains unusable while recovery is pending');
  await indexPending();
  const recovered=[...points.values()].filter(p=>p.payload.entityId===note.id);
  assert.equal(recovered.length,1,'uncertain partial tail must be deleted after newer short revision');
  assert.equal(recovered[0].payload.revision,newRevision.revision);
  assert.equal(db.prepare('SELECT 1 FROM search_outbox WHERE entity_id=?').get(note.id),undefined);

  intercept=async(target,payload)=>{
    if(target.endsWith('/embeddings')&&payload.input.startsWith('版本竞态\n')){
      intercept=null;const latest=get(note.id,'note');remove(note.id,'note',latest.revision);
    }
  };
  save('note',{...get(note.id,'note'),content:'删除前修改'},newRevision.revision);
  await indexPending();
  assert.equal(get(note.id,'note'),null);
  await indexPending();
  assert.equal([...points.values()].some(p=>p.payload.entityId===note.id),false);
});

test('all source kinds enforce project and memory scope, and valid hits after stale prefixes are recovered',async()=>{
  const pa=save('project',{name:'同名项目'}),pb=save('project',{name:'同名项目'});
  const category=save('noteCategory',{name:'项目类别',projectId:pa.id});
  const wanted=save('event',{title:'甲要事',summary:'方案',project:'甲',projectId:pa.id});
  const categoryNote=save('note',{title:'类别关联笔记',content:'方案',categoryId:category.id});
  const other=save('libraryFile',{title:'乙文件',content:'方案',status:'ready',project:'乙',projectId:pb.id});
  const global=save('memory',{title:'通用',content:'偏好',scope:'通用',status:'active'});
  const weekly=save('memory',{title:'周报限制',content:'偏好',scope:'周报',status:'active'});
  const projectMemory=save('memory',{title:'乙记忆',content:'偏好',scopeKind:'project',scopeId:pb.id,status:'active'});
  const thread=save('thread',{id:'thread-A',status:'active'});
  const threadMemory=save('memory',{title:'甲话题',content:'偏好',scopeKind:'thread',scopeId:'thread-A',status:'active'});
  for(let i=0;i<3;i++)await indexPending();
  let found=await hybridSearch('方案',{projectId:pa.id,limit:20});
  assert.deepEqual(new Set(found.map(x=>x.id)),new Set([wanted.id,categoryNote.id,global.id]));
  found=await hybridSearch('方案',{project:'甲',limit:20});
  assert.deepEqual(new Set(found.map(x=>x.id)),new Set([wanted.id,global.id]));
  found=await hybridSearch('偏好',{kind:'memory',threadId:'thread-A',purpose:'周报',limit:20});
  assert.deepEqual(new Set(found.map(x=>x.id)),new Set([global.id,weekly.id,threadMemory.id]));
  const q=calls.filter(c=>c.target.endsWith('/points/query')).at(-1).payload;
  assert.deepEqual(q.prefetch[0].filter,q.prefetch[1].filter);
  assert.deepEqual(q.filter,q.prefetch[0].filter);
  // Remote results deliberately ignore filters, so SQLite must remain decisive.
  assert.equal(found.some(x=>x.id===projectMemory.id||x.id===other.id),false);
  queryPoints=[...Array.from({length:55},(_,i)=>({id:'stale-'+i,payload:{kind:'event',entityId:wanted.id,revision:0}})),points.get(wanted.id)];
  found=await hybridSearch('方案',{projectId:pa.id,limit:1});
  assert.equal(found[0].id,wanted.id);
  assert.equal(found.retrievalInfo.examined,56);
  assert.equal(found.retrievalInfo.truncated,false);
  queryPoints=Array.from({length:1100},(_,i)=>({id:'stale-'+i,payload:{kind:'event',entityId:wanted.id,revision:0}}));
  found=await hybridSearch('方案',{projectId:pa.id,limit:1});
  assert.equal(found.length,0);assert.equal(found.retrievalInfo.truncated,true);assert.ok(found.retrievalInfo.notice);
  queryPoints=null;
  save('thread',{...thread,status:'deleted'},thread.revision);
  found=await hybridSearch('偏好',{kind:'memory',threadId:'thread-A',limit:20});
  assert.equal(found.some(x=>x.id===threadMemory.id),false,'deleted thread cannot authorize memory scope');
});

test('an existing collection with a different dimension is rejected before any point write',async()=>{
  const note=save('note',{title:'维度测试',content:'保留待索引',tags:[]});
  collectionDimensions=1024;const writes=calls.filter(x=>x.target.includes('/points?')).length;
  await assert.rejects(hybridSearch('维度测试'),/配置不匹配/);
  await indexPending();
  assert.equal(calls.filter(x=>x.target.includes('/points?')).length,writes);
  assert.ok(db.prepare('SELECT 1 FROM search_outbox WHERE entity_id=?').get(note.id));
  collectionDimensions=3;await indexPending();assert.equal(points.get(note.id).payload.revision,note.revision);
});

test('library scope limits both prefetch branches and rechecks current metadata; empty scope avoids embedding',async()=>{
 const wanted=save('libraryFile',{title:'筛选方案',content:'筛选方案正文',status:'ready',sourcePath:'筛选/a.pdf'});
 const outside=save('libraryFile',{title:'其他方案',content:'其他方案正文',status:'ready',sourcePath:'筛选外/a.pdf'});
 await indexPending();
 const options={kind:'libraryFile',libraryFilters:{directory:'筛选',extension:'.pdf'}};
 let result=await hybridSearch('方案',options);
 assert.deepEqual(result.map(x=>x.id),[wanted.id]);
 const request=calls.filter(x=>x.target.endsWith('/points/query')).at(-1).payload;
 for(const filter of [request.filter,...request.prefetch.map(p=>p.filter)])assert.deepEqual(filter.must.find(x=>x.key==='entityId').match.any,[wanted.id]);
 let changed=false;
 intercept=async target=>{if(!changed&&target.endsWith('/points/query')){changed=true;const current=get(wanted.id,'libraryFile');save('libraryFile',{...current,status:'archived'},current.revision);}};
 try{result=await hybridSearch('方案',options);assert.equal(result.length,0);}finally{intercept=null;}
 const before=calls.length;
 result=await hybridSearch('方案',options);assert.equal(result.length,0);assert.equal(result.retrievalInfo.evidenceStatus,'insufficient');assert.equal(calls.length,before);
 assert.ok(get(outside.id,'libraryFile'));
});

test('stale memory source rejects residual vector even when memory revision is unchanged',async()=>{
 const source=save('note',{title:'偏好来源',content:'习惯短句',tags:[]});
 const memory=save('memory',{title:'偏好',content:'习惯短句',scope:'通用',status:'active',sourceId:source.id,sourceRevision:source.revision});
 await indexPending();assert.ok((await hybridSearch('习惯短句',{kind:'memory'})).some(hit=>hit.id===memory.id));
 save('note',{...source,content:'习惯已更改'},source.revision);
 assert.ok(!(await hybridSearch('习惯短句',{kind:'memory'})).some(hit=>hit.id===memory.id));
});
test('answer passes current thread and stable project to retrieval and explains memory scope',async()=>{
 const p=save('project',{name:'同名'}),other=save('project',{name:'同名'}),thread=save('thread',{status:'active'}),otherThread=save('thread',{status:'active'});
 const inProject=save('memory',{title:'项目偏好',content:'偏好简洁说明',status:'active',scope:'通用',scopeKind:'project',scopeId:p.id});
 const wrongProject=save('memory',{title:'其他项目',content:'偏好详尽说明',status:'active',scope:'通用',scopeKind:'project',scopeId:other.id});
 const inThread=save('memory',{title:'话题背景',content:'讨论排版偏好',status:'active',scope:'通用',scopeKind:'thread',scopeId:thread.id});
 const wrongThread=save('memory',{title:'其他话题',content:'讨论其他偏好',status:'active',scope:'通用',scopeKind:'thread',scopeId:otherThread.id});
 await indexPending();const {answer}=await import('../server/ai/engine.mjs');
 const result=await answer('排版偏好','',[],[],[],'',{threadId:thread.id,projectId:p.id});
 assert.ok(result.sources.some(s=>s.id===inProject.id&&s.scopeId===p.id));assert.ok(result.sources.some(s=>s.id===inThread.id&&s.scopeKind==='thread'));assert.ok(!result.sources.some(s=>[wrongProject.id,wrongThread.id].includes(s.id)));
});
test('read-only scoped search filters both Qdrant and SQL without writing index state',async()=>{
 const selected=save('note',{title:'已选资料',content:'数据库事务'}),other=save('note',{title:'其他资料',content:'数据库事务'});
 await indexPending();const before=db.prepare('SELECT total_changes() AS n').get().n;
 const start=calls.length,found=await searchIndex('数据库事务',{},retrievalConfig(),{readOnly:true,sourceIds:[selected.id]});
 assert.deepEqual([...new Set(found.map(s=>s.id))],[selected.id]);assert.ok(!found.some(s=>s.id===other.id));
 assert.equal(db.prepare('SELECT total_changes() AS n').get().n,before);
 const query=calls.slice(start).find(c=>c.target.endsWith('/points/query'));
 assert.ok(query.payload.filter.must.some(f=>f.key==='entityId'&&f.match.any.includes(selected.id)));
 for(const p of query.payload.prefetch)assert.deepEqual(p.filter,query.payload.filter);
 assert.ok(!calls.slice(start).some(c=>c.method==='PUT'));
 const count=calls.length;assert.deepEqual(await searchIndex('x',{},retrievalConfig(),{readOnly:true,sourceIds:[]}),[]);assert.equal(calls.length,count);
 await assert.rejects(searchIndex('x',{},retrievalConfig(),{readOnly:true,sourceIds:'wrong'}),/来源范围无效/);
});
test('read-only search refuses missing or incompatible collections without creating one',async()=>{
 const start=calls.length;collectionExists=false;
 try{await assert.rejects(searchIndex('事务',{},retrievalConfig(),{readOnly:true}),/404/);assert.ok(!calls.slice(start).some(c=>c.method==='PUT'));}
 finally{collectionExists=true;}
 collectionDimensions=4;try{await assert.rejects(searchIndex('事务',{},retrievalConfig(),{readOnly:true}),/配置不匹配/);}finally{collectionDimensions=3;}
});
test('read-only evidence rejects corrupted quotes and locators even at the current revision',async()=>{
 const source=save('note',{title:'原文校验',content:'事务原文应保持一致。'});await indexPending();
 const point=[...points.values()].find(p=>p.payload.entityId===source.id),valid=structuredClone(point);
 try{
  for(const patch of [{text:'伪造引文'},{start:-1},{end:source.content.length+1},{start:0.5},{end:0}]){
   queryPoints=[{...valid,payload:{...valid.payload,...patch}}];
   assert.deepEqual(await searchIndex('事务',{},retrievalConfig(),{readOnly:true,sourceIds:[source.id]}),[]);
  }
  queryPoints=[valid];const result=await searchIndex('事务',{},retrievalConfig(),{readOnly:true,sourceIds:[source.id]});assert.equal(result[0].content,source.content);
 }finally{queryPoints=null;}
});
test('caller cancellation survives embedding and prevents subsequent index requests',async()=>{
 const controller=new AbortController(),reason=new Error('research cancelled'),start=calls.length;
 intercept=async target=>{if(target.endsWith('/embeddings'))controller.abort(reason);};
 try{await assert.rejects(searchIndex('事务',{},retrievalConfig(),{readOnly:true,signal:controller.signal}),error=>error===reason);assert.ok(calls.slice(start).every(c=>c.target.endsWith('/embeddings')));}
 finally{intercept=null;}
 const before=calls.length;await assert.rejects(searchIndex('事务',{},retrievalConfig(),{readOnly:true,signal:controller.signal}),error=>error===reason);assert.equal(calls.length,before);
});
test('caller cancellation reaches a pending response body',async()=>{
 const previous=globalThis.fetch,controller=new AbortController(),reason=new Error('body cancelled');let ready;
 const started=new Promise(resolve=>{ready=resolve;});
 globalThis.fetch=async (_url,options)=>new Response(new ReadableStream({start(stream){options.signal.addEventListener('abort',()=>stream.error(options.signal.reason),{once:true});ready();}}));
 try{const pending=searchIndex('事务',{},retrievalConfig(),{readOnly:true,signal:controller.signal});await started;controller.abort(reason);await assert.rejects(pending,error=>error===reason);}finally{globalThis.fetch=previous;}
});
test('ordinary search also cancels collection inspection before index initialization writes',async()=>{
 const controller=new AbortController(),reason=new Error('stop collection inspection'),before=db.prepare('SELECT total_changes() AS n').get().n,start=calls.length;
 intercept=async target=>{if(target.includes('/collections/'))controller.abort(reason);};
 try{await assert.rejects(searchIndex('事务',{},retrievalConfig(),{signal:controller.signal}),error=>error===reason);assert.equal(db.prepare('SELECT total_changes() AS n').get().n,before);assert.ok(!calls.slice(start).some(c=>c.method==='PUT'||c.target.endsWith('/points/query')));}finally{intercept=null;}
});
test('Chinese lexical features preserve exact terms', () => {
  const a = lexicalVector('杭州 展览');
  const b = lexicalVector('今天去杭州看展览');
  assert.ok(a.indices.length > 0);
  assert.ok(b.indices.length > 0);
  assert.ok(a.indices.some(index => b.indices.includes(index)));
  assert.ok(a.indices.every(index => Number.isSafeInteger(index) && index >= 0));
});

after(() => { globalThis.fetch = originalFetch; console.log = originalLog; db.close(); rmSync(dir, { recursive: true, force: true }); });

test('embedding contract rejection is logged as error instead of a successful response',async()=>{
 const {setSetting,getSetting}=await import('../server/store.mjs');
 const {testEmbedding}=await import('../server/retrieval/retrieval.mjs');
 const {recentAiEvents}=await import('../server/core/ai-log.mjs');
 const previous=getSetting('retrieval',null);
 try{
  setSetting('retrieval',{qdrant:'http://qdrant.test',embedding:'http://embedding.test/v1',model:'qwen3-embedding-0.6b',indexProfile:'qwen3-local-v1'});
  await assert.rejects(testEmbedding(),/Embedding维度不符/);
  const error=recentAiEvents().find(e=>e.kind==='embedding'&&e.stage==='error'&&e.error.includes('维度不符'));
  assert.ok(error);assert.equal(error.dimensions,3);
  assert.equal(recentAiEvents().some(e=>e.callId===error.callId&&e.stage==='response'),false);
 }finally{setSetting('retrieval',previous);}
});
