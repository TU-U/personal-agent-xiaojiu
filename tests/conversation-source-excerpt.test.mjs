import {test} from 'node:test';
import assert from 'node:assert/strict';
import {conversationSourceExcerpt} from '../server/agent/conversation-source-excerpt.mjs';
test('explicit chat reference selects late relevant text and retains exact immutable passage positions',()=>{
 const content=('日常背景。\n').repeat(2000)+'\n星桥项目的备份策略是每周六校验快照。\n'+('附录。\n').repeat(1000);
 const entity={content},result=conversationSourceExcerpt(entity,'note','星桥项目的备份策略是什么？');
 assert.match(result.quote,/每周六校验快照/);assert.equal(result.truncated,true);assert.ok(result.excerpts.length<=3);
 assert.ok(result.excerpts.reduce((n,e)=>n+e.quote.length,0)<=3000);
 for(const e of result.excerpts)assert.equal(e.quote,content.slice(e.start,e.end));
 entity.content='更新原文';assert.match(result.quote,/每周六校验快照/);
 const short=conversationSourceExcerpt({content:' 原始空格\n第二行 '},'libraryFile','内容');assert.equal(short.quote,' 原始空格\n第二行 ');assert.equal(short.truncated,false);
 const preview=conversationSourceExcerpt({content},'note','完全不同的问题');assert.ok(preview.excerpts.some(e=>e.start>content.length/2));assert.ok(preview.excerpts.every(e=>e.selectionMethod==='distributed_preview'));
});
