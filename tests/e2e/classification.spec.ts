import {test,expect} from '@playwright/test';
import {createServer} from 'node:http';
test('automatic classification runs through worker and late results cannot replace a manual choice',async({page})=>{
 let release:()=>void=()=>{},waiting=false;
 const model=createServer(async(req,res)=>{let text='';for await(const chunk of req)text+=chunk;const payload=JSON.parse(text);if(payload.messages[1].content.includes('迟到分类验收')){waiting=true;await new Promise<void>(resolve=>release=resolve);}res.setHeader('Content-Type','application/json');res.end(JSON.stringify({choices:[{message:{content:JSON.stringify({categoryId:'category-life',reason:'生活日常记录'})},finish_reason:'stop'}]}));});await new Promise<void>(r=>model.listen(0,'127.0.0.1',r));
 try{
  await page.goto('/');await page.getByRole('button',{name:'进入演示空间'}).click();await expect(page.locator('.app-shell')).toBeVisible();const address=model.address();if(!address||typeof address==='string')throw new Error('No model port');
  await page.request.patch('/api/settings',{data:{provider:{baseUrl:`http://127.0.0.1:${address.port}`,model:'fixture-classifier'}}});
  const first=await (await page.request.post('/api/notes',{data:{title:'自动分类验收',content:'今天去公园散步。'}})).json();
  await expect.poll(async()=>{const r=await page.request.get(`/api/notes/${first.id}/classification`);return (await r.json()).note.categoryId;}).toBe('category-life');
  const second=await (await page.request.post('/api/notes',{data:{title:'迟到分类验收',content:'这一条需要人工调整。'}})).json();await expect.poll(()=>waiting).toBe(true);
  await page.reload();await page.locator('.note-card').filter({has:page.getByRole('heading',{name:'迟到分类验收',exact:true})}).locator('.note-card-body').click();const panel=page.getByLabel('记录分类状态');await panel.getByLabel('调整记录类别',{exact:true}).selectOption('category-work');await panel.getByRole('button',{name:'保存分类调整'}).click();await expect(panel).toContainText('个人工作 · 人工选择');release();
  await expect.poll(async()=>{const r=await page.request.get(`/api/notes/${second.id}/classification`);return (await r.json()).job.state;}).toBe('failed');
  const current=await (await page.request.get(`/api/notes/${second.id}/classification`)).json();expect(current.note.categoryId).toBe('category-work');expect(current.note.classification.state).toBe('manual');
  const feedback=await (await page.request.get('/api/classification-corrections')).json();expect(feedback.items.filter((r:{sourceId:string})=>r.sourceId===second.id)).toHaveLength(1);
 }finally{release();await new Promise<void>(r=>model.close(()=>r()));}
});
