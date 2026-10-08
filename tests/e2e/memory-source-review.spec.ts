import {test,expect} from '@playwright/test';
test('source review shows current text, rejects a later revision and only saves a candidate',async({page})=>{
 await page.goto('/#memories');await page.getByRole('button',{name:'进入演示空间'}).click();await expect(page.locator('.app-shell')).toBeVisible();
 const first=await page.request.post('/api/v1/notes',{data:{title:'可核对的偏好来源',content:'我喜欢安静。'}});expect(first.ok()).toBe(true);const note=await first.json();
 const created=await page.request.post('/api/v1/memories',{data:{content:'喜欢安静',scope:'通用',scopeKind:'global',sourceId:note.id}});expect(created.ok()).toBe(true);const memory=await created.json();
 const second=await page.request.patch('/api/v1/notes/'+note.id,{data:{revision:note.revision,content:'白天可以播放音乐，晚上仍希望安静。'}});expect(second.ok()).toBe(true);const changed=await second.json();
 await page.reload();const card=page.locator('#memory-'+memory.id);await expect(card).toContainText('来源失效，暂不采用');await card.getByRole('button',{name:'编辑记忆'}).click();
 const modal=page.getByRole('dialog',{name:'编辑这条记忆'});await modal.getByRole('button',{name:'读取最新来源并核对'}).click();await expect(modal).toContainText(changed.content);await expect(modal).toContainText('版本 '+changed.revision);
 await modal.getByRole('textbox',{name:'记忆内容',exact:true}).fill('白天可以播放音乐，晚上希望安静');await modal.getByRole('checkbox',{name:'我已核对这个来源版本，当前记忆内容仍有依据'}).check();
 const third=await page.request.patch('/api/v1/notes/'+note.id,{data:{revision:changed.revision,content:'白天可以播放音乐，晚上九点以后希望安静。'}});expect(third.ok()).toBe(true);const latest=await third.json();
 await modal.getByRole('button',{name:'保存记忆',exact:true}).click();await expect(modal.getByRole('alert')).toContainText('来源已变化');await expect(modal.getByRole('textbox',{name:'记忆内容',exact:true})).toHaveValue('白天可以播放音乐，晚上希望安静');
 await modal.getByRole('button',{name:'读取最新来源并核对'}).click();await expect(modal).toContainText(latest.content);await expect(modal.getByRole('checkbox',{name:'我已核对这个来源版本，当前记忆内容仍有依据'})).not.toBeChecked();
 await modal.getByRole('textbox',{name:'记忆内容',exact:true}).fill('晚上九点以后希望安静');await modal.getByRole('checkbox',{name:'我已核对这个来源版本，当前记忆内容仍有依据'}).check();await modal.getByRole('button',{name:'保存记忆',exact:true}).click();await expect(modal).toHaveCount(0);
 await expect(card).toContainText('等待你确认');await expect(card).toContainText('来源版本 '+latest.revision);const boot=await (await page.request.get('/api/v1/bootstrap')).json();const saved=boot.memories.find((m:any)=>m.id===memory.id);expect(saved.status).toBe('candidate');expect(saved.sourceRevision).toBe(latest.revision);expect(saved.sourceIssue).toBe('');expect(saved.content).toBe('晚上九点以后希望安静');
});
