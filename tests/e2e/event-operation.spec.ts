import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
test('image event create and edit recover lost confirmations without duplicate copies',async({page})=>{
 await page.goto('/#events');await page.getByRole('button',{name:'进入演示空间'}).click();await expect(page.locator('.app-shell')).toBeVisible();
 const image=await readFile('tests/fixtures/sample.png');const imported=await page.request.post('/api/v1/import',{multipart:{file:{name:'保存恢复图片.png',mimeType:'image/png',buffer:image}}});expect(imported.ok()).toBe(true);const note=await imported.json();
 await page.reload();await page.getByRole('button',{name:'新建要事',exact:true}).click();
 let dialog=page.getByRole('dialog',{name:'新建要事'});await dialog.getByLabel('从记录转为要事（可选）').selectOption(note.id);
 const title='图片要事保存恢复';await dialog.getByLabel('标题',{exact:true}).fill(title);await dialog.getByLabel('事情发生日期（可不填写）').fill('2024-02-29');
 await expect(dialog.locator('.event-images img')).toHaveCount(1);
 let createCount=0,createBody:any;
 await page.route('**/api/v1/events',async route=>{
  if(route.request().method()!=='POST')return route.continue();const body=route.request().postDataJSON();createCount++;
  if(createCount===1){createBody=body;expect(body.opId).toBeTruthy();expect((await route.fetch()).ok()).toBe(true);return route.abort('failed');}
  expect(body).toEqual(createBody);return route.fulfill({response:await route.fetch()});
 });
 await dialog.getByRole('button',{name:'确认并保存要事'}).click();await expect(dialog).toContainText('连接暂时中断');
 const matching=async()=>{const b=await(await page.request.get('/api/v1/bootstrap')).json();return b.events.filter((e:any)=>e.title===title);};
 const before=await matching();expect(before).toHaveLength(1);expect(before[0].images).toHaveLength(1);expect(before[0].occurredAt).toBe('2024-02-29');expect(before[0].dueAt||'').toBe('');
 await page.reload();await page.getByRole('button',{name:'重试未确认的要事操作',exact:true}).click();await expect(page.getByRole('button',{name:'重试未确认的要事操作',exact:true})).toHaveCount(0);
 const recovered=await matching();expect(recovered).toHaveLength(1);expect(recovered[0]).toEqual(before[0]);expect(createCount).toBe(2);
 const event=recovered[0],card=page.locator('#event-'+event.id);await expect(card).toContainText('发生日期：2024-02-29');await expect(card).toContainText('未设提醒');
 const imageUrl='/api/v1/events/'+event.id+'/image/'+event.images[0].id;expect(await(await page.request.get(imageUrl)).body()).toEqual(image);
 await card.getByRole('button',{name:'编辑',exact:true}).click();dialog=page.getByRole('dialog',{name:'编辑要事'});await expect(dialog.getByLabel('事情发生日期（可不填写）')).toHaveValue('2024-02-29');
 await dialog.getByRole('textbox',{name:'摘要',exact:true}).fill('编辑后仍保留图片及发生日期');
 await page.waitForTimeout(50);await expect(dialog.getByRole('textbox',{name:'摘要',exact:true})).toBeFocused();await expect(dialog.getByLabel('标题',{exact:true})).toHaveValue(title);
 let edits=0,editBody:any;
 await page.route('**/api/v1/events/'+event.id,async route=>{
  if(route.request().method()!=='PATCH')return route.continue();edits++;const body=route.request().postDataJSON();
  if(edits===1){editBody=body;expect((await route.fetch()).ok()).toBe(true);return route.abort('failed');}
  expect(body).toEqual(editBody);return route.fulfill({response:await route.fetch()});
 });
 await dialog.getByRole('button',{name:'确认并保存要事'}).click();await expect(dialog).toContainText('连接暂时中断');const edited=(await matching())[0];
 await page.reload();await page.getByRole('button',{name:'重试未确认的要事操作',exact:true}).click();await expect(page.getByRole('button',{name:'重试未确认的要事操作',exact:true})).toHaveCount(0);
 expect((await matching())[0]).toEqual(edited);expect(edits).toBe(2);expect(edited.revision).toBe(event.revision+1);expect(edited.images).toEqual(event.images);
 await page.getByLabel('搜索要事',{exact:true}).fill('2024-02-29');await expect(card).toBeVisible();await expect(card).toContainText('编辑后仍保留图片及发生日期');
 expect(await(await page.request.get(imageUrl)).body()).toEqual(image);
});
test('lost schedule response survives reload and retries the same operation without another occurrence',async({page})=>{
 await page.goto('/#events');await page.getByRole('button',{name:'进入演示空间'}).click();await expect(page.locator('.app-shell')).toBeVisible();
 const created=await page.request.post('/api/v1/events',{data:{title:'检查操作断网重试',eventType:'long_term',priority:'normal'}});expect(created.ok()).toBe(true);const event=await created.json();let requests=0,original:any;
 await page.route('**/api/v1/events/'+event.id+'/schedule',async route=>{requests++;const body=route.request().postDataJSON();expect(typeof body.opId).toBe('string');if(requests===1){original=body;const response=await route.fetch();expect(response.ok()).toBe(true);return route.abort('failed');}expect(body).toEqual(original);return route.fulfill({response:await route.fetch()});});
 await page.reload();await page.locator('#event-'+event.id).getByRole('button',{name:'检查历史 / 安排'}).click();const dialog=page.getByRole('dialog',{name:'检查历史与安排'});await dialog.getByLabel('下一次检查时间').fill('2099-01-01T10:00');await dialog.getByRole('button',{name:'安排下一次检查'}).click();await expect(dialog).toContainText('连接暂时中断');
 const before=await (await page.request.get('/api/v1/events/'+event.id+'/checks')).json();expect(before.items).toHaveLength(1);
 await page.reload();await page.getByRole('button',{name:'重试未确认的要事操作',exact:true}).click();await expect(page.getByRole('button',{name:'重试未确认的要事操作',exact:true})).toHaveCount(0);expect(requests).toBe(2);
 const after=await (await page.request.get('/api/v1/events/'+event.id+'/checks')).json();expect(after.items).toHaveLength(1);expect(after.items[0].id).toBe(before.items[0].id);expect(after.items[0].revision).toBe(before.items[0].revision);
});
