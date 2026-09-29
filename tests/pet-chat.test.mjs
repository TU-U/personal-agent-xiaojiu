import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';import path from 'node:path';
const root=await mkdtemp(path.join(os.tmpdir(),'pet-chat-'));Object.assign(process.env,{DATA_DIR:root,SEED_DEMO:'false',WORKER_MODE:'true'});
const {db,save,get}=await import('../server/store.mjs');const {petChat}=await import('../server/pet-chat.mjs');
const base={content:'用户喜欢安静的地方',title:'安静偏好',status:'active',scopeKind:'global',scope:'通用'};
const options={available:()=>true,modelAvailable:()=>true,log:()=>{}};
test('only relevant current general memory is provided; scope, status, source and version are rechecked after retrieval',async()=>{
 const good=save('memory',base),unrelated=save('memory',{...base,content:'未命中的事实'}),paused=save('memory',{...base,status:'paused'}),candidate=save('memory',{...base,status:'candidate'}),project=save('memory',{...base,scopeKind:'project',scopeId:'p'}),thread=save('memory',{...base,scopeKind:'thread',scopeId:'t'}),purpose=save('memory',{...base,scope:'周报'}),stale=save('memory',base),note=save('note',{content:'旧来源'}),invalid=save('memory',{...base,sourceId:note.id,sourceRevision:note.revision});
 save('memory',{...stale,content:'已变'},stale.revision);save('note',{...note,content:'新来源'},note.revision);
 let context;
 const result=await petChat({message:'想找个安静的角落',history:[]},{...options,search:async(query,scope)=>{assert.equal(query,'想找个安静的角落');assert.deepEqual(scope,{kind:'memory',limit:6});return [good,good,paused,candidate,project,thread,purpose,stale,invalid].map(x=>({...x,kind:'memory'}));},generate:async(_system,prompt,_unused,settings)=>{context=JSON.parse(prompt);assert.equal(settings.requireComplete,true);return '一起安静待会儿吧 🐾';}});
 assert.deepEqual(context.memories,[{id:good.id,content:good.content}]);assert.equal(JSON.stringify(context).includes(unrelated.id),false);assert.equal(result.memoryUsage.length,1);assert.equal(result.memoryUsage[0].revision,good.revision);assert.equal(get(good.id,'memory').revision,good.revision);
});
test('pausing memory or changing its source during generation rejects the old reply',async()=>{
 for(const sourceChange of [false,true]){
  const note=save('note',{content:'事实'}),memory=save('memory',{...base,sourceId:note.id,sourceRevision:note.revision});
  await assert.rejects(petChat({message:'想安静一下'},{...options,search:async()=>[{...memory,kind:'memory'}],generate:async()=>{if(sourceChange)save('note',{...note,content:'已变化'},note.revision);else save('memory',{...memory,status:'paused'},memory.revision);return '旧事实回复';}}),error=>error.status===409);
 }
});
test('retrieval failure is visible, supplies no memory and does not block ordinary emotional conversation',async()=>{
 const events=[];let context;
 const result=await petChat({message:'今天累了'},{...options,log:event=>events.push(event),search:async()=>{throw new Error('offline');},generate:async(_system,prompt)=>{context=JSON.parse(prompt);return '先休息一会儿吧 🐾';}});
 assert.deepEqual(context.memories,[]);assert.match(result.memoryNotice,/检索失败/);assert.equal(result.memoryUsage.length,0);assert.equal(events[0].stage,'pet-memory-error');assert.equal(events.at(-1).stage,'pet-context-accepted');
});
test('invalid input and empty/incomplete-length output never become a fake successful reply',async()=>{
 const opts={...options,available:()=>false,search:async()=>assert.fail('unavailable search must not run'),generate:async()=>''};
 await assert.rejects(petChat({message:'你好',priority:'high'},opts));
 await assert.rejects(petChat({message:'你好'},opts),error=>error.status===502);
 await assert.rejects(petChat({message:'你好'},{...opts,generate:async()=>'字'.repeat(601)}),error=>error.status===502);
 const result=await petChat({message:'继续',history:[{role:'assistant',content:'字'.repeat(550)}]},{...opts,generate:async()=> '我在听 🐾'});
 assert.match(result.memoryNotice,/尚未连接/);assert.equal(result.reply,'我在听 🐾');
});
after(async()=>{db.close();await rm(root,{recursive:true,force:true});});
