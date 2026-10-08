import {test,expect} from '@playwright/test';
test('a long chat question stays complete in research background and the next draft starts clean',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'进入演示空间'}).click();await expect(page.locator('.app-shell')).toBeVisible();
 const note=await (await page.request.post('/api/v1/notes',{data:{title:'调研来源笔记',content:'只讨论本地学习，不购买课程。'}})).json();
 const response=await page.request.post('/api/v1/ask',{data:{query:'预算100元，不购买课程，也不要替我执行。',references:[{id:note.id,kind:'note',revision:note.revision}],opId:crypto.randomUUID()}});expect(response.ok()).toBe(true);const turn=await response.json();
 await page.goto('/#assistant');await page.locator('.history-item').filter({hasText:'预算100元'}).getByRole('button').first().click();
 const long='请结合现有资料考虑适合自己的学习路线。'.repeat(35)+'最后约束：只做讨论，由我确认。';
 await page.getByLabel('向助手提问').fill(long);await page.getByRole('button',{name:'从这个话题创建任务',exact:true}).click();
 const form=page.locator('details').filter({has:page.getByText('快速学习与调研',{exact:true})});await form.locator('summary').first().click();
 await expect(form.getByRole('textbox',{name:'背景',exact:true})).toHaveValue(long);await expect(form.getByLabel('调研主题',{exact:true})).toHaveValue('');await expect(form).toContainText('已关联来源话题');await expect(form).toContainText('调研来源笔记');
 await form.getByLabel('调研主题',{exact:true}).fill('先讨论学习路线');await form.getByLabel(/^关键问题（每行一个/).fill('学习顺序如何安排？');await form.getByLabel('约束与已知条件').fill('仅讨论，不执行');await form.getByLabel('时效要求').fill('本周');
 const sent=page.waitForRequest(r=>r.url().endsWith('/api/v1/research-tasks')&&r.method()==='POST');await form.getByRole('button',{name:'生成调研计划',exact:true}).click();
 const payload=(await sent).postDataJSON();expect(payload.threadId).toBe(turn.threadId);expect(payload.researchBrief.background).toBe(long);expect(payload.references.map((r:any)=>r.id)).toEqual([note.id]);
 const modal=page.getByRole('dialog',{name:'调研计划与进度'});await expect(modal.getByRole('button',{name:'确认此计划并开始调研'})).toBeVisible();await modal.getByRole('button',{name:'关闭窗口'}).click();
 await expect(form.getByRole('textbox',{name:'背景',exact:true})).toHaveValue('');await expect(form.getByLabel('约束与已知条件')).toHaveValue('');await expect(form.getByLabel('时效要求')).toHaveValue('');await expect(form).not.toContainText('已关联来源话题');await expect(form.getByRole('button',{name:'移除 调研来源笔记',exact:true})).toHaveCount(0);
 await form.getByLabel('调研主题',{exact:true}).fill('独立的新调研');await form.getByLabel(/^关键问题（每行一个/).fill('新的问题是什么？');const next=page.waitForRequest(r=>r.url().endsWith('/api/v1/research-tasks')&&r.method()==='POST');await form.getByRole('button',{name:'生成调研计划',exact:true}).click();const fresh=(await next).postDataJSON();expect(fresh.threadId).toBe('');expect(fresh.references).toEqual([]);expect(fresh.researchBrief.background).toBe('');
 await expect(modal.getByRole('button',{name:'确认此计划并开始调研'})).toBeVisible();
});
