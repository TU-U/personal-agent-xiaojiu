import {test} from 'node:test';
import assert from 'node:assert/strict';
import {buildArtifactContext} from '../server/agent/artifact-context.mjs';
test('artifact references exactly match bounded model excerpts and retain long-text source locations',()=>{
 const notes=Array.from({length:30},(_,i)=>({id:String(i),title:'记录'+i,revision:1,createdAt:'2026-10-08T00:00:00Z',content:'本周进展。'.repeat(500)}));
 const result=buildArtifactContext(notes,{maxChars:12000});assert.ok(result.context.length<=12000);assert.equal(result.sources.length,30);
 for(const [i,s] of result.sources.entries()){assert.ok(result.context.includes(`[${i+1}] ${s.title}`));assert.ok(result.context.includes(s.quote));for(const e of s.excerpts)assert.equal(notes[Number(s.id)].content.slice(e.start,e.end),e.quote);}
 const long={...notes[0],content:'无关背景。'.repeat(2000)+'\n回滚验证结论：蓝色开关已测试。'};
 const selected=buildArtifactContext([long],{instructions:'回滚验证结论',maxChars:12000});assert.match(selected.context,/蓝色开关已测试/);assert.ok(selected.sources[0].excerpts.some(e=>e.start>9000));assert.equal(selected.sources[0].truncated,true);
});
