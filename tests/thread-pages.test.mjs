import {test} from 'node:test';import assert from 'node:assert/strict';import {mkdtemp,rm} from 'node:fs/promises';import path from 'node:path';import os from 'node:os';import express from 'express';
test('directory and history expose old topics with checked cursors and legacy identities',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'shiguang-thread-pages-'));process.env.DATA_DIR=dir;process.env.SEED_DEMO='false';process.env.WORKER_MODE='true';const {save,db,get}=await import('../server/store.mjs');const {installSourceThreads,markThreadDeleted,threadUnavailable}=await import('../server/agent/source-threads.mjs');
 const old=save('conversation',{query:'旧独立话题',body:'原文不变',createdAt:'2020-01-01T00:00:00Z'});
 const long=save('thread',{title:'长话题',status:'active'});for(let i=0;i<205;i++)save('conversation',{threadId:long.id,threadTitle:'长话题',query:'轮次'+i,body:'历史回答'+i,createdAt:new Date(1700000000000+i*1000).toISOString()});
 for(let i=0;i<33;i++)save('thread',{title:'空话题'+i,status:'active'});
 const app=express();app.use(express.json());installSourceThreads(app);app.use((e,req,res,next)=>res.status(e.status||500).json({error:e.message}));const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const base=`http://127.0.0.1:${server.address().port}/api`;
 const read=async url=>{const r=await fetch(base+url);return {status:r.status,data:await r.json()};};
 try{
  const first=await read('/threads?limit=30');assert.equal(first.data.total,35);assert.equal(first.data.items.length,30);const rest=await read('/threads?limit=30&cursor='+first.data.nextCursor);assert.equal(rest.data.items.length,5);assert.ok(rest.data.items.some(t=>t.threadId===old.id));assert.equal(rest.data.nextCursor,null);
  const seen=[];let cursor='';do{const r=await read('/threads/'+long.id+'/turns?limit=30'+(cursor?'&cursor='+cursor:''));assert.equal(r.status,200);seen.push(...r.data.items);cursor=r.data.nextCursor;}while(cursor);assert.equal(seen.length,205);assert.equal(new Set(seen.map(t=>t.id)).size,205);assert.equal(seen.at(-1).query,'轮次0');
  const history=await read('/threads/'+long.id+'/turns?limit=30');assert.equal((await read('/threads?cursor='+history.data.nextCursor)).status,400);
  const entity=get(seen[0].id,'conversation');save('conversation',{...entity,body:'改变历史'},entity.revision);assert.equal((await read('/threads/'+long.id+'/turns?cursor='+history.data.nextCursor)).status,409);
  save('thread',{title:'新增话题',status:'active'});assert.equal((await read('/threads?cursor='+first.data.nextCursor)).status,409);assert.equal((await read('/threads?cursor='+Buffer.from('null').toString('base64url'))).status,400);assert.equal((await read('/threads?limit=0')).status,400);
  markThreadDeleted(old.id);assert.equal(threadUnavailable(old.id),true);assert.equal(get(old.id,'conversation').body,'原文不变');assert.equal((await read('/threads/'+old.id+'/turns')).status,410);
 }finally{await new Promise(r=>server.close(r));db.close();await rm(dir,{recursive:true,force:true});}
});
