import {test,expect} from '@playwright/test';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
test('multi-image text summary shows its scope and rejects stale or empty model results',async({page})=>{
 test.skip(process.env.SHIGUANG_E2E_SUP_AUDIO!=='1','Uses isolated fixture without background classification');
 const calls:any[]=[];let release!:()=>void,started!:()=>void;
 const gate=new Promise<void>(r=>release=r),seen=new Promise<void>(r=>started=r);
 const model=createServer(async(req,res)=>{
  let raw='';for await(const part of req)raw+=part;calls.push(JSON.parse(raw));const call=calls.length;
  if(call===1){started();await gate;}
  res.setHeader('Content-Type','application/json');res.end(JSON.stringify({choices:[{message:{content:call===3?'':call===1?'过期图片摘要':'已结合新版补充正文和两张图片归纳，图片细节需人工核对。'},finish_reason:'stop'}]}));
 });
 await new Promise<void>((resolve,reject)=>{model.once('error',reject);model.listen(0,'127.0.0.1',resolve);});
 try{
  await page.goto('/');await page.getByRole('button',{name:'进入演示空间'}).click();await expect(page.locator('.app-shell')).toBeVisible();
  const image=await readFile('tests/fixtures/sample.png');let note=await(await page.request.post('/api/v1/notes',{data:{title:'图文归纳范围',content:'必须和图片一起读取的正文。'}})).json();
  for(const name of ['第一张.png','第二张.png']){const response=await page.request.post('/api/v1/notes/'+note.id+'/images',{multipart:{revision:String(note.revision),images:{name,mimeType:'image/png',buffer:image}}});expect(response.ok()).toBe(true);note=await response.json();}
  expect(note.type).toBe('text');const originalImages=note.attachments;
  await page.request.patch('/api/v1/settings',{data:{visionProvider:{baseUrl:`http://127.0.0.1:${(model.address() as {port:number}).port}`,model:'vision-scope-test',apiKey:'test-key'}}});
  await page.reload();await page.getByLabel('搜索记录').fill(note.title);await page.locator('.note-card').filter({hasText:note.title}).locator('.note-card-body').click();
  await expect(page.locator('.attachment img')).toHaveCount(2);await page.getByRole('button',{name:'AI 归纳',exact:true}).click();await seen;
  const patched=await page.request.patch('/api/v1/notes/'+note.id,{data:{revision:note.revision,content:'新版补充正文：两张图片是讨论材料，不是已完成证明。'}});expect(patched.ok()).toBe(true);note=await patched.json();release();
  await expect(page.getByRole('dialog')).toContainText('归纳期间记录已更新');await expect(page.locator('.note-summary')).toHaveCount(0);
  const done=page.waitForResponse(r=>r.url().endsWith('/summarize')&&r.request().method()==='POST');await page.getByRole('button',{name:'AI 归纳',exact:true}).click();const response=await done;expect(response.ok()).toBe(true);const summarized=await response.json();
  expect(calls).toHaveLength(2);expect(calls[1].model).toBe('vision-scope-test');const parts=calls[1].messages[1].content;expect(parts).toHaveLength(3);expect(parts[0].text).toContain(note.content);for(const part of parts.slice(1))expect(part.image_url.url).toBe('data:image/png;base64,'+image.toString('base64'));
  expect(summarized.summaryInputs.imageIds).toEqual(originalImages.map((a:any)=>a.id));expect(summarized.summaryInputs.sourceRevision).toBe(note.revision);expect(summarized.attachments).toEqual(originalImages);
  await page.getByText('本次归纳读取范围',{exact:true}).click();await expect(page.locator('.note-summary')).toContainText('图片 2 张');for(const name of ['第一张.png','第二张.png'])await expect(page.locator('.note-summary')).toContainText(name);
  await page.getByRole('button',{name:'AI 归纳',exact:true}).click();await expect(page.getByRole('dialog')).toContainText('模型返回了空内容');await expect(page.locator('.note-summary')).toContainText(summarized.summary);
  const boot=await(await page.request.get('/api/v1/bootstrap')).json();const saved=boot.notes.find((n:any)=>n.id===note.id);expect(saved.summary).toBe(summarized.summary);expect(saved.revision).toBe(summarized.revision);expect(calls).toHaveLength(3);
 }finally{release();await page.request.patch('/api/v1/settings',{data:{visionProvider:null}}).catch(()=>{});model.closeAllConnections();await new Promise<void>(resolve=>model.close(()=>resolve()));}
});
