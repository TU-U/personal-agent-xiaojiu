import {test,expect} from '@playwright/test';
test('classification feedback can be reviewed, resolved and reopened with history retained',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'进入演示空间'}).click();await expect(page.locator('.app-shell')).toBeVisible();
 const note=await (await page.request.post('/api/v1/notes',{data:{title:'分类反馈验收记录',content:'这是一条手动整理的测试资料。'}})).json();
 const changed=await page.request.post('/api/v1/notes/categories',{data:{opId:'feedback-ui-check',categoryId:'category-reading',notes:[{id:note.id,revision:note.revision}],reason:'这条应是读书笔记'}});expect(changed.ok()).toBe(true);
 await page.getByRole('button',{name:'设置与数据',exact:true}).click();const panel=page.getByRole('region',{name:'分类纠错问题表'});const item=panel.getByRole('article',{name:'分类纠错：分类反馈验收记录'});await expect(item).toContainText('待分类 → 读书笔记');await expect(item).toContainText('这条应是读书笔记');
 await item.getByLabel('处理说明').fill('已检查，后续调整分类提示。');await item.getByRole('button',{name:'标为已处理'}).click();await expect(panel).toContainText('当前没有此状态');
 await panel.getByLabel('问题状态',{exact:true}).selectOption('resolved');await expect(item).toBeVisible();await item.getByText('处理历史（1）',{exact:true}).click();await expect(item).toContainText('已检查，后续调整分类提示。');
 await item.getByLabel('处理说明').fill('重新打开以核对新模型。');await item.getByRole('button',{name:'重新打开问题'}).click();await expect(panel).toContainText('当前没有此状态');await panel.getByLabel('问题状态',{exact:true}).selectOption('open');await expect(item).toBeVisible();await item.getByText('处理历史（2）',{exact:true}).click();await expect(item).toContainText('已检查，后续调整分类提示。');await expect(item).toContainText('重新打开以核对新模型。');
 const feedback=await (await page.request.get('/api/v1/classification-corrections')).json();expect(feedback.items.filter((x:{sourceId:string})=>x.sourceId===note.id)).toHaveLength(1);expect(feedback.items.find((x:{sourceId:string})=>x.sourceId===note.id).history).toHaveLength(2);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
