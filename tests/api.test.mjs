import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createServer} from 'node:http';
import {crc32} from 'node:zlib';
import JSZip from 'jszip';
const port=4431,base=`http://127.0.0.1:${port}`;let server,dir,cookie='';
async function request(url,method='GET',body,auth=true){const r=await fetch(base+'/api'+url,{method,headers:{...(auth?{cookie}:{}),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json(),headers:r.headers};}
async function miniWechatXlsx(){const zip=new JSZip();zip.file('xl/workbook.xml','<workbook xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="账单" sheetId="1" r:id="rId1"/></sheets></workbook>');zip.file('xl/_rels/workbook.xml.rels','<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>');const rows=[['交易时间','交易类型','交易对方','商品','收/支','金额(元)','支付方式','当前状态','交易单号','商户单号','备注'],['46106.5','消费','示例商户','晚餐','支出','22.5','零钱','支付成功','api-fixture-1','m1','/']];const col=i=>{let s='';for(i++;i;i=Math.floor((i-1)/26))s=String.fromCharCode((i-1)%26+65)+s;return s;};zip.file('xl/worksheets/sheet1.xml',`<worksheet><sheetData>${rows.map((row,r)=>`<row r="${r+1}">${row.map((value,c)=>`<c r="${col(c)}${r+1}" t="inlineStr"><is><t>${value}</t></is></c>`).join('')}</row>`).join('')}</sheetData></worksheet>`);return zip.generateAsync({type:'nodebuffer'});}
before(async()=>{dir=await mkdtemp(path.join(os.tmpdir(),'shiguang-api-'));server=spawn(process.execPath,['server/index.mjs'],{env:{...process.env,PORT:String(port),DATA_DIR:path.join(dir,'.data'),SEED_DEMO:'false',AUTO_CLASSIFY_ENABLED:'false'},stdio:'pipe'});let log='';server.stderr.on('data',s=>log+=s);for(let i=0;i<120;i++){try{if((await fetch(base+'/api/health')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));if(i===119)throw new Error('server start: '+log);}const r=await request('/login','POST',{code:'shiguang-demo'},false);cookie=r.headers.get('set-cookie').split(';')[0];});
after(async()=>{server?.kill();await new Promise(r=>setTimeout(r,250));if(dir)await rm(dir,{recursive:true,force:true});});
test('unauthenticated data and export are private',async()=>{assert.equal((await request('/bootstrap','GET',undefined,false)).status,401);assert.equal((await request('/export','GET',undefined,false)).status,401);assert.equal((await request('/ai/logs','GET',undefined,false)).status,401);assert.ok(Array.isArray((await request('/ai/logs')).data.items));});
test('Xiaojiu chat is authenticated, validates input, and requires a configured model',async()=>{
 assert.equal((await request('/pet/chat','POST',{message:'你好'},false)).status,401);
 assert.equal((await request('/pet/chat','POST',{message:'  '})).status,400);
 assert.equal((await request('/pet/chat','POST',{message:'你好',history:Array(9).fill({role:'user',content:'a'})})).status,400);
 assert.equal((await request('/pet/chat','POST',{message:'你好'})).status,422);
});
test('create, idempotent retry, cross-device read, revision conflict, delete',async()=>{
 const content='今天完成了星河项目的支付接口联调，剩余风险是回调重试。';const first=await request('/notes','POST',{title:'星河测试',content,project:'星河',tags:['工作'],opId:'operation-test-123'});assert.equal(first.status,201);const n=first.data;
 const again=await request('/notes','POST',{title:'星河测试',content,project:'星河',tags:['工作'],opId:'operation-test-123'});assert.equal(again.data.id,n.id);
 const boot=await request('/bootstrap');assert.equal(boot.data.notes.filter(x=>x.id===n.id).length,1);
 const edit=await request('/notes/'+n.id,'PATCH',{content:content+' 已验证。',revision:n.revision});assert.equal(edit.status,200);assert.equal(edit.data.revision,2);
 const stale=await request('/notes/'+n.id,'PATCH',{content:'旧客户端',revision:1});assert.equal(stale.status,409);assert.equal(stale.data.current.content,edit.data.content);
 const found=await request('/search?q='+encodeURIComponent('支付接口'));assert.equal(found.data.notes[0].id,n.id);
 assert.equal((await request('/notes/'+n.id,'DELETE',{revision:1})).status,409);
 assert.equal((await request('/notes/'+n.id,'DELETE',{revision:2})).status,200);
 assert.equal((await request('/search?q='+encodeURIComponent('星河'))).data.notes.length,0);
 assert.equal((await request('/notes/'+n.id,'PATCH',{revision:2,content:'复活'})).status,404);
});
test('todos are synced, revision-checked, and validated',async()=>{
 const created=await request('/todos','POST',{title:'完成首页待办面板'});assert.equal(created.status,201);assert.equal(created.data.done,false);
 const firstBoot=await request('/bootstrap');assert.equal(firstBoot.data.todos.some(todo=>todo.id===created.data.id),true);
 const updated=await request('/todos/'+created.data.id,'PATCH',{title:created.data.title,done:true,revision:created.data.revision});assert.equal(updated.status,200);assert.equal(updated.data.revision,2);
 assert.equal((await request('/todos/'+created.data.id,'PATCH',{title:'过期更新',done:false,revision:1})).status,409);
 assert.equal((await request('/todos','POST',{title:'  '})).status,400);
 assert.equal((await request('/todos','POST',{title:'x'.repeat(161)})).status,400);
 assert.equal((await request('/todos/'+created.data.id,'DELETE',{revision:1})).status,409);
 assert.equal((await request('/todos/'+created.data.id,'DELETE',{revision:2})).status,200);
 assert.equal((await request('/bootstrap')).data.todos.some(todo=>todo.id===created.data.id),false);
});
test('accounting entries persist, validate, revise, de-duplicate, and update budget',async()=>{
 assert.equal((await request('/transactions','GET',undefined,false)).status,401);
 assert.equal((await request('/transactions','POST',{type:'expense',amount:'-100',category:'美食',date:'2026-09-28'})).status,400);
 assert.equal((await request('/transactions','POST',{type:'expense',amount:'12.345',category:'美食',date:'2026-09-28'})).status,400);
 const created=await request('/transactions','POST',{type:'expense',amount:'35.5',category:'美食',date:'2026-09-28',note:'晚饭'});assert.equal(created.status,201);assert.equal(created.data.amountCents,3550);
 assert.equal((await request('/bootstrap')).data.transactions.some(tx=>tx.id===created.data.id),true);
 const edited=await request('/transactions/'+created.data.id,'PATCH',{type:'expense',amount:'40',category:'美食',date:'2026-09-28',note:'晚饭改账',revision:created.data.revision});assert.equal(edited.status,200);assert.equal(edited.data.id,created.data.id);assert.equal(edited.data.amountCents,4000);
 assert.equal((await request('/transactions/'+created.data.id,'PATCH',{type:'expense',amount:'41',category:'美食',date:'2026-09-28',revision:1})).status,409);
 const imported={type:'expense',amountCents:2250,category:'交通',date:'2026-09-28',note:'地铁',source:'wechat',sourceRef:'wx-fixture-id'};
 const first=await request('/transactions/import/commit','POST',{transactions:[imported,imported]});assert.deepEqual(first.data,{imported:1,skipped:1});
 const retry=await request('/transactions/import/commit','POST',{transactions:[imported]});assert.deepEqual(retry.data,{imported:0,skipped:1});
 const budget=await request('/accounting/budget','PATCH',{amount:'2300.00'});assert.equal(budget.data.amountCents,230000);
 assert.equal((await request('/bootstrap')).data.accountingBudget.amountCents,230000);
 assert.equal((await request('/transactions/'+edited.data.id,'DELETE',{revision:edited.data.revision})).status,200);
 assert.equal((await request('/transactions/'+edited.data.id,'GET')).status,404);
});
test('WeChat Excel rows are staged for review and screenshot OCR requires a configured vision model',async()=>{
 const denied=new FormData();denied.append('file',new Blob([await miniWechatXlsx()]),'statement.xlsx');assert.equal((await fetch(base+'/api/transactions/import/preview',{method:'POST',body:denied})).status,401);
 const form=new FormData();form.append('file',new Blob([await miniWechatXlsx()],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),'statement.xlsx');
 const preview=await fetch(base+'/api/transactions/import/preview',{method:'POST',headers:{cookie},body:form});assert.equal(preview.status,200);const data=await preview.json();assert.equal(data.rows.length,1);assert.equal(data.rows[0].amountCents,2250);assert.equal(data.rows[0].categorySource,'待确认');assert.equal(data.rows[0].duplicate,false);
 const image=await readFile('tests/fixtures/sample.png');const screenshot=new FormData();screenshot.append('file',new Blob([image],{type:'image/png'}),'receipt.png');const ocr=await fetch(base+'/api/transactions/ocr',{method:'POST',headers:{cookie},body:screenshot});assert.equal(ocr.status,422);
});
test('daily todo lists retain dated history and completion state',async()=>{
 const yesterday=new Date();yesterday.setDate(yesterday.getDate()-1);const day=`${yesterday.getFullYear()}-${String(yesterday.getMonth()+1).padStart(2,'0')}-${String(yesterday.getDate()).padStart(2,'0')}`;
 const old=await request('/todos','POST',{title:'昨天完成的事',day});assert.equal(old.status,201);assert.equal(old.data.day,day);
 const completed=await request('/todos/'+old.data.id,'PATCH',{done:true,revision:old.data.revision});assert.equal(completed.status,200);assert.ok(completed.data.completedAt);
 const current=await request('/todos','POST',{title:'今天新建的事'});assert.equal(current.status,201);assert.notEqual(current.data.day,day);
 const saved=(await request('/bootstrap')).data.todos;assert.equal(saved.find(item=>item.id===old.data.id).done,true);assert.equal(saved.find(item=>item.id===old.data.id).day,day);assert.equal(saved.find(item=>item.id===current.data.id).done,false);
 assert.equal((await request('/todos','POST',{title:'无效日期',day:'2026-02-30'})).status,400);
});
test('validation rejects blank, long titles, excessive tags, malformed dates',async()=>{
 for(const body of [{content:''},{content:'ok',title:'x'.repeat(201)},{content:'ok',tags:Array(13).fill('a')},{content:'ok',tags:['']}])assert.equal((await request('/notes','POST',body)).status,400);
 assert.equal((await request('/tasks','POST',{template:'weekly',days:-1})).status,400);
 assert.equal((await request('/changes?since=-1')).status,400);
});
test('images can be attached to a note and cut without losing its text',async()=>{
 const created=await request('/notes','POST',{title:'图片剪贴板测试',content:'截图说明',tags:[]});assert.equal(created.status,201);
 const invalid=new FormData();invalid.append('revision',String(created.data.revision));invalid.append('images',new Blob(['not an image'],{type:'image/png'}),'伪造.png');assert.equal((await fetch(base+'/api/notes/'+created.data.id+'/images',{method:'POST',headers:{cookie},body:invalid})).status,422);
 const file=await readFile('tests/fixtures/sample.png');const form=new FormData();form.append('revision',String(created.data.revision));form.append('images',new Blob([file],{type:'image/png'}),'截图.png');
 const uploaded=await fetch(base+'/api/notes/'+created.data.id+'/images',{method:'POST',headers:{cookie},body:form});assert.equal(uploaded.status,201);const note=await uploaded.json();assert.equal(note.attachments.length,1);assert.equal(note.attachments[0].name,'截图.png');
 const image=await fetch(base+'/api/notes/'+note.id+'/file/'+note.attachments[0].id,{headers:{cookie}});assert.deepEqual(Buffer.from(await image.arrayBuffer()),file);
 assert.equal((await request('/notes/'+note.id+'/images/'+note.attachments[0].id,'DELETE',{revision:created.data.revision})).status,409);
 const cut=await request('/notes/'+note.id+'/images/'+note.attachments[0].id,'DELETE',{revision:note.revision});assert.equal(cut.status,200);assert.equal(cut.data.content,'截图说明');assert.equal(cut.data.attachments.length,0);assert.equal((await fetch(base+'/api/notes/'+note.id+'/file/'+note.attachments[0].id,{headers:{cookie}})).status,404);
});
test('memory confirmation, source deletion invalidation, artifact persistence',async()=>{
 const n=(await request('/notes','POST',{title:'发布计划',content:'已完成发布检查。下周计划进行灰度发布。',project:'发布'})).data;
 const m=(await request('/memories','POST',{content:'周报先写结论。',scope:'周报',sourceId:n.id})).data;assert.equal(m.status,'candidate');
 const active=(await request('/memories/'+m.id,'PATCH',{revision:m.revision,status:'active'})).data;assert.equal(active.status,'active');
 const a=await request('/tasks','POST',{template:'weekly',project:'发布',days:7});assert.equal(a.status,201);assert.equal(a.data.mode,'local');assert.equal(a.data.sources[0].id,n.id);assert.equal(a.data.memories[0].id,m.id);assert.ok(a.data.body.includes('下周计划'));
 const edit=await request('/artifacts/'+a.data.id,'PATCH',{revision:a.data.revision,title:'我的周报',body:'核对后的成果'});assert.equal(edit.status,200);assert.equal(edit.data.mode,'human');assert.equal(edit.data.originMode,'local');assert.equal((await request('/artifacts/'+a.data.id+'?revision='+a.data.revision)).status,409);const exported=await fetch(base+'/api/artifacts/'+a.data.id+'/download?revision='+edit.data.revision,{headers:{cookie}});assert.equal(exported.headers.get('x-artifact-revision'),String(edit.data.revision));assert.equal(await exported.text(),'核对后的成果');
 await request('/notes/'+n.id,'DELETE',{revision:n.revision});
 const memory=(await request('/bootstrap')).data.memories.find(x=>x.id===m.id);assert.equal(memory.status,'invalid');assert.equal((await request('/memories/'+m.id,'PATCH',{revision:memory.revision,status:'active'})).status,422);
 assert.equal((await request('/tasks','POST',{template:'weekly',project:'不存在',days:7})).status,422);
});
test('question without evidence refuses rather than inventing',async()=>{
 const a=await request('/ask','POST',{query:'三叠纪火山的花岗岩是什么'});assert.equal(a.status,200);assert.equal(a.data.sources.length,0);assert.ok(a.data.body.includes('没有找到'));
});
test('topic conversations persist across turns and stay separate',async()=>{
 const first=await request('/ask','POST',{query:'我想聊聊周末散步'});assert.equal(first.status,200);
 assert.match(first.data.threadId,/^[0-9a-f-]{36}$/);
 const followup=await request('/ask','POST',{query:'那后来呢',threadId:first.data.threadId});assert.equal(followup.status,200);
 assert.equal(followup.data.threadId,first.data.threadId);
 assert.equal(followup.data.threadTitle,first.data.threadTitle);
 const other=await request('/ask','POST',{query:'再聊一个不同的话题'});assert.notEqual(other.data.threadId,first.data.threadId);
 const stored=(await request('/bootstrap')).data.conversations.filter(c=>c.threadId===first.data.threadId);
 assert.equal(stored.length,2);
 assert.equal((await request('/ask','POST',{query:'无效会话',threadId:'00000000-0000-0000-0000-000000000000'})).status,404);
 assert.equal((await request('/threads/'+first.data.threadId,'DELETE')).status,200);
 assert.equal((await request('/bootstrap')).data.conversations.some(c=>c.threadId===first.data.threadId),false);
});
test('chosen notes and events become saved, source-backed conversation references',async()=>{
 const note=(await request('/notes','POST',{title:'被引用的旅行记录',content:'我打算周末去海边，先查潮汐时间。',tags:[],project:'生活'})).data;
 const event=(await request('/events','POST',{title:'周末海边计划',summary:'出发前确认潮汐和交通。',tags:[],project:'生活',priority:'normal',dueAt:''})).data;
 const refs=[{kind:'note',id:note.id},{kind:'event',id:event.id}];
 const asked=await request('/ask','POST',{query:'这件事有哪些准备工作？',references:refs});
 assert.equal(asked.status,200);
 assert.deepEqual(asked.data.references.map(ref=>({kind:ref.kind,id:ref.id})),refs);
 assert.deepEqual(asked.data.sources.slice(0,2).map(source=>({kind:source.kind,id:source.id})),refs);
 assert.match(asked.data.body,/潮汐/);
 const continued=await request('/ask','POST',{query:'接着讨论',threadId:asked.data.threadId,references:refs});
 assert.equal(continued.status,200);assert.equal(continued.data.threadId,asked.data.threadId);
 const stored=(await request('/bootstrap')).data.conversations.find(turn=>turn.id===asked.data.id);
 assert.equal(stored.references[1].title,event.title);
 assert.equal((await request('/ask','POST',{query:'重复引用',references:[refs[0],refs[0]]})).status,400);
 assert.equal((await request('/ask','POST',{query:'找不到资料',references:[{kind:'event',id:'00000000-0000-0000-0000-000000000000'}]})).status,404);
});
test('selected event and note text reaches the model prompt',async()=>{
 const calls=[];
 const model=createServer(async(req,res)=>{let raw='';for await(const chunk of req)raw+=chunk;const payload=JSON.parse(raw);calls.push(payload);res.setHeader('Content-Type','application/json');res.end(JSON.stringify({choices:[{message:{content:JSON.stringify({answer:'出发前确认潮汐和交通安排。',source_ids:[1,2]})},finish_reason:'stop'}]}));});
 await new Promise(resolve=>model.listen(0,'127.0.0.1',resolve));
 try{
  const modelUrl=`http://127.0.0.1:${model.address().port}`;
  assert.equal((await request('/settings','PATCH',{provider:{baseUrl:modelUrl,model:'test-model',apiKey:'test-key'}})).status,200);
  const note=(await request('/notes','POST',{title:'模型引用记录',content:'海边记录正文：出门前查看潮汐预报。',tags:[]})).data;
  const event=(await request('/events','POST',{title:'模型引用要事',summary:'海边要事摘要：确认交通安排。',tags:[],priority:'normal',dueAt:''})).data;
  const result=await request('/ask','POST',{query:'根据引用资料说说准备事项',references:[{kind:'note',id:note.id},{kind:'event',id:event.id}]});
  assert.equal(result.status,200);assert.equal(result.data.mode,'model');
  assert.match(calls[0].messages[1].content,/海边记录正文：出门前查看潮汐预报/);
  assert.match(calls[0].messages[1].content,/海边要事摘要：确认交通安排/);
 }finally{
  await request('/settings','PATCH',{provider:{baseUrl:'',model:'',clearKey:true}});
  model.close();
 }
});
test('search handoff includes selected background and a fixed answer format',async()=>{
 const note=(await request('/notes','POST',{title:'搜索背景记录',content:'准备验证 Ozon 选品和物流方案。',tags:[]})).data;
 const brief=await request('/search-brief','POST',{query:'现在有哪些风险值得先查？',references:[{kind:'note',id:note.id}]});
 assert.equal(brief.status,200);
 assert.match(brief.data.brief,/搜索背景记录/);
 assert.match(brief.data.brief,/关键分析/);
 assert.match(brief.data.brief,/出处链接和发布日期/);
 const search=await request('/ask','POST',{query:'查最新政策',webSearch:true});
 assert.equal(search.status,422);
 assert.match(search.data.error,/联网分析需要先连接 AI 模型|Brave Search API 密钥/);
});
test('UTF-8 file import keeps original filename, content, and download authorization',async()=>{
 const form=new FormData();form.append('file',new Blob(['会议纪要：周五完成接口验收。'],{type:'text/plain'}),'中文会议纪要.txt');
 const r=await fetch(base+'/api/import',{method:'POST',headers:{cookie},body:form});assert.equal(r.status,201);const n=await r.json();assert.equal(n.title,'中文会议纪要.txt');assert.ok(n.content.includes('接口验收'));
 const file='/notes/'+n.id+'/file/'+n.attachments[0].id;assert.equal((await fetch(base+'/api'+file)).status,401);const d=await fetch(base+'/api'+file,{headers:{cookie}});assert.equal(await d.text(),'会议纪要：周五完成接口验收。');
 await request('/notes/'+n.id,'DELETE',{revision:n.revision});assert.equal((await request(file)).status,404);
});
test('unsupported and corrupted documents fail clearly without new records',async()=>{
 const count=(await request('/bootstrap')).data.notes.length;
 for(const [filename,status] of [['malicious.exe',415],['broken.pdf',422],['broken.docx',422]]){const f=new FormData();f.append('file',new Blob(['not a real file']),filename);const r=await fetch(base+'/api/import',{method:'POST',headers:{cookie},body:f});assert.equal(r.status,status,filename);}
 assert.equal((await request('/bootstrap')).data.notes.length,count);
});
test('cross-origin mutation rejected and API keys omitted',async()=>{
 const r=await fetch(base+'/api/notes',{method:'POST',headers:{cookie,'Content-Type':'application/json',Origin:'https://evil.example'},body:JSON.stringify({content:'attack'})});assert.equal(r.status,403);
 await request('/settings','PATCH',{provider:{baseUrl:'http://127.0.0.1:9/v1',model:'test',apiKey:'secret-test-only'}});const s=await request('/settings');assert.equal(s.data.provider.hasKey,true);assert.equal(JSON.stringify(s.data).includes('secret-test-only'),false);
 const failed=await request('/settings/test','POST',{});assert.equal(failed.status,502);
 await request('/settings','PATCH',{provider:{baseUrl:'',model:'',clearKey:true}});
});
test('export format and password change invalidate other sessions',async()=>{
 const exp=await request('/export');assert.equal(exp.status,200);assert.equal(exp.data.version,1);assert.ok(Array.isArray(exp.data.notes));
 const login=await request('/login','POST',{code:'shiguang-demo'},false);const other=login.headers.get('set-cookie').split(';')[0];
 assert.equal((await request('/settings','PATCH',{accessCode:'test-secure-code-2026'})).status,200);
 assert.equal((await fetch(base+'/api/bootstrap',{headers:{cookie:other}})).status,401);assert.equal((await request('/bootstrap')).status,200);
 assert.equal((await request('/login','POST',{code:'shiguang-demo'},false)).status,401);
});

test('real PDF, DOCX, GB18030, image and audio fixtures import correctly',async()=>{
 for(const [name,expected,status] of [['sample.pdf','支付接口','ready'],['sample.docx','手机上传方案','ready'],['sample-gbk.txt','周五完成验收','ready'],['sample.png','','needs_text'],['sample.wav','','needs_text'],['no-text.pdf','','needs_text']]){
  const form=new FormData();form.append('file',new Blob([await readFile('tests/fixtures/'+name)]),name);const r=await fetch(base+'/api/import',{method:'POST',headers:{cookie},body:form});assert.equal(r.status,201,name);let n=await r.json();if(n.status==='processing'){let processing;for(let i=0;i<200;i++){processing=(await request('/notes/'+n.id+'/processing')).data;if(['completed','failed'].includes(processing.job?.state))break;await new Promise(resolve=>setTimeout(resolve,100));}assert.equal(processing.job.state,'completed',processing.job.error||name);n=processing.note;}assert.equal(n.status,status,name);if(expected)assert.ok(n.content.includes(expected),name);assert.ok(n.attachments.length===1);await request('/notes/'+n.id,'DELETE',{revision:n.revision});
 }
});
test('text and image uploads receive source-based AI summaries and remain editable',async()=>{
 const calls=[];let summaryReply='归纳了原件中能够核对的内容。';
 const model=createServer(async(req,res)=>{let raw='';for await(const chunk of req)raw+=chunk;const payload=JSON.parse(raw);calls.push(payload);res.setHeader('Content-Type','application/json');res.end(JSON.stringify({choices:[{message:{content:summaryReply},finish_reason:'stop'}]}));});
 await new Promise(resolve=>model.listen(0,'127.0.0.1',resolve));
 try{
  const modelUrl=`http://127.0.0.1:${model.address().port}`;
  assert.equal((await request('/settings','PATCH',{provider:{baseUrl:modelUrl,model:'test-model',apiKey:'test-key'}})).status,200);
  const textNote=(await request('/notes','POST',{content:'周五完成接口验收，下一步检查手机端同步。'})).data;
  const textSummary=await request('/notes/'+textNote.id+'/summarize','POST',{});
  assert.equal(textSummary.status,200);assert.equal(textSummary.data.summaryMode,'ai');assert.match(textSummary.data.summary,/归纳了原件/);
  assert.match(calls[0].messages[1].content,/周五完成接口验收/);
  const form=new FormData();form.append('file',new Blob([await readFile('tests/fixtures/sample.png')],{type:'image/png'}),'sample.png');
  const uploaded=await fetch(base+'/api/import',{method:'POST',headers:{cookie},body:form});assert.equal(uploaded.status,201);const image=await uploaded.json();
  const imageSummary=await request('/notes/'+image.id+'/summarize','POST',{});
  assert.equal(imageSummary.status,200);assert.equal(imageSummary.data.summaryMode,'ai');assert.ok(Array.isArray(calls[1].messages[1].content));
  assert.match(calls[1].messages[1].content[1].image_url.url,/^data:image\/png;base64,/);
  const longNote=(await request('/notes','POST',{content:'长'.repeat(12001)+'末尾重要待办'})).data;
  const count=calls.length;const rejected=await request('/notes/'+longNote.id+'/summarize','POST',{});
  assert.equal(rejected.status,200);assert.equal(calls.length,count+3);assert.ok(calls.slice(count).some(call=>call.messages[1].content.includes('末尾重要待办')));
  summaryReply='长'.repeat(801);const tooLong=await request('/notes/'+textNote.id+'/summarize','POST',{});
  assert.equal(tooLong.status,502);assert.match(tooLong.data.error,/未截断/);
  const unchanged=(await request('/bootstrap')).data.notes.find(n=>n.id===textNote.id);assert.equal(unchanged.revision,textSummary.data.revision);assert.equal(unchanged.summary,textSummary.data.summary);
  const edit=await request('/notes/'+textNote.id,'PATCH',{revision:textSummary.data.revision,content:'改过的记录'});
  assert.equal(edit.data.summaryMode,'rule');assert.notEqual(edit.data.summary,textSummary.data.summary);
 }finally{
  await request('/settings','PATCH',{provider:{baseUrl:'',model:'',clearKey:true}});
  await new Promise(resolve=>model.close(resolve));
 }
});
test('each conversation turn offers optional memory proposals and resolves conflicts by user choice',async()=>{
 const existing=(await request('/memories','POST',{content:'我更喜欢喝咖啡。',scope:'通用'})).data;
 const active=(await request('/memories/'+existing.id,'PATCH',{revision:existing.revision,status:'active'})).data;
 const model=createServer(async(req,res)=>{let raw='';for await(const chunk of req)raw+=chunk;const payload=JSON.parse(raw);const prompt=payload.messages?.[1]?.content||'';const content=typeof prompt==='string'&&prompt.includes('只从用户这轮亲自说的话中提炼')?JSON.stringify({items:[{content:'我现在更喜欢喝茶。',conflictId:active.id},{content:'我喜欢安静的早晨。',conflictId:null}]}):typeof prompt==='string'&&prompt.includes('新记忆：')?JSON.stringify({conflictId:null}):'资料显示原有偏好。 [1]';res.setHeader('Content-Type','application/json');res.end(JSON.stringify({choices:[{message:{content},finish_reason:'stop'}]}));});
 await new Promise(resolve=>model.listen(0,'127.0.0.1',resolve));
 try{
  await request('/settings','PATCH',{provider:{baseUrl:`http://127.0.0.1:${model.address().port}`,model:'test-model',apiKey:'test-key'}});
  const turn=(await request('/ask','POST',{query:'我现在更喜欢喝茶，也喜欢安静的早晨。'})).data;
  assert.equal(turn.memoryReview,'pending');assert.equal(turn.memoryProposals.length,2);assert.equal(turn.memoryProposals[0].conflictId,active.id);
  const missingChoice=await request('/conversations/'+turn.id+'/memory-review','POST',{revision:turn.revision,selected:[{index:0}]});
  assert.equal(missingChoice.status,400);
  const review=await request('/conversations/'+turn.id+'/memory-review','POST',{revision:turn.revision,selected:[{index:0,keep:'existing'},{index:1,keep:'new'}]});
  assert.equal(review.status,200);assert.equal(review.data.memoryReview,'reviewed');assert.deepEqual(review.data.memoryProposals,[]);
  const memories=(await request('/bootstrap')).data.memories;
  assert.ok(memories.some(m=>m.id===active.id&&m.status==='active'));
  assert.ok(memories.some(m=>m.content==='我喜欢安静的早晨。'&&m.status==='active'));
  assert.equal(memories.some(m=>m.content==='我现在更喜欢喝茶。'),false);
  assert.equal((await request('/conversations/'+turn.id+'/memory-review','POST',{revision:review.data.revision,selected:[]})).status,409);
 }finally{await request('/settings','PATCH',{provider:{baseUrl:'',model:'',clearKey:true}});await new Promise(resolve=>model.close(resolve));}
});
test('high priority events review only when due and every reminder waits for user confirmation',async()=>{
 const future=new Date(Date.now()+60000).toISOString(),past=new Date(Date.now()-60000).toISOString();
 const event=(await request('/events','POST',{title:'复核发布计划',summary:'确认手机同步是否完成。',priority:'high',dueAt:future,tags:['发布'],project:'拾光'})).data;
 assert.equal(event.status,'open');assert.equal(event.reviewText,'');
 assert.equal((await request('/events/'+event.id+'/check','POST',{})).status,422);
 assert.equal((await request('/events/'+event.id+'/confirm','POST',{revision:event.revision})).status,422);
 const model=createServer(async(req,res)=>{for await(const _ of req){}res.setHeader('Content-Type','application/json');res.end(JSON.stringify({choices:[{message:{content:'建议核对手机端是否收到服务器确认，再由你确认。'},finish_reason:'stop'}]}));});
 await new Promise(resolve=>model.listen(0,'127.0.0.1',resolve));
 try{
  await request('/settings','PATCH',{provider:{baseUrl:`http://127.0.0.1:${model.address().port}`,model:'test-model',apiKey:'test-key'}});
  const due=(await request('/events/'+event.id,'PATCH',{revision:event.revision,dueAt:past})).data;
  assert.equal(due.reviewText,'');
  const earlyConfirm=await request('/events/'+event.id+'/confirm','POST',{revision:due.revision});
  assert.equal(earlyConfirm.status,409);assert.match(earlyConfirm.data.current.reviewText,/核对手机端/);
  const reviewed=(await request('/events/'+event.id+'/check','POST',{})).data;
  assert.match(reviewed.reviewText,/核对手机端/);assert.equal(reviewed.status,'open');
  const confirmed=(await request('/events/'+event.id+'/confirm','POST',{revision:reviewed.revision})).data;
  assert.equal(confirmed.status,'confirmed');assert.ok(confirmed.confirmedAt);
  const normal=(await request('/events','POST',{title:'普通提醒',summary:'查看记录',priority:'normal',dueAt:past})).data;
  assert.equal((await request('/events/'+normal.id+'/check','POST',{})).status,422);
  assert.equal((await request('/events/'+normal.id+'/confirm','POST',{revision:normal.revision})).data.status,'confirmed');
 }finally{await request('/settings','PATCH',{provider:{baseUrl:'',model:'',clearKey:true}});await new Promise(resolve=>model.close(resolve));}
});
test('AI event editing supplies a reviewable draft without saving an event',async()=>{
 const note=(await request('/notes','POST',{title:'登山计划',content:'周六去郊外登山，出发前检查天气和装备。',tags:['生活'],project:'周末'})).data;
 const model=createServer(async(req,res)=>{for await(const _ of req){}res.setHeader('Content-Type','application/json');res.end(JSON.stringify({choices:[{message:{content:JSON.stringify({title:'周六登山准备',summary:'出发前检查天气和装备。',tags:['生活','出行'],project:'周末',relatedEventIds:[]})},finish_reason:'stop'}]}));});
 await new Promise(resolve=>model.listen(0,'127.0.0.1',resolve));
 try{
  await request('/settings','PATCH',{provider:{baseUrl:`http://127.0.0.1:${model.address().port}`,model:'test-model',apiKey:'test-key'}});
  const before=(await request('/bootstrap')).data.events.length;
  const draft=await request('/events/suggest','POST',{noteId:note.id});
  assert.equal(draft.status,200);assert.equal(draft.data.title,'周六登山准备');assert.equal(draft.data.sourceNoteId,note.id);
  assert.equal((await request('/bootstrap')).data.events.length,before);
 }finally{await request('/settings','PATCH',{provider:{baseUrl:'',model:'',clearKey:true}});await new Promise(resolve=>model.close(resolve));}
});
test('event keeps copied source images and AI editing reads them',async()=>{
 const bytes=await readFile('tests/fixtures/sample.png');const form=new FormData();form.append('file',new Blob([bytes],{type:'image/png'}),'要事图片.png');
 const imported=await fetch(base+'/api/import',{method:'POST',headers:{cookie},body:form});assert.equal(imported.status,201);const note=await imported.json();
 const created=await request('/events','POST',{title:'图片中的要事',summary:'待核对图片内容',sourceNoteId:note.id,priority:'normal'});assert.equal(created.status,201);let event=created.data;assert.equal(event.images.length,1);assert.notEqual(event.images[0].key,note.attachments[0].key);
 const imageUrl=base+`/api/events/${event.id}/image/${event.images[0].id}`;let response=await fetch(imageUrl,{headers:{cookie}});assert.equal(response.status,200);assert.deepEqual(Buffer.from(await response.arrayBuffer()),bytes);
 const calls=[];const model=createServer(async(req,res)=>{let body='';for await(const chunk of req)body+=chunk;calls.push(JSON.parse(body));res.setHeader('Content-Type','application/json');res.end(JSON.stringify({choices:[{message:{content:JSON.stringify({title:'图片要事草稿',summary:'依据图片整理，待用户核对。',tags:['图片'],project:'',relatedEventIds:[]})},finish_reason:'stop'}]}));});
 await new Promise(resolve=>model.listen(0,'127.0.0.1',resolve));
 try{
  await request('/settings','PATCH',{provider:{baseUrl:`http://127.0.0.1:${model.address().port}`,model:'vision-test',apiKey:'test-key'}});
  const sourceDraft=await request('/events/suggest','POST',{noteId:note.id});assert.equal(sourceDraft.status,200);assert.equal(sourceDraft.data.analyzedImages,1);
  assert.equal((await request('/notes/'+note.id,'DELETE',{revision:note.revision})).status,200);
  const edited=await request('/events/'+event.id,'PATCH',{revision:event.revision,summary:'来源删除后仍可编辑'});assert.equal(edited.status,200);event=edited.data;assert.equal(event.images.length,1);
  response=await fetch(imageUrl,{headers:{cookie}});assert.equal(response.status,200);assert.deepEqual(Buffer.from(await response.arrayBuffer()),bytes);
  const draft=await request('/events/suggest','POST',{eventId:event.id});assert.equal(draft.status,200);assert.equal(draft.data.title,'图片要事草稿');assert.equal(draft.data.analyzedImages,1);
  assert.equal(calls.length,2);for(const call of calls){assert(Array.isArray(call.messages[1].content));assert.match(call.messages[1].content[1].image_url.url,/^data:image\/png;base64,/);}
  assert.equal((await request('/bootstrap')).data.events.find(item=>item.id===event.id).title,event.title);
 }finally{await request('/settings','PATCH',{provider:{baseUrl:'',model:'',clearKey:true}});await new Promise(resolve=>model.close(resolve));}
 assert.equal((await request('/events/'+event.id,'DELETE',{revision:event.revision})).status,200);
 assert.equal((await fetch(imageUrl,{headers:{cookie}})).status,404);
});
test('source content change requires re-confirming active memories',async()=>{
 const n=(await request('/notes','POST',{content:'我希望周报先写结论'})).data;const m=(await request('/memories','POST',{content:'先写结论',scope:'周报',sourceId:n.id})).data;await request('/memories/'+m.id,'PATCH',{revision:m.revision,status:'active'});await request('/notes/'+n.id,'PATCH',{revision:n.revision,content:'我现在希望周报先写风险'});assert.equal((await request('/bootstrap')).data.memories.find(x=>x.id===m.id).status,'candidate');
});
test('settings mutations are atomic when a later field is invalid',async()=>{
 const before=(await request('/settings')).data.name;const r=await request('/settings','PATCH',{name:'不应提交的名称',provider:{baseUrl:'not-a-url',model:'x'}});assert.equal(r.status,400);assert.equal((await request('/settings')).data.name,before);
});

test('AI image event draft excludes self links and can be saved with valid related events',async()=>{
 const bytes=await readFile('tests/fixtures/sample.png');const form=new FormData();form.append('file',new Blob([bytes],{type:'image/png'}),'related-image.png');
 const imported=await fetch(base+'/api/import',{method:'POST',headers:{cookie},body:form});assert.equal(imported.status,201);const note=await imported.json();
 const event=(await request('/events','POST',{title:'待编辑图片要事',sourceNoteId:note.id,priority:'normal'})).data;
 const other=(await request('/events','POST',{title:'有效关联要事',priority:'normal'})).data;
 let proposedIds=[event.id,other.id];const calls=[];
 const model=createServer(async(req,res)=>{let body='';for await(const chunk of req)body+=chunk;calls.push(JSON.parse(body));res.setHeader('Content-Type','application/json');res.end(JSON.stringify({choices:[{message:{content:JSON.stringify({title:'图片辅助编辑后的要事',summary:'核对图片后保存',tags:[],project:'',relatedEventIds:proposedIds})},finish_reason:'stop'}]}));});
 await new Promise(resolve=>model.listen(0,'127.0.0.1',resolve));
 try{
  await request('/settings','PATCH',{provider:{baseUrl:`http://127.0.0.1:${model.address().port}`,model:'vision-test',apiKey:'test-key'}});
  const draft=await request('/events/suggest','POST',{eventId:event.id});assert.equal(draft.status,200);
  assert.deepEqual(draft.data.relatedEventIds,[other.id]);
  assert.equal(draft.data.analyzedImages,1);
  const content=calls[0].messages[1].content;assert.match(content[1].image_url.url,/^data:image\/png;base64,/);
  const candidates=JSON.parse(content[0].text.split('可关联的要事：')[1]);assert(!candidates.some(item=>item.id===event.id));
  const saved=await request('/events/'+event.id,'PATCH',{...draft.data,revision:event.revision});assert.equal(saved.status,200);assert.deepEqual(saved.data.relatedEventIds,[other.id]);assert.deepEqual(saved.data.images,event.images);
  const image=await fetch(base+`/api/events/${event.id}/image/${event.images[0].id}`,{headers:{cookie}});assert.equal(image.status,200);assert.deepEqual(Buffer.from(await image.arrayBuffer()),bytes);
  const ids=[other.id];for(let i=0;i<11;i++)ids.push((await request('/events','POST',{title:'关联上限测试'+i,priority:'normal'})).data.id);
  proposedIds=[event.id,other.id,other.id,'nonexistent-event',null,...ids];
  const bounded=await request('/events/suggest','POST',{eventId:event.id,noteId:note.id});assert.equal(bounded.status,200);assert.equal(bounded.data.relatedEventIds.length,10);assert.equal(new Set(bounded.data.relatedEventIds).size,10);assert(!bounded.data.relatedEventIds.includes(event.id));
  const savedAgain=await request('/events/'+event.id,'PATCH',{...bounded.data,revision:saved.data.revision});assert.equal(savedAgain.status,200);
  assert.equal((await request('/events/'+event.id,'PATCH',{revision:savedAgain.data.revision,relatedEventIds:[event.id]})).status,400);
 }finally{await request('/settings','PATCH',{provider:{baseUrl:'',model:'',clearKey:true}});await new Promise(resolve=>model.close(resolve));}
});

test('settings schema rejects coercion and unknown fields without clearing saved credentials',async()=>{
 await request('/settings','PATCH',{provider:{baseUrl:'http://127.0.0.1:1',model:'validation-test',apiKey:'credential-without-standard-prefix'}});
 for(const body of [{provider:{baseUrl:'',model:'',clearKey:'false'}},{webSearch:{clearKey:1}},{provider:null},{name:'new',unexpected:true}]){
  const result=await request('/settings','PATCH',body);assert.equal(result.status,400);
  const saved=(await request('/settings')).data;assert.equal(saved.provider.hasKey,true);assert.equal(saved.provider.model,'validation-test');
  assert.equal(JSON.stringify(result.data).includes('credential-without-standard-prefix'),false);
 }
 await request('/settings','PATCH',{provider:{baseUrl:'',model:'',clearKey:true}});
});

test('model probe rejects a stale success after saved configuration changes',async()=>{
 let release,started;const received=new Promise(resolve=>{started=resolve;});
 const model=createServer(async(req,res)=>{for await(const _chunk of req){}started();await new Promise(resolve=>{release=resolve;});res.setHeader('Content-Type','application/json');res.end(JSON.stringify({choices:[{message:{content:'连接成功'}}]}));});
 await new Promise(resolve=>model.listen(0,'127.0.0.1',resolve));
 try{
  await request('/settings','PATCH',{provider:{baseUrl:`http://127.0.0.1:${model.address().port}`,model:'probe-old',clearKey:true}});
  const pending=request('/settings/test','POST',{});await received;
  await request('/settings','PATCH',{provider:{baseUrl:'http://127.0.0.1:1',model:'probe-new',clearKey:true}});
  release();const result=await pending;assert.equal(result.status,409);assert.match(result.data.error,/配置已更改/);
 }finally{release?.();await request('/settings','PATCH',{provider:{baseUrl:'',model:'',clearKey:true}});await new Promise(resolve=>model.close(resolve));}
});

test('capabilities separate vision failures from text success and use independent saved models',async()=>{
 const calls=[];const model=createServer(async(req,res)=>{
  let raw='';for await(const chunk of req)raw+=chunk;const body=JSON.parse(raw||'{}');calls.push(body);
  res.setHeader('Content-Type','application/json');
  if(body.model==='image-only'){res.statusCode=422;res.end(JSON.stringify({error:'images unsupported'}));}
  else if(req.url==='/embeddings')res.end(JSON.stringify({data:[{embedding:[0.2,0.1,0.3]}]}));
  else res.end(JSON.stringify({choices:[{message:{content:'连接成功'}}]}));
 });await new Promise(resolve=>model.listen(0,'127.0.0.1',resolve));const url=`http://127.0.0.1:${model.address().port}`;
 try{
  assert.equal((await request('/settings/capabilities','GET',undefined,false)).status,401);
  assert.equal((await request('/settings','PATCH',{provider:{baseUrl:url,model:'text-only',apiKey:'text-secret'},visionProvider:{baseUrl:url,model:'image-only',apiKey:'vision-secret'},retrieval:{embedding:url,model:'embedding-only',qdrant:'',apiKey:'embedding-secret'}})).status,200);
  assert.equal((await request('/settings/capabilities/text/test','POST',{})).data.ok,true);
  assert.equal((await request('/settings/capabilities/vision/test','POST',{})).data.ok,false);
  assert.equal((await request('/settings/capabilities/embedding/test','POST',{})).data.detail.dimensions,3);
  const list=(await request('/settings/capabilities')).data.items;assert.equal(list.find(x=>x.id==='text').test.ok,true);assert.equal(list.find(x=>x.id==='vision').test.ok,false);assert.equal(list.find(x=>x.id==='asr').configured,(await import('../server/ai/local-asr.mjs')).localAsrConfig().available);
  assert.equal(calls[0].model,'text-only');assert.equal(calls[1].model,'image-only');assert.ok(Array.isArray(calls[1].messages[1].content));
  const png=Buffer.from(calls[1].messages[1].content[1].image_url.url.split(',')[1],'base64');assert.equal(png.readUInt32BE(16),32);for(let offset=8;offset<png.length;){const size=png.readUInt32BE(offset);assert.equal(crc32(png.subarray(offset+4,offset+8+size)),png.readUInt32BE(offset+8+size));offset+=size+12;}
  assert.equal(JSON.stringify(list).includes('vision-secret'),false);assert.equal(JSON.stringify(list).includes('embedding-secret'),false);
  await request('/settings','PATCH',{visionProvider:null});assert.equal((await request('/settings/capabilities')).data.items.find(x=>x.id==='vision').test,null);
  assert.equal((await request('/settings/capabilities/unknown/test','POST',{})).status,400);
 }finally{
  await request('/settings','PATCH',{provider:{baseUrl:'',model:'',clearKey:true},visionProvider:null,retrieval:{embedding:'',model:'',qdrant:'',clearKey:true}});
  await new Promise(resolve=>model.close(resolve));
 }
});

test('document import is idempotent and corrupt originals remain downloadable after parsing fails',async()=>{
 const upload=async(opId,bytes)=>{const form=new FormData();form.append('opId',opId);form.append('file',new Blob([bytes]),'broken.pdf');const response=await fetch(base+'/api/import',{method:'POST',headers:{cookie},body:form});return {status:response.status,data:await response.json()};};
 const first=await upload('broken-pdf-operation-1','not a pdf');assert.equal(first.status,201);assert.equal(first.data.status,'processing');
 const again=await upload('broken-pdf-operation-1','not a pdf');assert.equal(again.data.id,first.data.id);
 assert.equal((await upload('broken-pdf-operation-1','different bytes')).status,409);
 let processing;for(let i=0;i<150;i++){processing=(await request('/notes/'+first.data.id+'/processing')).data;if(processing.job.state==='failed')break;await new Promise(resolve=>setTimeout(resolve,100));}
 assert.equal(processing.job.state,'failed');assert.ok(processing.job.error);
 const original=await fetch(base+'/api/notes/'+first.data.id+'/file/'+first.data.attachments[0].id,{headers:{cookie}});assert.equal(await original.text(),'not a pdf');
 const boot=(await request('/bootstrap')).data;assert.equal(boot.notes.filter(n=>n.id===first.data.id).length,1);
 assert.equal((await request('/notes/'+first.data.id+'/processing','POST',{action:'retry',revision:first.data.revision})).status,200);
 await request('/notes/'+first.data.id+'/processing','POST',{action:'cancel',revision:first.data.revision});
 assert.equal((await request('/notes/'+first.data.id+'/processing')).data.job.state,'cancelled');
});

 test('note category save is atomic, manual, and retry-safe',async()=>{
 const body={title:'新建时分类',content:'自己的原文',categoryId:'category-idea',opId:'create-with-category-1'};
 const first=await request('/notes','POST',body);assert.equal(first.status,201);assert.equal(first.data.categoryId,'category-idea');assert.equal(first.data.classification.state,'manual');
 const count=async()=> (await request('/classification-corrections?limit=100')).data.items.filter(row=>row.sourceId===first.data.id).length;
 assert.equal(await count(),1);assert.equal((await request('/notes','POST',body)).data.id,first.data.id);assert.equal(await count(),1);
 const invalid=await request('/notes/'+first.data.id,'PATCH',{revision:first.data.revision,content:'不能写入',categoryId:'missing'});assert.equal(invalid.status,404);
 let saved=(await request('/bootstrap')).data.notes.find(n=>n.id===first.data.id);assert.equal(saved.content,body.content);assert.equal(await count(),1);
 const edited=await request('/notes/'+first.data.id,'PATCH',{revision:first.data.revision,content:'新原文',categoryId:'category-reading'});assert.equal(edited.status,200);assert.equal(edited.data.categoryId,'category-reading');assert.equal(await count(),2);
 assert.equal((await request('/notes/'+first.data.id,'PATCH',{revision:first.data.revision,categoryId:'category-work'})).status,409);assert.equal(await count(),2);
 const retry=await request('/notes','POST',body);assert.equal(retry.data.revision,edited.data.revision);assert.equal(retry.data.categoryId,'category-reading');
 assert.equal((await request('/notes','POST',{...body,categoryId:'category-life'})).status,409);
 const before=(await request('/bootstrap')).data.notes.length;assert.equal((await request('/notes','POST',{content:'无效类别不产生新记录',categoryId:'missing'})).status,404);assert.equal((await request('/bootstrap')).data.notes.length,before);
 });

test('import category and original save atomically with payload-aware retry',async()=>{
 const upload=async(categoryId,opId)=>{const form=new FormData();form.append('file',new Blob(['全文原文\n保留文件'],{type:'text/plain'}),'分类导入.txt');form.append('opId',opId);if(categoryId!==undefined)form.append('categoryId',categoryId);const response=await fetch(base+'/api/import',{method:'POST',headers:{cookie},body:form});return {status:response.status,data:await response.json()};};
 const before=(await request('/bootstrap')).data.notes.length;
 assert.equal((await upload('missing','import-category-rollback')).status,404);assert.equal((await request('/bootstrap')).data.notes.length,before);
 const first=await upload('category-reading','import-category-stable');assert.equal(first.status,201);assert.equal(first.data.categoryId,'category-reading');assert.equal(first.data.classification.state,'manual');assert.equal(first.data.content,'全文原文\n保留文件');
 assert.equal((await upload('category-reading','import-category-stable')).data.id,first.data.id);assert.equal((await upload('category-work','import-category-stable')).status,409);
 const feedback=(await request('/classification-corrections?limit=100')).data.items.filter(c=>c.sourceId===first.data.id);assert.equal(feedback.length,1);
 const file=await fetch(base+'/api/notes/'+first.data.id+'/file/'+first.data.attachments[0].id,{headers:{cookie}});assert.equal(file.status,200);assert.equal(await file.text(),'全文原文\n保留文件');
});

test('carry todo concurrent requests create one dated copy without changing the source',async()=>{
 const format=date=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
 const today=format(new Date()),yesterday=format(new Date(Date.now()-86400000));const source=(await request('/todos','POST',{title:'并发转移待办',day:yesterday})).data;
 const replies=await Promise.all(Array.from({length:4},()=>request('/todos/'+source.id+'/carry','POST',{revision:source.revision,targetDay:today})));
 assert.ok(replies.every(r=>r.status===200));assert.equal(new Set(replies.map(r=>r.data.id)).size,1);
 const todos=(await request('/bootstrap')).data.todos;assert.equal(todos.filter(t=>t.carriedFromId===source.id&&t.day===today).length,1);assert.equal(todos.find(t=>t.id===source.id).revision,source.revision);
 assert.equal((await request('/todos/'+source.id,'PATCH',{revision:source.revision,done:'false'})).status,400);
});

test('artifact generation rejects source changes and truncated output instead of saving stale drafts',async()=>{
 let received,release;const seen=new Promise(r=>received=r);let responseReady=new Promise(r=>release=r),truncated=false;
 const model=createServer(async(req,res)=>{for await(const chunk of req){}received();await responseReady;res.setHeader('Content-Type','application/json');res.end(JSON.stringify({choices:[{finish_reason:truncated?'length':'stop',message:{content:JSON.stringify({sections:[{heading:'资料要点',excerpt_ids:[1]}]})}}]}));});
 await new Promise(r=>model.listen(0,'127.0.0.1',r));
 try{
  await request('/settings','PATCH',{provider:{baseUrl:`http://127.0.0.1:${model.address().port}`,model:'artifact-fixture',apiKey:'fixture'}});
  const note=(await request('/notes','POST',{title:'版本校验来源',project:'版本竞态',content:'本周完成原始资料整理，下一步计划校对会议记录。'})).data;
  const before=(await request('/bootstrap')).data.artifacts.length;
  const pending=request('/tasks','POST',{template:'weekly',project:'版本竞态',days:7});await seen;await request('/notes/'+note.id,'PATCH',{revision:note.revision,content:'来源已被修订，先前描述不再准确。'});release();assert.equal((await pending).status,409);assert.equal((await request('/bootstrap')).data.artifacts.length,before);
  truncated=true;responseReady=Promise.resolve();const cut=await request('/tasks','POST',{template:'weekly',project:'版本竞态',days:7});assert.equal(cut.status,502);assert.match(cut.data.error,/截断/);assert.equal((await request('/bootstrap')).data.artifacts.length,before);
 }finally{release();await request('/settings','PATCH',{provider:{baseUrl:'',model:'',clearKey:true}});await new Promise(r=>model.close(r));}
});
test('source discussion maps once, restores current references, and preserves independent history',async()=>{
 const note=(await request('/notes','POST',{title:'同名来源',content:'这份项目记录计划明天整理资料，尚未开始。'})).data;
 const event=(await request('/events','POST',{title:'同名来源',summary:'记录对应的独立要事',priority:'normal',sourceNoteId:note.id})).data;
 const targets=await Promise.all(Array.from({length:4},()=>request('/source-threads','POST',{kind:'note',id:note.id})));assert.ok(targets.every(r=>r.status===200));assert.equal(new Set(targets.map(r=>r.data.threadId)).size,1);const target=targets[0].data;
 const eventTarget=(await request('/source-threads','POST',{kind:'event',id:event.id})).data;assert.notEqual(eventTarget.threadId,target.threadId);
 assert.deepEqual((await request('/threads/'+target.threadId+'/turns')).data.items,[]);
 const first=await request('/ask','POST',{query:'这份项目记录有什么计划？',threadId:target.threadId,references:[{kind:'note',id:note.id}]});assert.equal(first.status,200);assert.equal(first.data.threadId,target.threadId);assert.equal(first.data.references[0].revision,note.revision);
 const edited=(await request('/notes/'+note.id,'PATCH',{revision:note.revision,title:'修改后的来源',content:'改为后天整理资料，还没有完成。'})).data;
 const reopened=(await request('/source-threads','POST',{kind:'note',id:note.id})).data;assert.equal(reopened.threadId,target.threadId);assert.equal(reopened.reference.revision,edited.revision);assert.equal(reopened.reference.title,'修改后的来源');
 assert.equal((await request('/threads/'+target.threadId+'/turns')).data.items[0].references[0].title,'同名来源');
 assert.equal((await request('/threads/'+target.threadId,'DELETE')).status,200);assert.equal((await request('/source-threads','POST',{kind:'note',id:note.id})).status,410);assert.equal((await request('/ask','POST',{query:'继续',threadId:target.threadId})).status,404);
 assert.equal((await request('/source-threads','POST',{kind:'libraryFile',id:note.id})).status,400);
 assert.equal((await request('/notes/'+note.id,'DELETE',{revision:edited.revision})).status,200);assert.equal((await request('/source-threads','POST',{kind:'note',id:note.id})).status,404);assert.equal((await request('/source-threads','POST',{kind:'event',id:event.id})).data.threadId,eventTarget.threadId);
});
test('ask operation retries preserve one turn and validate pinned source revisions',async()=>{
 const note=(await request('/notes','POST',{title:'发送幂等来源',content:'打算明天学习，尚未完成。'})).data;
 const payload={opId:'ask-api-retry-1',query:'我的学习计划是什么？',references:[{kind:'note',id:note.id,revision:note.revision}]};const responses=await Promise.all(Array.from({length:3},()=>request('/ask','POST',payload)));assert.ok(responses.every(r=>r.status===200));assert.equal(new Set(responses.map(r=>r.data.id)).size,1);const turn=responses[0].data;
 await request('/notes/'+note.id,'PATCH',{revision:note.revision,content:'改为后天学习。'});assert.equal((await request('/ask','POST',payload)).data.id,turn.id);assert.equal((await request('/ask','POST',{...payload,opId:'ask-new-stale-1'})).status,409);assert.equal((await request('/ask','POST',{...payload,query:'改变问题'})).status,409);
 assert.equal((await request('/threads/'+turn.threadId,'DELETE')).status,200);assert.equal((await request('/ask','POST',payload)).status,410);
});
