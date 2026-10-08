import {test} from 'node:test';
import assert from 'node:assert/strict';
import {splitSummaryText,summarizeLongText} from '../server/ai/long-summary.mjs';
test('summary chunks retain every character, paragraph break and surrogate pair',()=>{
 const text='首段\n'+'字'.repeat(5998)+'😀'+'z'.repeat(5000)+'\n末尾重要待办';const chunks=splitSummaryText(text,6003);
 assert.equal(chunks.join(''),text);assert.ok(chunks.every(s=>s.length<=6003&&!/[\uD800-\uDBFF]$/.test(s)));
});
test('long summary sends the tail and combines all segment summaries',async()=>{
 const calls=[];const text='甲'.repeat(20000)+'最后一段禁止自动确认';
 const answer=await summarizeLongText(text,'会议',async(system,prompt,schema,options)=>{calls.push({prompt,options});return '本次第'+calls.length+'份归纳';});
 assert.equal(calls.length,4);assert.match(calls[2].prompt,/最后一段禁止自动确认/);for(let i=1;i<=3;i++)assert.ok(calls[3].prompt.includes('本次第'+i+'份归纳'));assert.equal(answer,'本次第4份归纳');assert.ok(calls.every(c=>c.options.requireComplete));
});
test('failure stops remaining calls and excessive input is not silently cut',async()=>{
 let calls=0;await assert.rejects(()=>summarizeLongText('字'.repeat(20001),'',async()=>{if(++calls===2)throw new Error('模型连接失败');return '首段';}),/模型连接失败/);assert.equal(calls,2);
 await assert.rejects(()=>summarizeLongText('字'.repeat(100001),'',async()=>{calls++;return '不该调用';}),/100,000/);assert.equal(calls,2);
 await assert.rejects(()=>summarizeLongText('字'.repeat(12001),'',async()=>''),/空内容/);
});
test('the entire multi-call summary shares one elapsed-time budget',async()=>{
 let now=0,calls=0;await assert.rejects(()=>summarizeLongText('字'.repeat(12001),'',async()=>{calls++;now+=30;return '摘要';},{clock:()=>now,budgetMs:50}),/超时/);assert.equal(calls,2);
});

test('changed source stops before another segment consumes a model call',async()=>{
 let current=true,calls=0;await assert.rejects(()=>summarizeLongText('字'.repeat(12001),'',async()=>{calls++;current=false;return '旧段摘要';},{assertCurrent:()=>{if(!current)throw new Error('来源已更新');}}),/来源已更新/);assert.equal(calls,1);
});
