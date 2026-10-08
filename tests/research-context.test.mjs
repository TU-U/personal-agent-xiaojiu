import {test} from 'node:test';
import assert from 'node:assert/strict';
import {buildResearchContext,researchReportEvidence} from '../server/agent/research/research-context.mjs';
import {collectResearchEvidence} from '../server/agent/research/research-evidence.mjs';
import {parseResearchReport,reportSections} from '../server/agent/research/research-contract.mjs';
const source=(id,patch={})=>({id,kind:'web',sourceId:'https://example.org/'+id,evidenceType:'web_page',start:10,end:40010,total:50000,quote:'中文🙂'.repeat(10000),matchedQuestions:['Q1'],...patch});
test('medium Chinese documents retain relevant tail through collection and report input; rerender preserves actual read ranges',()=>{
 const content='背景资料与阅读方法。'.repeat(650)+'\n末尾实验条件：practice_lantern初始73，改91后回滚恢复73。';
 const brief={topic:'末尾实验条件',questions:['practice_lantern如何验证回滚？']};
 const evidence=collectResearchEvidence({sources:[{id:'note1',kind:'note',title:'长文',revision:1,content}],externalSources:[]},brief);
 const context=buildResearchContext({questions:brief.questions},evidence);
 const tail=context.evidence.find(e=>e.quote.includes('practice_lantern'));
 assert.ok(tail);assert.ok(tail.start>5000);assert.equal(content.slice(tail.start,tail.end),tail.quote);
 const original=source('long'),short=buildResearchContext({},[original],{excerptBytes:500});
 const restored=researchReportEvidence([original],{sources:short.evidence.map(({id,start,end})=>({id,start,end}))});
 assert.deepEqual(restored,short.evidence);assert.ok(restored[0].end<original.end);
});
test('serialized limit includes escaping and metadata; Unicode excerpts preserve exact locators without modifying originals',()=>{
 const evidence=[source('A'),source('B',{quote:'"\\\n'.repeat(30000),end:90010})],before=structuredClone(evidence);
 const result=buildResearchContext({questions:[{id:'Q1',text:'怎么做？'}]},evidence,{maxBytes:12000,excerptBytes:8000});
 assert.ok(Buffer.byteLength(JSON.stringify(result.input))<=12000);assert.deepEqual(evidence,before);assert.ok(result.evidence.length);
 for(const e of result.evidence){const original=evidence.find(s=>s.id===e.id);assert.equal(e.quote,original.quote.slice(0,e.end-e.start));assert.ok(!/[\uD800-\uDBFF]$/.test(e.quote));assert.equal(e.contextExcerpt,true);assert.equal(e.total,original.total);}
 assert.match(result.notice,/不能声称全部读完/);assert.equal(result.input.contextSelection.available,2);
});
test('question and type rotation prevents a long local source list from crowding out later evidence',()=>{
 const evidence=Array.from({length:30},(_,i)=>source('L'+i,{evidenceType:'original'}));evidence.push(source('WEB'),source('QUESTION2',{matchedQuestions:['Q2']}));
 const result=buildResearchContext({},evidence,{maxBytes:7000,excerptBytes:1500});
 assert.deepEqual(result.evidence.slice(0,3).map(e=>e.id),['L0','WEB','QUESTION2']);assert.ok(result.input.contextSelection.omitted>0);
 assert.ok(result.byteLength<=7000);assert.equal(result.input.contextSelection.included,result.evidence.length);
});
test('oversized required background stops before model calls; omitted sources cannot be cited',()=>{
 assert.throws(()=>buildResearchContext({background:'长背景'.repeat(1000)},[],{maxBytes:1000}),e=>e.code==='RESEARCH_BUDGET');
 const evidence=[source('A'),source('B')],context=buildResearchContext({},evidence,{maxBytes:2000,excerptBytes:1000});assert.equal(context.evidence.length,1);
 const brief={type:'learning',questions:['问题']},report={sections:reportSections('learning').map(key=>({key,paragraphs:[{text:'结论',basis:'evidence',sourceIds:['B']}]})),coverage:[{questionId:'Q1',status:'partial',reason:'缺信息'}],actions:[]};
 assert.throws(()=>parseResearchReport(JSON.stringify(report),brief,context.evidence),/未取得/);
});
