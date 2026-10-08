import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import net from 'node:net';
import {contractValidator} from '../server/core/contracts.mjs';

let child,base,cookie,dir;
async function request(url,method='GET',body,{auth=true,headers={}}={}){
 const response=await fetch(base+url,{method,headers:{...(auth?{cookie}:{}),...(body===undefined?{}:{'Content-Type':'application/json'}),...headers},body:body===undefined?undefined:JSON.stringify(body)});
 return {status:response.status,data:await response.json(),headers:response.headers};
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
