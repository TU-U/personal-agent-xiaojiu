import {test} from 'node:test';
import assert from 'node:assert/strict';
import {collectResearchEvidence,selectResearchPassages} from '../server/agent/research/research-evidence.mjs';
import {renderResearchReport} from '../server/agent/research/research-contract.mjs';
test('long source selects late answers to each question, preserving exact positions and bounded input',()=>{
 const text='无关的日常记录。\n'.repeat(1500)+'\n事务回滚：失败时撤销全部修改。\n'+'中间内容。\n'.repeat(1500)+'\n隔离级别：避免并发读取未提交的修改。\n';
 const parts=selectResearchPassages(text,{topic:'数据库学习',questions:['事务回滚是什么？','隔离级别是什么？']});
 assert.ok(parts.some(p=>p.start>8000&&p.quote.includes('事务回滚：')));
 assert.ok(parts.some(p=>p.quote.includes('隔离级别：')));
 assert.ok(parts.reduce((n,p)=>n+p.quote.length,0)<=8000);
 for(const p of parts){assert.equal(p.quote,text.slice(p.start,p.end));assert.equal(p.selectionMethod,'keyword_scan');}
 assert.ok(parts.some(p=>p.matchedQuestions.includes('Q1')));assert.ok(parts.some(p=>p.matchedQuestions.includes('Q2')));
});
test('unmatched long sources are labelled previews, not semantic matches; short originals stay exact',()=>{
 const text='🙂无关内容\n'.repeat(3000),brief={topic:'transaction',questions:['rollback?']};
 const parts=selectResearchPassages(text,brief);assert.equal(parts.length,8);assert.equal(parts.at(-1).end,text.length);
 assert.ok(parts.every(p=>p.selectionMethod==='distributed_preview'&&p.matchedQuestions.length===0&&p.quote===text.slice(p.start,p.end)));
 const short='  # 标题\n1. 原文\r\n🙂';assert.deepEqual(selectResearchPassages(short,brief),[{start:0,end:short.length,quote:short,selectionMethod:'full_text',matchedQuestions:[]}]);
});
test('external evidence retains provenance and distinct IDs across passages, report discloses selection',()=>{
 const text='无关背景。\n'.repeat(2000)+'尾部证据：实际限制需要核对。',brief={topic:'限制',questions:['尾部证据是什么？']};
 const evidence=collectResearchEvidence({sources:[{id:'note1',kind:'note',title:'笔记',revision:3,content:text}],externalSources:[{id:'fill1',title:'回填',revision:1,text,providedAt:'2026-10-08',urls:[]}]},brief,{taskId:'task1',now:()=> 'now'});
 assert.equal(new Set(evidence.map(e=>e.id)).size,evidence.length);
 assert.ok(evidence.some(e=>e.id==='E1'));assert.ok(evidence.some(e=>e.id==='X1'));
 for(const e of evidence){assert.equal(e.quote,text.slice(e.start,e.end));if(e.evidenceType==='user_fill'){assert.equal(e.retrievedAt,undefined);assert.equal(e.verificationStatus,'unverified');assert.equal(e.taskId,'task1');}else assert.equal(e.retrievedAt,'now');}
 const body=renderResearchReport({sections:[],coverage:[]},brief,evidence,'');assert.match(body,/关键词扫描全文选段/);assert.match(body,/链接未由应用读取\/核验/);
});
test('full scan checks cancellation/deadline repeatedly instead of silently returning a prefix',()=>{
 let checks=0;assert.throws(()=>selectResearchPassages('background '.repeat(5000),{topic:'x',questions:['y']},{assertActive:()=>{if(++checks===5)throw new Error('cancelled');}}),/cancelled/);assert.equal(checks,5);
});
