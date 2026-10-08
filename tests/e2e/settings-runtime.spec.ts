import {test,expect} from '@playwright/test';
test('storage and worker panels show live data and recover from a failed refresh',async({page})=>{
 await page.goto('/#settings');await page.getByRole('button',{name:'进入演示空间'}).click();
 const storage=page.locator('details').filter({has:page.getByText('查看数据位置与磁盘空间',{exact:true})});
 await storage.locator('summary').click();
 const actual=await (await page.request.get('/api/v1/settings/storage')).json();
 expect(actual.dataDir).toMatch(/^\/tmp\/shiguang-e2e-/);expect(actual.disk.available).toBe(true);
 await expect(storage).toContainText(actual.dataDir);await expect(storage).toContainText('磁盘可用');await expect(storage).toContainText('Qdrant保存可重建的检索索引');
 await page.route('**/api/v1/settings/storage',route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'存储状态临时不可用'})}),{times:1});
 await storage.getByRole('button',{name:'刷新存储状态'}).click();await expect(storage.getByRole('alert')).toContainText('存储状态临时不可用');await expect(storage).toContainText('上次结果');await expect(storage).toContainText(actual.dataDir);
 await storage.getByRole('button',{name:'刷新存储状态'}).click();await expect(storage.getByRole('alert')).toHaveCount(0);
 const worker=page.locator('details').filter({has:page.getByText('后台进程与任务状态',{exact:true})});await worker.locator('summary').click();
 await expect.poll(async()=> (await (await page.request.get('/api/v1/settings/worker')).json()).state,{timeout:20000}).toBe('ready');
 await worker.getByRole('button',{name:'刷新后台状态'}).click();await expect(worker.getByRole('status')).toContainText('后台进程心跳正常，队列连接就绪');
 await page.route('**/api/v1/settings/worker',route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'后台状态临时不可用'})}),{times:1});
 await worker.getByRole('button',{name:'刷新后台状态'}).click();await expect(worker.getByRole('alert')).toContainText('后台状态临时不可用');await expect(worker.getByRole('status')).toContainText('上次结果');
 await worker.getByRole('button',{name:'刷新后台状态'}).click();await expect(worker.getByRole('alert')).toHaveCount(0);await expect(worker.getByRole('status')).toContainText('队列连接就绪');
});
