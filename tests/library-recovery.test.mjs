import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm,stat} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
const root=await mkdtemp(path.join(os.tmpdir(),'library-recovery-')),source=path.join(root,'source');await mkdir(source);
Object.assign(process.env,{DATA_DIR:path.join(root,'data'),COMPUTER_FILES_ROOT:source,SEED_DEMO:'false',WORKER_MODE:'true'});
const {db,getSetting,setSetting,save,all}=await import('../server/store.mjs');
const {controlledLibraryJob,scannedDirectoryJob}=await import('../server/domain/library/library-job-state.mjs');
const {runLibrary,libraryControl,scanLibrary}=await import('../server/domain/library/library.mjs');
async function finished(){for(let i=0;i<300;i++){const job=getSetting('libraryJob');if(job.status==='done')return;if(job.status==='failed')throw new Error(job.error);await new Promise(r=>setTimeout(r,10));}throw new Error('recovery timeout');}
test('pause is idempotent; directory checkpoint preserves pause and resumes the correct phase',()=>{
 const paused=controlledLibraryJob({status:'scanning',queue:['one'],path:'original'},'pause');
 assert.deepEqual(controlledLibraryJob(paused,'pause'),paused);
 const remaining=scannedDirectoryJob(paused,['two']);assert.equal(remaining.status,'paused');assert.equal(controlledLibraryJob(remaining,'resume').status,'scanning');
 const final=scannedDirectoryJob(paused,[]);assert.equal(final.status,'paused');assert.equal(final.resumeStatus,'copying');assert.equal(controlledLibraryJob(final,'resume').status,'copying');
 assert.equal(controlledLibraryJob({status:'paused',resumeStatus:'scanning',queue:[]},'resume').status,'copying');
 assert.throws(()=>controlledLibraryJob({status:'done'},'resume'),e=>e.status===409);
});
test('persisted paused final directory and empty scanning checkpoint recover and copy queued files once',async()=>{
 await writeFile(path.join(source,'one.md'),'恢复正文');save('libraryFile',{title:'one.md',sourcePath:'one.md',status:'queued',content:''});
 setSetting('libraryJob',{status:'paused',resumeStatus:'scanning',queue:[],path:''});
 await assert.rejects(scanLibrary(''),e=>e.status===409);
 libraryControl('pause');libraryControl('resume');await finished();assert.equal(all('libraryFile').length,1);assert.equal(all('libraryFile')[0].status,'ready');
 setSetting('libraryJob',{status:'scanning',queue:[],path:''});await runLibrary();assert.equal(getSetting('libraryJob').status,'done');assert.equal(all('libraryFile').length,1);
});
test('failed directory resumes scanning the preserved queue rather than skipping straight to copying',async()=>{
 setSetting('libraryJob',{status:'scanning',queue:['temporarily-missing'],path:''});await runLibrary();
 assert.equal(getSetting('libraryJob').status,'failed');assert.equal(getSetting('libraryJob').resumeStatus,'scanning');assert.deepEqual(getSetting('libraryJob').queue,['temporarily-missing']);
 await mkdir(path.join(source,'temporarily-missing'));await writeFile(path.join(source,'temporarily-missing','two.md'),'目录恢复后应发现此文档');
 libraryControl('resume');await finished();assert.ok(all('libraryFile').some(f=>f.sourcePath==='temporarily-missing/two.md'&&f.status==='ready'));
});
test('file stat failure is visible and preserves the directory checkpoint for retry',async()=>{
 await mkdir(path.join(source,'stat-failure'));
 await writeFile(path.join(source,'stat-failure','a.md'),'已经发现');
 await writeFile(path.join(source,'stat-failure','b.md'),'稍后重试');
 setSetting('libraryJob',{status:'scanning',queue:['stat-failure'],path:'stat-failure'});
 await runLibrary({statFile:async target=>{if(target.endsWith('b.md'))throw Object.assign(new Error('denied'),{code:'EACCES'});return stat(target);}});
 const failed=getSetting('libraryJob');assert.equal(failed.status,'failed');assert.equal(failed.resumeStatus,'scanning');assert.deepEqual(failed.queue,['stat-failure']);assert.match(failed.error,/stat-failure\/b.md.*EACCES/);
 assert.ok(!all('libraryFile').some(f=>f.sourcePath==='stat-failure/b.md'));
 libraryControl('resume');await finished();
 const files=all('libraryFile').filter(f=>f.sourcePath.startsWith('stat-failure/'));
 assert.equal(files.length,2);assert.equal(new Set(files.map(f=>f.sourcePath)).size,2);assert.ok(files.every(f=>f.status==='ready'));
 assert.equal(getSetting('libraryJob').error,'');
});
test('pause during live scanning keeps unvisited directories; pause during copying finishes only the in-flight file',async()=>{
 await mkdir(path.join(source,'live','a'),{recursive:true});await mkdir(path.join(source,'live','b'),{recursive:true});
 await writeFile(path.join(source,'live','a','a.md'),'a正文');await writeFile(path.join(source,'live','b','b.md'),'b正文');
 await scanLibrary('live');libraryControl('pause');
 for(let i=0;i<300&&getSetting('libraryJob').queue?.[0]==='live';i++)await new Promise(r=>setTimeout(r,10));
 const paused=getSetting('libraryJob');assert.equal(paused.status,'paused');assert.equal(paused.queue.length,2);assert.ok(paused.queue.every(p=>p.startsWith('live/')));
 assert.equal(all('libraryFile').filter(f=>f.sourcePath.startsWith('live/')).length,0);
 libraryControl('pause');libraryControl('resume');await finished();assert.equal(all('libraryFile').filter(f=>f.sourcePath.startsWith('live/')&&f.status==='ready').length,2);
 for(const name of ['copy-a.md','copy-b.md']){await writeFile(path.join(source,name),name);save('libraryFile',{title:name,sourcePath:name,status:'queued',content:''});}
 setSetting('libraryJob',{status:'copying',queue:[]});const running=runLibrary();libraryControl('pause');await running;
 const copies=all('libraryFile').filter(f=>f.sourcePath.startsWith('copy-'));assert.equal(copies.filter(f=>f.status==='ready').length,1);assert.equal(copies.filter(f=>f.status==='queued').length,1);
 assert.equal(getSetting('libraryJob').status,'paused');libraryControl('resume');await finished();assert.ok(all('libraryFile').filter(f=>f.sourcePath.startsWith('copy-')).every(f=>f.status==='ready'));
});
test('a fresh process recovers a persisted in-flight copy without creating a new source or duplicate file',()=>{
 const file=all('libraryFile').find(f=>f.sourcePath==='copy-a.md');save('libraryFile',{...file,status:'copying'},file.revision);
 setSetting('libraryJob',{status:'copying',queue:[],path:''});
 const child=spawnSync(process.execPath,['--input-type=module','-e',"const {recoverLibraryCopies,runLibrary}=await import('./server/domain/library/library.mjs');const {getSetting,db}=await import('./server/store.mjs');const recovered=recoverLibraryCopies();await runLibrary();console.log(JSON.stringify({recovered,status:getSetting('libraryJob').status}));db.close();"],{cwd:process.cwd(),env:{...process.env},encoding:'utf8',timeout:15000});
 assert.equal(child.status,0,child.stderr);assert.deepEqual(JSON.parse(child.stdout.trim()),{recovered:1,status:'done'});
 const current=all('libraryFile').filter(f=>f.sourcePath==='copy-a.md');assert.equal(current.length,1);assert.equal(current[0].id,file.id);assert.equal(current[0].copyName,file.copyName);assert.equal(current[0].status,'ready');
});
after(async()=>{db.close();await rm(root,{recursive:true,force:true});});
