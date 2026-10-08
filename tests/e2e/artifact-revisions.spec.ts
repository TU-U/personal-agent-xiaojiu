import {test,expect} from '@playwright/test';import {readFile} from 'node:fs/promises';
test('artifact editing labels human changes and downloads the saved body, while stale exports are rejected',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'进入演示空间'}).click();await expect(page.locator('.app-shell')).toBeVisible();
 await page.request.post('/api/v1/notes',{data:{title:'成果验收来源',content:'本周完成资料整理，下周计划继续核对。',project:'成果版本验收'}});
 const created=await page.request.post('/api/v1/tasks',{data:{template:'weekly',project:'成果版本验收',days:7}});expect(created.ok()).toBe(true);const artifact=await created.json();
 await page.goto('/#artifacts');await page.getByRole('button',{name:new RegExp('成果版本验收 · 工作周报')}).click();const dialog=page.getByRole('dialog',{name:'成果工作台'});await dialog.getByRole('button',{name:'编辑',exact:true}).click();await dialog.getByLabel('成果标题').fill('保存版本验收');await dialog.getByLabel('成果正文').fill('# 已核对\n\n下周事项仍为计划。');await expect(dialog.getByRole('button',{name:'导出',exact:true})).toBeDisabled();
 await dialog.getByRole('button',{name:'保存',exact:true}).click();await expect(dialog.locator('.type-label')).toHaveText('人工编辑');
 const pending=page.waitForEvent('download');await dialog.getByRole('button',{name:'导出',exact:true}).click();const download=await pending;expect(download.suggestedFilename()).toBe('保存版本验收.md');expect(await readFile((await download.path())!,'utf8')).toBe('# 已核对\n\n下周事项仍为计划。');
 const current=await (await page.request.get('/api/v1/artifacts/'+artifact.id)).json();await page.request.patch('/api/v1/artifacts/'+artifact.id,{data:{revision:current.revision,title:current.title,body:'另一设备已更新'}});await dialog.getByRole('button',{name:'导出',exact:true}).click();await expect(dialog.getByRole('alert')).toContainText('成果已更新');await expect(dialog.locator('.markdown')).toContainText('下周事项仍为计划');
});
