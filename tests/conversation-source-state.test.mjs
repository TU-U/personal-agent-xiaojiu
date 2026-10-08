import {test} from 'node:test';
import assert from 'node:assert/strict';
import {conversationSourceIssue} from '../server/agent/conversation-source-state.mjs';
test('source availability accepts actual audio transcripts and rejects unusable library text',()=>{
 const note={status:'needs_text',summaryMode:'rule',content:'',summary:'处理中'};
 assert.match(conversationSourceIssue(note,'note'),/转写/);
 assert.equal(conversationSourceIssue({...note,transcript:{segments:[{startMs:0,endMs:1000,text:'会议讨论内容',speakerId:null}]}},'note'),'');
 assert.match(conversationSourceIssue({...note,transcript:{segments:[{text:' '}]}},'note'),/转写/);
 assert.match(conversationSourceIssue({status:'failed',content:'残留解析内容'},'libraryFile'),/不可用/);
 assert.equal(conversationSourceIssue({status:'ready',content:'有效正文'},'libraryFile'),'');
 assert.match(conversationSourceIssue(null,'note'),/已删除/);
});
