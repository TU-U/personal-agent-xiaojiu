import {test} from 'node:test';
import assert from 'node:assert/strict';
import {checkMemoryConflict} from '../server/domain/memory/memory-conflicts.mjs';
const memories=Array.from({length:105},(_,i)=>({id:'m'+i,content:'个人背景'+i,revision:1,scope:'通用',status:'active'}));
const input=prompt=>JSON.parse(prompt.split('\n已有记忆：')[1].split('\n判断')[0]);
test('hybrid ranks first but full database coverage includes old and unindexed memories without truncation',async()=>{
 const source=memories.map(m=>({...m}));source[104].content='前缀'.repeat(200)+'旧居住地深圳';let searches=0,calls=0;const seen=[];
 const result=await checkMemoryConflict('用户现居广州',source,{
  search:async(q,options)=>{searches++;assert.equal(options.kind,'memory');return [{id:'m80'}];},
  complete:async(system,prompt,_unused,options)=>{calls++;assert.equal(options.requireComplete,true);const entries=input(prompt);seen.push(...entries);return JSON.stringify(entries.some(m=>m.id==='m104')?{conflictId:'m104',kind:'update',reason:'同一用户当前居住地更新'}:{conflictId:null});},
 });
 assert.equal(searches,1);assert.ok(calls>4);assert.equal(seen[0].id,'m80');assert.equal(new Set(seen.map(m=>m.id)).size,105);assert.equal(seen.find(m=>m.id==='m104').content,source[104].content);assert.equal(result.id,'m104');assert.equal(result.revision,1);
});
test('no-conflict requires all batches; provider or retrieval failure cannot produce null',async()=>{
 let checked=0;assert.equal(await checkMemoryConflict('新事实',memories,{search:async()=>[],complete:async(_s,p)=>{checked+=input(p).length;return '{"conflictId":null}';}}),null);assert.equal(checked,105);
 await assert.rejects(checkMemoryConflict('新事实',memories,{search:async()=>{throw new Error('retrieval unavailable');},complete:async()=>assert.fail('provider must not run')}),/retrieval unavailable/);
 let calls=0;await assert.rejects(checkMemoryConflict('新事实',memories,{search:async()=>[],complete:async()=>++calls===3?'{}':'{"conflictId":null}'}),e=>e.status===502);assert.equal(calls,3);
});
test('model cannot cite a memory outside its batch; exact duplicate needs no model call',async()=>{
 await assert.rejects(checkMemoryConflict('新事实',memories,{search:async()=>[],complete:async()=>JSON.stringify({conflictId:'m104',kind:'duplicate',reason:'模型越界引用'})}),e=>e.status===502);
 const result=await checkMemoryConflict(memories[104].content,memories,{search:async()=>assert.fail(),complete:async()=>assert.fail()});assert.equal(result.id,'m104');assert.equal(result.conflictKind,'duplicate');
});
test('structured scope is passed to both hybrid filtering and comparison context',async()=>{
 let options;
 await checkMemoryConflict('新事实',[memories[0]],{context:{scopeKind:'project',scopeId:'stable-project',scope:'周报'},search:async(_q,value)=>{options=value;return [];},complete:async()=>'{"conflictId":null}'});
 assert.equal(options.projectId,'stable-project');assert.equal(options.purpose,'周报');
});
