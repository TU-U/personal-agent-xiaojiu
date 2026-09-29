import {test,expect} from '@playwright/test';

test('a due high-priority event appears on the home page and waits for explicit confirmation',async({page})=>{
 const title='到点复核手机同步 '+Date.now()+Math.random().toString(36).slice(2,5);
 await page.goto('/');await page.getByRole('button',{name:'进入演示空间'}).click();
 await page.goto('/#events');await page.getByRole('button',{name:'新建要事'}).click();
 const dialog=page.getByRole('dialog',{name:'新建要事'});
 await dialog.getByLabel('标题',{exact:true}).fill(title);
 await dialog.getByLabel('摘要').fill('检查手机记录是否已经在电脑上出现。');
 await dialog.getByLabel('等级').selectOption('high');
 await dialog.getByLabel('约定检查时间').fill('2020-01-01T10:00');
 await dialog.getByRole('button',{name:'确认并保存要事'}).click();
 const card=page.locator('.event-card').filter({hasText:title});
 await expect(card).toContainText('待你确认');
 await card.getByRole('button',{name:/^(立即|重新)复核$/}).click();
 await expect(card).toContainText('未配置 AI 模型');
 await page.goto('/#library');await expect(page.locator('.home-todos')).toContainText(title);
 await page.locator('.home-todos').getByRole('button',{name:new RegExp(title)}).click();
 await card.getByRole('button',{name:'确认提醒'}).click();
 await expect(card).toContainText('已确认');
 await page.goto('/#library');await expect(page.locator('.home-todos').getByText(title)).toHaveCount(0);
});

test('related events show complete titles beside usable checkboxes on desktop and mobile',async({page})=>{
 const relatedTitle='Ozon 跨境电商实战流程：选品、商品上架、物流与支付结算、合规风控及 AI 工具工作流'.repeat(2)+' '+Date.now()+Math.random().toString(36).slice(2,5);
 const newTitle='新要事与 Ozon 关联 '+Date.now()+Math.random().toString(36).slice(2,5);
 await page.goto('/');await page.getByRole('button',{name:'进入演示空间'}).click();
 await page.goto('/#events');await page.getByRole('button',{name:'新建要事'}).click();
 let dialog=page.getByRole('dialog',{name:'新建要事'});
 await dialog.getByLabel('标题',{exact:true}).fill(relatedTitle);
 await dialog.getByRole('button',{name:'确认并保存要事'}).click();
 await expect(dialog).toHaveCount(0);

 await page.getByRole('button',{name:'新建要事'}).click();
 dialog=page.getByRole('dialog',{name:'新建要事'});
 const option=dialog.locator('.event-related-option').filter({hasText:relatedTitle});
 const checkbox=option.locator('input[type="checkbox"]');
 await expect(option).toBeVisible();
 await expect(option.locator('.event-related-title')).toHaveText(relatedTitle);
 const layout=await option.evaluate(element=>{
  const label=element.getBoundingClientRect();
  const box=element.querySelector('input')!.getBoundingClientRect();
  const title=element.querySelector('.event-related-title')!.getBoundingClientRect();
  return {labelRight:label.right,checkboxWidth:box.width,checkboxRight:box.right,titleLeft:title.left,titleRight:title.right,scrollWidth:element.scrollWidth,clientWidth:element.clientWidth};
 });
 expect(layout.checkboxWidth).toBeLessThan(30);
 expect(layout.checkboxRight).toBeLessThan(layout.titleLeft);
 expect(layout.titleRight).toBeLessThanOrEqual(layout.labelRight);
 expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth+1);
 await checkbox.check();
 await expect(checkbox).toBeChecked();
 await dialog.getByLabel('标题',{exact:true}).fill(newTitle);
 await dialog.getByRole('button',{name:'确认并保存要事'}).click();
 await expect(page.locator('.event-card').filter({hasText:newTitle})).toContainText(relatedTitle);
});

