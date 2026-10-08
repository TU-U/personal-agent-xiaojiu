import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,copyFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

test('file parser refuses edited and deleted sources, and cancellation fences its result',async()=>{
 const directory=await mkdtemp(path.join(os.tmpdir(),'shiguang-file-jobs-'));
 process.env.DATA_DIR=directory;process.env.SEED_DEMO='false';process.env.WORKER_MODE='true';
 const {db,save,get,remove,transaction}=await import('../server/store.mjs');
 const {fileJobs,enqueueFileParse,fileHandlers}=await import('../server/jobs/file-jobs.mjs');
 try{
  await copyFile('tests/fixtures/sample.pdf',path.join(directory,'uploads','fixture.pdf'));
  const note=save('note',{title:'原件',content:'',tags:[],attachments:[{id:'attachment',key:'fixture.pdf',name:'sample.pdf'}]});
  const job=enqueueFileParse(note);fileJobs.claim(job.id,'worker',60000);
  const result=await fileHandlers['parse-file'].run(job);assert.match(result.content,/支付接口/);
  const edited=transaction(()=>save('note',{...note,content:'用户手动编写的正文'},note.revision));
  assert.throws(()=>fileJobs.finish(job.id,'worker',result,fileHandlers['parse-file'].commit),/旧解析结果未覆盖/);
  assert.equal(get(note.id,'note').content,'用户手动编写的正文');
  fileJobs.fail(job.id,'worker','版本已更新');
  const second=enqueueFileParse(edited);fileJobs.claim(second.id,'second',60000);fileJobs.cancel(second.id);
  assert.equal(fileJobs.finish(second.id,'second',result,fileHandlers['parse-file'].commit),false);
  assert.equal(get(note.id,'note').content,'用户手动编写的正文');
  transaction(()=>remove(edited.id,'note',edited.revision));
  await assert.rejects(()=>fileHandlers['parse-file'].run(second),/旧解析结果未覆盖/);
  assert.equal(get(note.id,'note'),null);
 }finally{db.close();await rm(directory,{recursive:true,force:true});}
});
