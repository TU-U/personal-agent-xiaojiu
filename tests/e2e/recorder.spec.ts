import {test,expect} from '@playwright/test';
test.use({permissions:['microphone'],launchOptions:{args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']}});
test('browser records playable audio and retries a lost upload response without duplicates',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'进入演示空间'}).click();await page.getByRole('button',{name:'语音记录',exact:true}).click();
 const dialog=page.getByRole('dialog');await dialog.getByRole('button',{name:'开始录音',exact:true}).click();await expect(dialog.getByRole('status')).toContainText('正在录音');
 await expect(dialog.getByRole('timer')).toHaveText('00:02',{timeout:5000});await dialog.getByRole('button',{name:'结束录音'}).click();await expect(dialog.locator('audio')).toBeVisible();
 let failed=false;
 await page.route('**/api/v1/import',async route=>{if(!failed){failed=true;await route.fetch();await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'模拟保存成功但确认响应丢失'})});}else await route.continue();});
 await dialog.getByRole('button',{name:'保存录音',exact:true}).click();await expect(dialog).toContainText('模拟保存成功但确认响应丢失');await expect(dialog.getByRole('link',{name:'下载录音备份'})).toBeVisible();await expect(dialog.locator('audio')).toBeVisible();
 await dialog.getByRole('button',{name:'保存录音',exact:true}).click();await expect(page.getByRole('heading',{name:'记录详情',exact:true})).toBeVisible();
 const data=await (await page.request.get('/api/v1/bootstrap')).json();const notes=data.notes.filter((n:{title:string})=>n.title.startsWith('语音记录-'));expect(notes).toHaveLength(1);expect(notes[0].attachments[0].size).toBeGreaterThan(0);
 await expect(page.getByLabel('录音转写')).toBeVisible();
});
test('microphone permission denial is visible and leaves recording retry available',async({page})=>{
 await page.addInitScript(()=>{navigator.mediaDevices.getUserMedia=async()=>{throw new DOMException('Denied','NotAllowedError');};});
 await page.goto('/');await page.getByRole('button',{name:'进入演示空间'}).click();await page.getByRole('button',{name:'语音记录',exact:true}).click();await page.getByRole('button',{name:'开始录音',exact:true}).click();
 await expect(page.getByRole('dialog')).toContainText('麦克风权限被拒绝');await expect(page.getByRole('button',{name:'开始录音',exact:true})).toBeEnabled();
});
