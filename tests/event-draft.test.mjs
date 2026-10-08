import {test} from 'node:test';import assert from 'node:assert/strict';
import {parseEventDraft} from '../server/domain/events/event-draft.mjs';
const base={title:'草稿',summary:'摘要',tags:['来源'],project:'项目',relatedEventIds:[]};
const options={eventId:'self',allowedIds:new Set(['alive','gone',...Array.from({length:12},(_,i)=>'id-'+i)]),exists:id=>id!=='gone'};
test('AI business fields are strict and never silently truncated or defaulted',()=>{
 for(const value of [null,[],{}, {...base,title:''},{...base,summary:'字'.repeat(3001)},{...base,tags:Array(13).fill('标签')},{...base,priority:'high'},{...base,relatedEventIds:'alive'}])assert.throws(()=>parseEventDraft(JSON.stringify(value),options),e=>e.status===502);
 assert.deepEqual(parseEventDraft(JSON.stringify(base),options),{...base,removedSuggestions:[]});
});
test('every removed relation suggestion has a reason; valid IDs survive in order',()=>{
 const output=parseEventDraft(JSON.stringify({...base,relatedEventIds:['self','alive','alive','gone','unknown',42,...Array.from({length:12},(_,i)=>'id-'+i)]}),options);
 assert.equal(output.relatedEventIds.length,10);assert.equal(output.relatedEventIds[0],'alive');assert.equal(output.removedSuggestions.length,8);
 assert.deepEqual(new Set(output.removedSuggestions.map(x=>x.reason)),new Set(['不能关联自身','重复建议','要事已删除或失效','不在本次候选范围','不是有效要事编号','超出最多10条关联限制']));
});
test('unsaved event drafts are accepted without a saved source and preserve current edits',async()=>{
 const {eventDraftRequestSchema,eventDraftTextInput}=await import('../server/domain/events/event-draft.mjs');
 const draft={title:'整理我的想法',summary:'先验证需求，不购买设备',tags:['idea'],project:'PersonalAgent'};
 const request=eventDraftRequestSchema.parse({draft});
 const direct=eventDraftTextInput(request,null,null);assert.equal(direct.hasText,true);assert.equal(direct.recordTitle,draft.title);assert.match(direct.recordText,/先验证需求，不购买设备/);assert.equal(direct.recordProject,draft.project);
 const source={title:'旧标题',content:'原始记录',tags:['旧标签'],project:'旧项目',transcript:{segments:[{startMs:0,endMs:1000,speakerId:null,text:'录音补充约束'}]}};
 const edited=eventDraftTextInput(request,source,{summary:'旧摘要'});assert.equal(edited.recordTitle,draft.title);assert.equal(edited.recordTags,'idea');assert.match(edited.recordText,/原始记录/);assert.match(edited.recordText,/录音补充约束/);assert.match(edited.recordText,/不擅自恢复用户删去的内容/);
 assert.equal(eventDraftTextInput({},source,null).recordTitle,'旧标题');
 for(const body of [{draft:{...draft,title:'',summary:'  '}},{draft:{...draft,priority:'high'}},{draft:{...draft,summary:'字'.repeat(3001)}}])assert.equal(eventDraftRequestSchema.safeParse(body).success,false);
});
