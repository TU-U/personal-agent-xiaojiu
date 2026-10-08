import {test,expect} from '@playwright/test';
test('file reuses topic; web permission survives switching; Pi source tools return grounded answer and manual memory',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');await page.getByRole('button',{name:'进入演示空间'}).click();await expect(page.locator('.app-shell')).toBeVisible();
 const openFile=()=>page.evaluate(()=>{sessionStorage.setItem('libraryDiscussion',JSON.stringify({id:'871d199b-e2b3-4982-bcf0-df9b54215801',kind:'libraryFile',title:'PersonalAgent 架构资料',revision:1}));location.hash='assistant';window.dispatchEvent(new Event('library-discussion'));});
 await openFile();await expect(page.locator('.composer-references')).toContainText('PersonalAgent 架构资料');
 const first=(await (await page.request.post('/api/v1/source-threads',{data:{id:'871d199b-e2b3-4982-bcf0-df9b54215801',kind:'libraryFile'}})).json()).threadId;
 await expect(page.getByRole('checkbox',{name:'允许联网'})).not.toBeChecked();await page.getByRole('checkbox',{name:'允许联网'}).click();await expect(page.getByRole('checkbox',{name:'允许联网'})).toBeChecked();
 await page.locator('.conversation-sidebar').getByRole('button',{name:'新建话题',exact:true}).click();await expect(page.getByRole('checkbox',{name:'允许联网'})).not.toBeChecked();
 await openFile();await expect(page.getByRole('checkbox',{name:'允许联网'})).toBeChecked();
 await page.getByRole('checkbox',{name:'允许联网'}).click();await expect(page.getByRole('checkbox',{name:'允许联网'})).not.toBeChecked();
 await page.getByRole('textbox',{name:'向助手提问'}).fill('我持续开发 PersonalAgent，请结合引用资料分析下一步。');
 const reply=page.waitForResponse(r=>r.url().endsWith('/api/v1/ask')&&r.request().method()==='POST');await page.getByRole('button',{name:'发送问题',exact:true}).click();const response=await reply;expect(response.status()).toBe(200);const turn=await response.json();expect(turn.agentRun.status).toBe('completed');expect(turn.agentRun.calls).toBe(3);expect(turn.threadId).toBe(first);
 await expect(page.locator('.answer-card').last()).toContainText('建议先接入 Pi 工具循环');await expect(page.locator('.answer-card').last()).toContainText('这轮可以记住什么');await expect(page.locator('.answer-card').last()).toContainText('3/6');
 await openFile();await expect(page.locator('.answer-card').last()).toContainText('建议先接入 Pi 工具循环');
 const again=await (await page.request.post('/api/v1/source-threads',{data:{id:'871d199b-e2b3-4982-bcf0-df9b54215801',kind:'libraryFile'}})).json();expect(again.threadId).toBe(first);expect(errors).toEqual([]);
});
