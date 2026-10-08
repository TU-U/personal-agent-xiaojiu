import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const dir=await mkdtemp(join(tmpdir(),'audio-capability-'));
Object.assign(process.env,{DATA_DIR:dir,SEED_DEMO:'false',WORKER_MODE:'true'});
const {db}=await import('../server/store.mjs');
const {probeLocalAudio}=await import('../server/ai/local-audio-probe.mjs');
const {recentAiEvents}=await import('../server/core/ai-log.mjs');
after(async()=>{db.close();await rm(dir,{recursive:true,force:true});});
test('audio probes independently dispatch capabilities, reject incomplete results and log correlated outcomes',async()=>{
 const config={available:true,sampleAvailable:true,python:'/local/python',model:'small',asrModel:'small'};
 let calls=0;
 const execute=async(python,args)=>{calls++;assert.equal(python,config.python);assert.equal(args[2],'--model');assert.equal(args[3],'small');return JSON.stringify({ok:true,detail:args[1]==='asr'?{response:'Public sample speech.',notice:'Not a quality guarantee'}:{segments:3,speakers:2,notice:'Check speaker accuracy'}});};
 const asr=await probeLocalAudio('asr',{config,execute}),diarization=await probeLocalAudio('diarization',{config,execute});
 assert.equal(asr.response,'Public sample speech.');assert.equal(diarization.speakers,2);assert.notEqual(asr.callId,diarization.callId);assert.equal(calls,2);
 await assert.rejects(probeLocalAudio('asr',{config:{...config,sampleAvailable:false},execute}),/缺少本地公开测试音频/);assert.equal(calls,2);
 await assert.rejects(probeLocalAudio('diarization',{config,execute:async()=>JSON.stringify({ok:false,errorType:'ImportError'})}),/推理未成功/);
 await assert.rejects(probeLocalAudio('asr',{config,execute:async()=>JSON.stringify({ok:true,detail:{response:' ',notice:''}})}),/结构无效/);
 const events=recentAiEvents();assert.equal(events.filter(e=>e.callId===asr.callId).length,2);assert.ok(events.some(e=>e.stage==='audio-capability-error'&&e.capability==='diarization'));assert.ok(events.some(e=>e.stage==='audio-capability-response'&&e.capability==='asr'));
});

test('invalid ASR configuration is isolated and late probe results cannot certify a changed configuration',async()=>{
 const {capabilityList,probeCapability}=await import('../server/core/capabilities.mjs');
 const {getSetting}=await import('../server/store.mjs');
 const original=process.env.ASR_MODEL;
 try{
  const before=capabilityList().find(item=>item.id==='diarization');
  process.env.ASR_MODEL='invalid-model';
  const listed=capabilityList();assert.equal(listed.length,8);assert.equal(listed.find(item=>item.id==='asr').configured,false);assert.match(listed.find(item=>item.id==='asr').notice,/ASR_MODEL配置无效/);
  assert.deepEqual(listed.find(item=>item.id==='diarization'),before);
  const invalid=await probeCapability('asr');assert.equal(invalid.ok,false);assert.match(invalid.error,/ASR_MODEL配置无效/);
 }finally{if(original===undefined)delete process.env.ASR_MODEL;else process.env.ASR_MODEL=original;}
 let config={available:true,model:'small'},release,started;
 const gate=new Promise(resolve=>release=resolve),ready=new Promise(resolve=>started=resolve);
 const prior=getSetting('capabilityTest:asr');
 const pending=probeCapability('asr',{readConfig:()=>config,audioProbe:async()=>{started();await gate;return {response:'old configuration result'};}});
 await ready;config={available:true,model:'large-v3-turbo'};release();
 await assert.rejects(pending,error=>error.status===409);assert.deepEqual(getSetting('capabilityTest:asr'),prior);
});
