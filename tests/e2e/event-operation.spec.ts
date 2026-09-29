import {test,expect} from '@playwright/test';
test('lost schedule response survives reload and retries the same operation without another occurrence',async({page})=>{
 await page.goto('/#events');await page.getByRole('button',{name:'进入演示空间'}).click();await expect(page.locator('.app-shell')).toBeVisible();
 const created=await page.request.post('/api/events',{data:{title:'检查操作断网重试',eventType:'long_term',priority:'normal'}});expect(created.ok()).toBe(true);const event=await created.json();let requests=0,original:any;
 await page.route('**/api/events/'+event.id+'/schedule',async route=>{requests++;const body=route.request().postDataJSON();expect(typeof body.opId).toBe('string');if(requests===1){original=body;const response=await route.fetch();expect(response.ok()).toBe(true);return route.abort('failed');}expect(body).toEqual(original);return route.fulfill({response:await route.fetch()});});
 await page.reload();await page.locator('#event-'+event.id).getByRole('button',{name:'检查历史 / 安排'}).click();const dialog=page.getByRole('dialog',{name:'检查历史与安排'});await dialog.getByLabel('下一次检查时间').fill('2099-01-01T10:00');await dialog.getByRole('button',{name:'安排下一次检查'}).click();await expect(dialog).toContainText('连接暂时中断');
 const before=await (await page.request.get('/api/events/'+event.id+'/checks')).json();expect(before.items).toHaveLength(1);
 await page.reload();await page.getByRole('button',{name:'重试未确认的要事操作',exact:true}).click();await expect(page.getByRole('button',{name:'重试未确认的要事操作',exact:true})).toHaveCount(0);expect(requests).toBe(2);
 const after=await (await page.request.get('/api/events/'+event.id+'/checks')).json();expect(after.items).toHaveLength(1);expect(after.items[0].id).toBe(before.items[0].id);expect(after.items[0].revision).toBe(before.items[0].revision);
});
