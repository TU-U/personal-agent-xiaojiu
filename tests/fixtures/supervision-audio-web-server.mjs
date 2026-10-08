// Playwright-only data setup; the application uses its real API and SQLite.
// This fixture starts from a stored transcript, not a live ASR result.
if(!process.env.DATA_DIR)throw new Error('An isolated DATA_DIR is required');
process.env.SEED_DEMO='false';process.env.FILE_WORKER_ENABLED='false';
const {save,DATA_DIR}=await import('../../server/store.mjs');
// A real, silent four-second WAV keeps the fixture faithful to an audio record.
// The stored transcript remains synthetic; this fixture never invokes ASR.
const {writeFileSync}=await import('node:fs');
const {join}=await import('node:path');
const wav=Buffer.alloc(44+16000*2*4);
wav.write('RIFF',0);wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);
wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);
wav.writeUInt32LE(16000,24);wav.writeUInt32LE(32000,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);
wav.write('data',36);wav.writeUInt32LE(wav.length-44,40);
writeFileSync(join(DATA_DIR,'uploads','stored-transcript-fixture.wav'),wav);
save('note',{id:'supervision-audio-fixture',title:'录音学习心得',type:'audio',status:'ready',content:'',tags:[],attachments:[{id:'stored-transcript-audio',key:'stored-transcript-fixture.wav',name:'stored-transcript-fixture.wav',mime:'audio/wav',size:wav.length}],transcript:{transcriptRevision:1,durationMs:4000,language:'zh',edited:false,diarization:{state:'completed'},segments:[{startMs:0,endMs:4000,speakerId:'speaker_1',text:'三条心得：原子性、一致性、隔离性。实践例子：回滚失败的转账。'}]}});
await import('../../server/index.mjs');
