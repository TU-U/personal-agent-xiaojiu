import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import net from 'node:net';
import JSZip from 'jszip';
import {routes} from '../contracts/generated/routes.mjs';
import {contractOperation,contractValidator} from '../server/core/contracts.mjs';

let child,base,cookie,dir;
async function request(url,method='GET',body,{auth=true,headers={}}={}){
 const response=await fetch(base+url,{method,headers:{...(auth?{cookie}:{}),...(body===undefined?{}:{'Content-Type':'application/json'}),...headers},body:body===undefined?undefined:JSON.stringify(body)});
 const data=await response.json();
 if(response.ok&&url.startsWith('/api/v1/')){
  const pathname=url.split('?')[0],route=routes.find(r=>r.method===method&&new RegExp('^/api/v1'+r.schemaPath.replace(/\{[^}]+\}/g,'[^/]+')+'$').test(pathname));
  assert.ok(route,method+' '+url);const schema=contractOperation(route).responses[response.status]?.content?.['application/json']?.schema;assert.ok(schema,route.operationId+' status '+response.status);
  const validate=contractValidator(schema);assert.ok(validate(data),route.operationId+': '+JSON.stringify(validate.errors));
 }
 return {status:response.status,data,headers:response.headers};
}
function matches(name,value){const valid=contractValidator({$ref:'#/components/schemas/'+name});assert.ok(valid(value),`${name}: ${JSON.stringify(valid.errors)}`);}
before(async()=>{
 dir=await mkdtemp(path.join(tmpdir(),'xiaojiu-contracts-'));
 const socket=net.createServer();socket.listen(0,'127.0.0.1');await once(socket,'listening');const port=socket.address().port;await new Promise(resolve=>socket.close(resolve));base='http://127.0.0.1:'+port;
 child=spawn(process.execPath,['server/index.mjs'],{env:{...process.env,HOST:'127.0.0.1',PORT:String(port),DATA_DIR:dir,SEED_DEMO:'false',AUTO_CLASSIFY_ENABLED:'false',FILE_WORKER_ENABLED:'false',LLM_BASE_URL:'',LLM_MODEL:'',LLM_API_KEY:'',QDRANT_URL:'',EMBEDDING_BASE_URL:'',BRAVE_SEARCH_API_KEY:''},stdio:['ignore','pipe','pipe']});
 let output='';child.stdout.on('data',chunk=>output+=chunk);child.stderr.on('data',chunk=>output+=chunk);
 let ready=false;for(let attempt=0;attempt<600;attempt++){if(child.exitCode!==null)throw new Error(output);try{ready=(await fetch(base+'/api/v1/health')).ok;if(ready)break;}catch{}await new Promise(resolve=>setTimeout(resolve,100));}assert.ok(ready,output);
 const login=await request('/api/v1/login','POST',{code:'shiguang-demo'},{auth:false});assert.equal(login.status,200);cookie=login.headers.get('set-cookie').split(';')[0];
});
after(async()=>{if(child&&child.exitCode===null){const done=once(child,'exit');child.kill();await done;}if(dir)await rm(dir,{recursive:true,force:true});});

test('public/auth boundaries, old device endpoints and cookie session coexist',async()=>{
 for(const prefix of ['/api','/api/v1']){const health=await request(prefix+'/health');matches('Health',health.data);assert.equal((await request(prefix+'/bootstrap','GET',undefined,{auth:false})).status,401);matches('Session',(await request(prefix+'/session')).data);}
 assert.equal((await request('/api/v2/health')).status,404);
 assert.equal((await request('/api/v1/v1/health')).status,404);
 const device=await request('/api/mobile/v1/session','POST',{code:'shiguang-demo',deviceId:'protocol-test-device',deviceName:'Contract test'},{auth:false});matches('DeviceSession',device.data);
 const headers={Authorization:'Bearer '+device.data.token};assert.equal((await request('/api/v1/bootstrap','GET',undefined,{auth:false,headers})).status,200);
 assert.equal((await request('/api/v1/devices/session','DELETE',undefined,{auth:false,headers})).status,200);
 assert.equal((await request('/api/bootstrap','GET',undefined,{auth:false,headers})).status,401);
 assert.equal((await request('/api/v1/notes','POST',{content:'blocked'},{headers:{Origin:'https://elsewhere.invalid'}})).status,403);
 assert.equal((await request('/api/v1/transactions/import/preview','POST',{})).status,410);
});

