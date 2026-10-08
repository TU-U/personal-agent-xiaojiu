import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,readdir,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
const root=await mkdtemp(path.join(os.tmpdir(),'library-members-')),source=path.join(root,'source');
await mkdir(source);
Object.assign(process.env,{DATA_DIR:path.join(root,'data'),COMPUTER_FILES_ROOT:source,SEED_DEMO:'false',WORKER_MODE:'true'});
const {db,all,get,save,remove,getSetting}=await import('../server/store.mjs');
const {scanLibrary,libraryKeywordSearch,libraryRoot}=await import('../server/domain/library/library.mjs');
const {migrateLegacyDuplicates}=await import('../server/domain/library/library-members.mjs');
const digest=text=>createHash('sha256').update(text).digest('hex');
async function scan(){await scanLibrary('');for(let i=0;i<300;i++){const job=getSetting('libraryJob');if(job.status==='failed')throw new Error(job.error);if(job.status==='done')return;await new Promise(r=>setTimeout(r,10));}throw new Error('scan timeout');}
test('same bytes preserve independent project members, shared copy survives source archive/deletion and repeated scans',async()=>{
 const text='来源共同正文\n'.repeat(1600)+'长文尾部标记';
 await writeFile(path.join(source,'a.md'),text);await writeFile(path.join(source,'b.md'),text);
 await scan();let members=all('libraryFile');assert.equal(members.length,2);assert.ok(members.every(f=>f.status==='ready'));
 assert.equal(new Set(members.map(f=>f.copyName)).size,1);assert.equal(new Set(members.map(f=>f.canonicalId)).size,1);assert.equal((await readdir(libraryRoot)).length,1);
 const pa=save('project',{name:'同名'}),pb=save('project',{name:'同名'});
 members=members.map((f,i)=>save('libraryFile',{...f,projectId:i?pb.id:pa.id},f.revision));
 for(const f of members){const hits=libraryKeywordSearch('长文尾部标记',{projectId:f.projectId});assert.ok(hits.length);assert.ok(hits.every(h=>h.id===f.id&&h.revision===f.revision));assert.ok(hits.some(h=>h.start>8000&&h.text.includes('长文尾部标记')));}
 const first=members[0],second=members[1];save('libraryFile',{...first,status:'archived'},first.revision);
 assert.equal(libraryKeywordSearch('长文尾部标记',{projectId:pa.id}).length,0);
 assert.equal(libraryKeywordSearch('长文尾部标记',{projectId:pb.id})[0].id,second.id);
 remove(first.id,'libraryFile',get(first.id,'libraryFile').revision);
 assert.equal(await readFile(path.join(libraryRoot,second.copyName),'utf8'),text);
 assert.equal(digest(await readFile(path.join(source,second.sourcePath))),digest(text));
 await rm(path.join(source,first.sourcePath));await scan();assert.equal(all('libraryFile').length,1);
 await writeFile(path.join(source,second.sourcePath),'修订版本新正文');await scan();
 const versions=all('libraryFile');assert.equal(versions.length,2);assert.equal(get(second.id,'libraryFile').status,'archived');assert.equal(versions.find(f=>f.status==='ready').content,'修订版本新正文');assert.equal(versions.find(f=>f.status==='ready').projectId,pb.id);assert.equal(versions.find(f=>f.status==='ready').previousFileId,second.id);
 await scan();assert.equal(all('libraryFile').length,2);assert.equal(await readFile(path.join(libraryRoot,second.copyName),'utf8'),text);
});
test('an existing unparsed copy does not prevent a new parse attempt',async()=>{
 const text='需要重新解析的正文',hash=digest(text),copyName=hash+'.md';
 await writeFile(path.join(libraryRoot,copyName),text);await writeFile(path.join(source,'retry.md'),text);
 save('libraryFile',{title:'尚未解析',sourcePath:'missing.md',hash,copyName,content:'',status:'copied',error:'旧解析失败'});
 await scan();const current=all('libraryFile').find(f=>f.sourcePath==='retry.md');
 assert.equal(current.status,'ready');assert.equal(current.content,text);assert.equal(current.error,'');
});
test('unreadable text retains a byte-identical copy but is not published as searchable body',async()=>{
 const bytes=Buffer.from([0x41,0,0x42]);await writeFile(path.join(source,'binary.txt'),bytes);await scan();
 const file=all('libraryFile').find(f=>f.sourcePath==='binary.txt');assert.equal(file.status,'copied');assert.equal(file.parse.state,'failed');assert.equal(file.content,'');assert.match(file.error,/二进制/);
 assert.deepEqual(await readFile(path.join(libraryRoot,file.copyName)),bytes);assert.deepEqual(await readFile(path.join(source,'binary.txt')),bytes);
 assert.ok(!libraryKeywordSearch('binary').some(hit=>hit.id===file.id));
});
test('legacy duplicate migration uses archived donor without changing member project; missing or cyclic donors stay explicit',async()=>{
 const text='迁移正文',hash=digest(text),copyName=hash+'.md';await writeFile(path.join(libraryRoot,copyName),text);
 const donor=save('libraryFile',{title:'旧来源',sourcePath:'old.md',status:'archived',hash,copyName,content:text,chunks:1,projectId:'old-project'});
 const member=save('libraryFile',{title:'项目来源',sourcePath:'new.md',status:'duplicate',hash,duplicateOf:donor.id,projectId:'new-project'});
 const result=await migrateLegacyDuplicates();assert.equal(result.repaired,1);
 const repaired=get(member.id,'libraryFile');assert.equal(repaired.status,'ready');assert.equal(repaired.projectId,'new-project');assert.equal(repaired.content,text);assert.equal(repaired.duplicateOf,null);
 remove(donor.id,'libraryFile',donor.revision);assert.equal(await readFile(path.join(libraryRoot,repaired.copyName),'utf8'),text);
 await migrateLegacyDuplicates();assert.equal(get(member.id,'libraryFile').revision,repaired.revision);
 const broken=save('libraryFile',{id:'cycle',title:'丢失来源',status:'duplicate',hash:'missing',duplicateOf:'cycle'});
 assert.equal((await migrateLegacyDuplicates()).unresolved,1);const failed=get(broken.id,'libraryFile');assert.equal(failed.status,'duplicate');assert.match(failed.error,/副本不存在/);
 await migrateLegacyDuplicates();assert.equal(get(broken.id,'libraryFile').revision,failed.revision);
});
after(async()=>{db.close();await rm(root,{recursive:true,force:true});});
