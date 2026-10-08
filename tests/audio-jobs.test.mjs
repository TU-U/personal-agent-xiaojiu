import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
test('audio commits preserve originals, reject changed sources and expose partial results',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'shiguang-audio-'));process.env.DATA_DIR=dir;process.env.SEED_DEMO='false';process.env.WORKER_MODE='true';
 const {db,save,get}=await import('../server/store.mjs');const {fileJobs}=await import('../server/jobs/file-jobs.mjs');const {enqueueAudio,audioHandlers,contentForAudioSummary,preserveTranscriptVersion}=await import('../server/jobs/audio-jobs.mjs');
 try{
  const note=save('note',{title:'录音',content:'用户附记',summary:'已有归纳',summaryMode:'ai',attachments:[{id:'audio',key:'original.wav',name:'original.wav',mime:'audio/wav'}]});
  const job=enqueueAudio(note,{language:'zh'});fileJobs.claim(job.id,'worker',60000);
  const result={durationMs:1000,language:'zh',model:'test',diarization:{state:'failed',error:'分离失败'},segments:[{startMs:0,endMs:900,speakerId:null,text:'转写文字'}]};
  assert.equal(fileJobs.finish(job.id,'worker',result,audioHandlers['transcribe-audio'].commit),true);
  const current=get(note.id,'note');assert.equal(current.content,'用户附记');assert.deepEqual(current.attachments,note.attachments);assert.equal(current.status,'partial');assert.equal(current.summaryStale,true);assert.equal(current.transcript.transcriptRevision,1);assert.equal(current.transcriptOriginal.segments[0].text,'转写文字');assert.match(contentForAudioSummary(current).content,/用户附记[\s\S]*说话人待核对[\s\S]*转写文字/);
  const second=enqueueAudio(current);fileJobs.claim(second.id,'new',60000);save('note',{...current,content:'用户修改'},current.revision);
  assert.throws(()=>fileJobs.finish(second.id,'new',result,audioHandlers['transcribe-audio'].commit),/已更新/);assert.equal(get(note.id,'note').content,'用户修改');
  const beforeEdit=get(note.id,'note');preserveTranscriptVersion(beforeEdit);const edited=save('note',{...beforeEdit,transcript:{...beforeEdit.transcript,transcriptRevision:2,edited:true,segments:[{...beforeEdit.transcript.segments[0],text:'人工纠正后的文字'}]}},beforeEdit.revision);
  const third=enqueueAudio(edited);fileJobs.claim(third.id,'third',60000);assert.equal(fileJobs.finish(third.id,'third',result,audioHandlers['transcribe-audio'].commit),true);
  const archived=get(note.id+':transcript:2','audioTranscriptVersion');assert.equal(archived.transcript.segments[0].text,'人工纠正后的文字');assert.equal(archived.original.segments[0].text,'转写文字');assert.equal(get(note.id,'note').transcript.transcriptRevision,3);assert.equal(get(note.id+':transcript:1','audioTranscriptVersion').transcript.transcriptRevision,1);
 }finally{db.close();await rm(dir,{recursive:true,force:true});}
});