test('old/new writes share opId, payload hashes, revisions and cursors',async()=>{
 const body={content:'协议迁移保留原始格式\n1. 第一项\n2. 第二项',title:'协议回归',tags:[],opId:'contract-note-create',futureField:{keep:true}};
 const created=await request('/api/notes','POST',body);assert.equal(created.status,201);matches('Note',created.data);
 const replay=await request('/api/v1/notes','POST',body);assert.equal(replay.status,200);assert.equal(replay.data.id,created.data.id);
 assert.equal((await request('/api/v1/notes','POST',{...body,futureField:{keep:false}})).status,409);
 const edit=await request('/api/v1/notes/'+created.data.id,'PATCH',{content:'新版本\n内容不折叠',revision:created.data.revision});assert.equal(edit.status,200);
 const conflict=await request('/api/notes/'+created.data.id,'PATCH',{content:'过期版本',revision:created.data.revision});assert.equal(conflict.status,409);matches('Error',conflict.data);assert.equal(conflict.data.current.content,edit.data.content);
 const fresh=await request('/api/v1/bootstrap');matches('Bootstrap',fresh.data);assert.equal(fresh.data.notes.filter(n=>n.id===created.data.id).length,1);
 const cursor=fresh.data.cursor;assert.deepEqual((await request('/api/changes?since='+cursor)).data,(await request('/api/v1/changes?since='+cursor)).data);
 const invalid=await request('/api/v1/todos','POST',{title:'类型错误',done:'false'});assert.equal(invalid.status,400);matches('Error',invalid.data);
 assert.equal((await request('/api/v1/notes/'+created.data.id,'DELETE',{revision:edit.data.revision})).status,200);
});

test('schema validators neither coerce nor remove fields; settings refinements survive',async()=>{
 const body={content:'raw',future:'must survive'};const before=JSON.stringify(body);assert.ok(contractValidator({$ref:'#/components/schemas/NoteCreate'})(body));assert.equal(JSON.stringify(body),before);
 assert.equal((await request('/api/v1/settings','PATCH',{provider:{baseUrl:'https://example.invalid?secret=value',model:'test'}})).status,400);
 const bad=await request('/api/v1/settings','PATCH',{provider:{baseUrl:'https://example.invalid',model:'test',clearKey:'false',apiKey:'must-not-echo'}});assert.equal(bad.status,400);assert.ok(!JSON.stringify(bad.data).includes('must-not-echo'));
 assert.equal((await request('/api/v1/settings','PATCH',{name:'协议测试空间'})).status,200);matches('Settings',(await request('/api/settings')).data);
});

