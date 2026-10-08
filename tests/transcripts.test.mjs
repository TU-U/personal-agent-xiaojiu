import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateTranscript,transcriptText} from '../server/ai/transcripts.mjs';
const result=()=>({durationMs:5000,language:'zh',model:'local/test',diarization:{state:'completed'},segments:[{startMs:0,endMs:1000,speakerId:'speaker_1',text:'保留原始内容。'},{startMs:1000,endMs:2000,speakerId:'speaker_2',text:'Keep the English words.'}]});
test('transcript contract preserves text and allows honest partial diarization failure',()=>{
 const full=result();assert.deepEqual(validateTranscript(full),full);assert.match(transcriptText(full),/Keep the English/);
 const partial=result();partial.diarization={state:'failed',error:'分离模型不可用'};partial.segments.forEach(s=>s.speakerId=null);
 assert.deepEqual(validateTranscript(partial),partial);
});
test('invalid timelines, invented speakers, unknown fields and empty transcripts are rejected',()=>{
 for(const mutate of [
  r=>r.segments[0].endMs=6000,
  r=>r.segments[0].endMs=0,
  r=>r.segments[1].startMs=-1,
  r=>r.segments.reverse(),
  r=>r.segments[0].speakerId='真实用户姓名',
  r=>r.diarization={state:'failed'},
  r=>r.diarization={state:'failed',error:'失败'},
  r=>r.confirmed=true,
  r=>r.segments=[],
 ]){const input=result();mutate(input);assert.throws(()=>validateTranscript(input));}
});
