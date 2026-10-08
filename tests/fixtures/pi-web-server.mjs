// Test-only entry point: real Pi SDK, HTTP API and SQLite; no paid requests.
import path from 'node:path';
if(process.env.SHIGUANG_E2E_PI!=='1'||!path.resolve(process.env.DATA_DIR||'').startsWith('/tmp/shiguang-e2e-'))throw new Error('Requires isolated browser fixture');
process.env.FILE_WORKER_ENABLED='false';process.env.WORKER_MODE='true';process.env.SEED_DEMO='false';
const {setSetting,save}=await import('../../server/store.mjs');
setSetting('provider',{baseUrl:'https://api.deepseek.com',model:'deepseek-flash',apiKey:'browser-fixture'});
const file=save('libraryFile',{id:'871d199b-e2b3-4982-bcf0-df9b54215801',title:'PersonalAgent 架构资料',content:'PersonalAgent 先接入 Pi 工具循环，再完善网页交互。',status:'ready'});
const original=globalThis.fetch;
globalThis.fetch=async(url,options)=>{
 if(!String(url).startsWith('https://api.deepseek.com/'))return original(url,options);
 const payload=JSON.parse(options.body),messages=payload.messages;
 let delta,finish_reason;
 if(messages.some(m=>typeof m.content==='string'&&m.content.includes('谨慎的长期记忆提炼器'))){delta={content:'{"items":[{"content":"用户持续开发 PersonalAgent"}]}'};finish_reason='stop';}
 else if(messages.some(m=>m.role==='tool')){delta={content:'根据这份项目资料，建议先接入 Pi 工具循环，再完善网页交互。[1] 这属于下一步计划，需要你确认后再实施。'};finish_reason='stop';}
 else{delta={tool_calls:[{index:0,id:'fixture-read',type:'function',function:{name:'read_source',arguments:JSON.stringify({id:file.id,kind:'libraryFile',start:0,length:800})}}]};finish_reason='tool_calls';}
 return new Response('data: '+JSON.stringify({id:'fixture',model:'deepseek-flash',choices:[{index:0,delta,finish_reason}],usage:{prompt_tokens:100,completion_tokens:40,total_tokens:140}})+'\n\ndata: [DONE]\n\n',{headers:{'content-type':'text/event-stream'}});
};
await import('../../server/index.mjs');