test('multipart note images become event copies; self-reference still fails in business validation',async()=>{
 const image=await readFile('tests/fixtures/sample.png');const form=new FormData();form.append('file',new Blob([image],{type:'image/png'}),'contract.png');form.append('opId','contract-image-import');
 const imported=await fetch(base+'/api/v1/import',{method:'POST',headers:{cookie},body:form});assert.equal(imported.status,201);const note=await imported.json();matches('Note',note);
 const body={title:'带图要事',summary:'图片应保留',sourceNoteId:note.id,eventType:'one_off',priority:'normal',relatedEventIds:[],opId:'contract-event-create'};
 const created=await request('/api/v1/events','POST',body);assert.equal(created.status,201);matches('EventRecord',created.data);assert.equal(created.data.images.length,1);
 assert.equal((await request('/api/events','POST',body)).data.id,created.data.id);
 const edit=await request('/api/v1/events/'+created.data.id,'PATCH',{revision:created.data.revision,relatedEventIds:[created.data.id]});assert.equal(edit.status,422);assert.match(edit.data.error,/不能关联自身/);
 await request('/api/v1/notes/'+note.id,'DELETE',{revision:note.revision});
 for(const prefix of ['/api','/api/v1']){const response=await fetch(base+prefix+'/events/'+created.data.id+'/image/'+created.data.images[0].id,{headers:{cookie}});assert.equal(response.status,200);assert.match(response.headers.get('content-type'),/^image\//);assert.deepEqual(Buffer.from(await response.arrayBuffer()),image);}
});

test('text upload, binary downloads and streaming backup keep original bytes',async()=>{
 const content='# 协议测试\n\n1. 保留换行\n2. 保留编号\n';const form=new FormData();form.append('file',new Blob([content],{type:'text/markdown'}),'contract.md');
 const imported=await fetch(base+'/api/v1/import',{method:'POST',headers:{cookie},body:form});assert.equal(imported.status,201);const note=await imported.json();
 const download=await fetch(base+'/api/v1/notes/'+note.id+'/file/'+note.attachments[0].id+'?download=1',{headers:{cookie}});assert.equal(await download.text(),content);assert.match(download.headers.get('content-disposition'),/attachment/);
 const backup=await request('/api/v1/backups','POST',{});assert.equal(backup.status,201);matches('BackupReceipt',backup.data);
 const bytes=await fetch(base+'/api/v1/backups/'+backup.data.id+'/download',{headers:{cookie}});assert.equal(bytes.status,200);assert.match(bytes.headers.get('content-type'),/application\/zip/);assert.equal(Buffer.from(await bytes.arrayBuffer()).subarray(0,2).toString(),'PK');
});

test('memory creation stays a candidate and malformed model requests produce errors',async()=>{
 const memory=await request('/api/v1/memories','POST',{content:'人工确认前保持候选',scope:'通用',opId:'contract-memory-create'});assert.equal(memory.status,201);assert.equal(memory.data.status,'candidate');
 const boot=await request('/api/v1/bootstrap');matches('Bootstrap',boot.data);
 const ask=await request('/api/v1/ask','POST',{query:'test',references:[{kind:'note',id:'invalid'}]});assert.equal(ask.status,400);
 assert.equal((await request('/api/v1/pet/chat','POST',{message:'hello'})).status,422);
});

test('complex read operations expose concrete protocol responses and reject repeated scalar queries',async()=>{
 const day='2026-10-08';
 for(const url of ['/settings/storage','/settings/worker','/settings/capabilities','/research-search-settings','/library?summary=true','/library/files?limit=5','/library/search?q=none','/classification-corrections','/work-tasks','/work-tasks/settings','/pet/reminders','/supervision/recap?day='+day,'/accounting/imports','/accounting/checks','/accounting/view?rankMonth=2026-10&chartYear=2026','/ai/logs','/threads','/research-sources'])assert.equal((await request('/api/v1'+url)).status,200,url);
 assert.equal((await request('/api/v1/library/files?limit=2&limit=3')).status,400);
 assert.equal((await request('/api/v1/accounting/view?rankMonth=2026-10')).status,400);
});

test('category/project links, source threads and supervision preserve state and replay rules',async()=>{
 const note=(await request('/api/v1/notes','POST',{content:'协议测试的个人项目',title:'项目记录'})).data;
 const categories=(await request('/api/v1/categories')).data.items;
 const categorized=await request('/api/v1/notes/categories','POST',{opId:'contracts-set-category',categoryId:categories[0].id,notes:[{id:note.id,revision:note.revision}]});assert.equal(categorized.status,200);
 const project=(await request('/api/v1/projects','POST',{name:'协议迁移项目'})).data;
 const latest=(await request('/api/v1/bootstrap')).data.notes.find(n=>n.id===note.id);
 assert.equal((await request('/api/v1/projects/'+project.id+'/links','POST',{kind:'note',id:note.id,revision:latest.revision})).status,200);
 for(const p of ['/projects/'+project.id+'/items?kind=note','/projects/'+project.id+'/candidates?kind=event','/notes/'+note.id+'/classification','/notes/'+note.id+'/processing'])assert.equal((await request('/api/v1'+p)).status,200,p);
 const thread=(await request('/api/v1/source-threads','POST',{kind:'note',id:note.id})).data;
 assert.equal((await request('/api/v1/threads/'+thread.threadId+'/context')).status,200);
 const todo=(await request('/api/v1/todos','POST',{title:'监督条件协议测试'})).data;
 const upgraded=await request('/api/v1/todos/'+todo.id+'/upgrade','POST',{opId:'contract-upgrade-todo',revision:todo.revision,minutes:1,repeat:'once',startTime:'09:00',time:'20:00',conditions:[{id:'result',kind:'evidence',required:true,description:'保留可核对的文字结果'}]});assert.equal(upgraded.status,200);
 const {runId,taskId}=upgraded.data;
 const adjustment={action:'adjust',opId:'contract-run-adjust',minutes:1,reason:'补记测试投入'};
 const first=await request('/api/v1/work-runs/'+runId+'/action','POST',adjustment);assert.equal(first.status,200);
 const replay=await request('/api/work-runs/'+runId+'/action','POST',adjustment);assert.equal(replay.data.seconds,first.data.seconds);
 assert.equal((await request('/api/v1/work-runs/'+runId+'/action','POST',{...adjustment,minutes:2})).status,409);
 for(const p of ['/work-tasks','/work-tasks/'+taskId+'/library','/work-runs/'+runId+'/evidence-history','/work-runs/'+runId+'/evidence-options?kind=note','/work-runs/'+runId+'/evidence-sources?refs=[]','/pet/reminders'])assert.equal((await request('/api/v1'+p)).status,200,p);
 // Legacy permits omitting scheduleVersion; protocol must not invent a required field.
 assert.equal((await request('/api/v1/work-runs/'+runId+'/action','POST',{action:'skip',reason:'本次只验证协议'})).status,200);
});

test('research raw actions differ from detail and cancellation requires the current revision',async()=>{
 const body={executionMode:'research',opId:'contract-research-create',references:[],researchBrief:{topic:'协议迁移验证',questions:['有哪些接口形状？'],type:'custom',expectedOutput:'一份接口清单',web:false}};
 const created=await request('/api/v1/research-tasks','POST',body);assert.equal(created.status,200);assert.equal(created.data.plan,null);assert.equal(created.data.budget,undefined);
 assert.equal((await request('/api/v1/research-tasks/'+created.data.id)).status,200);
 assert.equal((await request('/api/v1/work-tasks')).status,200);
 assert.equal((await request('/api/v1/research-tasks/'+created.data.id+'/action','POST',{action:'cancel',opId:'contract-research-cancel-stale',revision:created.data.revision+99})).status,409);
 const cancel=await request('/api/v1/research-tasks/'+created.data.id+'/action','POST',{action:'cancel',opId:'contract-research-cancel',revision:created.data.revision});assert.equal(cancel.status,200);assert.equal(cancel.data.status,'cancelled');
});

test('accounting import, review and commit keep rows, money and idempotency across versions',async()=>{
 const zip=new JSZip();zip.file('xl/workbook.xml','<workbook><sheets><sheet name="明细" r:id="rId1"/></sheets></workbook>');zip.file('xl/_rels/workbook.xml.rels','<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>');
 const rows=[['交易时间','收/支','金额(元)','交易单号','当前状态'],['2026-10-08','支出','35.50','contract-trade-id','支付成功']];
 zip.file('xl/worksheets/sheet1.xml','<worksheet>'+rows.map((row,i)=>`<row r="${i+1}">${row.map((v,j)=>`<c r="${String.fromCharCode(65+j)}${i+1}" t="inlineStr"><is><t>${v}</t></is></c>`).join('')}</row>`).join('')+'</worksheet>');
 const form=new FormData();form.append('file',new Blob([await zip.generateAsync({type:'uint8array'})]),'账单.xlsx');form.append('opId','contract-bill-import');
 const response=await fetch(base+'/api/v1/accounting/imports',{method:'POST',headers:{cookie},body:form});assert.equal(response.status,201);const batch=await response.json();matches('AccountingImportPage',batch);
 const listed=await request('/api/v1/accounting/imports');assert.equal(listed.data.imports.find(b=>b.id===batch.id).rows,undefined);
 const row=batch.rows[0],preview=await request('/api/v1/accounting/imports/'+batch.id+'/review','POST',{opId:'contract-bill-review',revision:batch.revision,choices:[{rowId:row.rowId,decision:'include',acceptWarnings:true,draft:{type:'expense',amount:'35.50',category:'美食',date:'2026-10-08',note:'协议导入',channel:'wechat',merchant:'测试商家',sourceRef:'contract-trade-id'}}]});assert.equal(preview.status,200);
 const body={opId:'contract-bill-commit',revision:batch.revision,reviewId:preview.data.reviewId,reviewToken:preview.data.reviewToken,approved:true,duplicateAcknowledgements:[]};
 const commit=await request('/api/v1/accounting/imports/'+batch.id+'/commit','POST',body);assert.equal(commit.status,200);assert.equal(commit.data.imported,1);
 assert.deepEqual((await request('/api/accounting/imports/'+batch.id+'/commit','POST',body)).data,commit.data);
 assert.equal((await request('/api/v1/accounting/imports/'+batch.id+'/reviews')).status,200);
 const tx=(await request('/api/v1/transactions')).data.transactions.find(t=>t.id===commit.data.transactionIds[0]);assert.equal(tx.amountCents,3550);
 assert.equal((await request('/api/v1/export')).status,200);
});