test('AI editing an image event saves its draft without a hidden self-reference',async({page})=>{
 const {createServer}=await import('node:http');const {readFile}=await import('node:fs/promises');
 let release!:()=>void,started!:()=>void;const gate=new Promise<void>(r=>release=r),seen=new Promise<void>(r=>started=r);let held=false;
 let eventId='',relatedId='';const model=createServer(async(req,res)=>{let raw='';for await(const chunk of req)raw+=chunk;if(raw.includes('要事整理助手')&&!held){held=true;expect(raw).toContain('data:image/png;base64,');started();await gate;}res.setHeader('Content-Type','application/json');res.end(JSON.stringify({choices:[{message:{content:JSON.stringify({title:'图片辅助编辑可保存',summary:'依据图片生成的草稿',tags:['图片'],project:'',relatedEventIds:[eventId,relatedId,relatedId,'invalid-id']})},finish_reason:'stop'}]}));});
 await new Promise<void>(resolve=>model.listen(0,'127.0.0.1',resolve));
 try{
  await page.goto('/');const loggedIn=page.waitForResponse(response=>response.url().endsWith('/api/bootstrap')&&response.status()===200);await page.getByRole('button',{name:'进入演示空间'}).click();await loggedIn;
  const imported=await page.request.post('/api/import',{multipart:{file:{name:'event.png',mimeType:'image/png',buffer:await readFile('tests/fixtures/sample.png')}}});expect(imported.status()).toBe(201);const note=await imported.json();
  const created=await page.request.post('/api/events',{data:{eventType:'one_off',title:'需要图片辅助的要事',sourceNoteId:note.id,priority:'normal'}});expect(created.status()).toBe(201);const event=await created.json();eventId=event.id;
  const related=await page.request.post('/api/events',{data:{title:'保留的有效关联',priority:'normal'}});relatedId=(await related.json()).id;
  const address=model.address();if(!address||typeof address==='string')throw new Error('model address missing');
  await page.request.patch('/api/settings',{data:{provider:{baseUrl:`http://127.0.0.1:${address.port}`,model:'vision-test',apiKey:'test-key'}}});
  await page.goto('/#events');await page.locator('#event-'+eventId).getByRole('button',{name:'编辑',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'编辑要事'});await expect(dialog.locator('.event-images img')).toHaveCount(1);
  await dialog.getByRole('button',{name:'交由 AI 辅助编辑'}).click();await seen;
  await expect(dialog.getByLabel('标题',{exact:true})).toBeDisabled();await expect(dialog.getByLabel('从记录转为要事（可选）')).toBeDisabled();
  const sourceUpdate=await page.request.patch('/api/notes/'+note.id,{data:{revision:note.revision,content:'生成期间来源发生变化'}});expect(sourceUpdate.ok()).toBe(true);release();
  await expect(dialog).toContainText('辅助编辑期间来源已变化');await expect(dialog.getByLabel('标题',{exact:true})).toHaveValue('需要图片辅助的要事');
  await dialog.getByRole('button',{name:'交由 AI 辅助编辑'}).click();await expect(dialog.getByLabel('标题',{exact:true})).toHaveValue('图片辅助编辑可保存');
  await expect(dialog).toContainText('不能关联自身');await expect(dialog).toContainText('重复建议');await expect(dialog).toContainText('不在本次候选范围');
  await expect(dialog.locator('.event-related-option').filter({hasText:'保留的有效关联'}).getByRole('checkbox')).toBeChecked();
  await dialog.getByRole('button',{name:'确认并保存要事'}).click();await expect(dialog).toHaveCount(0);
  const card=page.locator('#event-'+eventId);await expect(card).toContainText('图片辅助编辑可保存');await expect(card).toContainText('保留的有效关联');await expect(card.locator('.event-images img')).toHaveCount(1);
  const boot=await (await page.request.get('/api/bootstrap')).json();const saved=boot.events.find((item:{id:string})=>item.id===eventId);expect(saved.relatedEventIds).toEqual([relatedId]);expect(saved.images).toEqual(event.images);
  const latestNotes=boot.notes.find((item:{id:string})=>item.id===note.id);const deleted=await page.request.delete('/api/notes/'+note.id,{data:{revision:latestNotes.revision}});expect(deleted.ok()).toBe(true);const photo=await page.request.get('/api/events/'+eventId+'/image/'+saved.images[0].id);expect(photo.ok()).toBe(true);expect(await photo.body()).toEqual(await readFile('tests/fixtures/sample.png'));
  const editedAfterDelete=await page.request.patch('/api/events/'+eventId,{data:{revision:saved.revision,title:'来源删除后仍可编辑'}});expect(editedAfterDelete.ok()).toBe(true);expect((await editedAfterDelete.json()).images).toEqual(saved.images);
 }finally{release();await page.request.patch('/api/settings',{data:{provider:{baseUrl:'',model:'',clearKey:true}}});await new Promise<void>(resolve=>model.close(()=>resolve()));}
});
