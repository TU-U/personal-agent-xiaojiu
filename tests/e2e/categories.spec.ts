import {test,expect} from '@playwright/test';
test('categories can be created, assigned in bulk, renamed and used to filter without changing notes',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'进入演示空间'}).click();await expect(page.locator('.app-shell')).toBeVisible();
 const notes=[];for(const title of ['分类验收甲','分类验收乙']){const response=await page.request.post('/api/notes',{data:{title,content:'第一行\n1. 保留编号\n第二行',tags:['保留标签']}});notes.push(await response.json());}
 await page.reload();await page.getByRole('button',{name:'整理记录分类'}).click();const dialog=page.getByRole('dialog');
 await dialog.getByText('新建开发项目类别',{exact:true}).click();await dialog.getByLabel('类别名称',{exact:true}).fill('PersonalAgent 分类验收');await dialog.getByLabel('关联项目',{exact:true}).selectOption('new');await dialog.getByLabel('新项目名称',{exact:true}).fill('PersonalAgent 项目验收');await dialog.getByRole('button',{name:'创建项目类别',exact:true}).click();await expect(dialog).toContainText('项目类别已创建');
 for(const title of ['分类验收甲','分类验收乙'])await dialog.getByRole('checkbox',{name:new RegExp(title)}).check();await dialog.getByLabel('调整原因（可选）').fill('统一整理项目资料');await dialog.getByRole('button',{name:'保存所选记录分类（2）',exact:true}).click();await expect(dialog).toContainText('分类已保存');
 await dialog.getByText('修改所选类别名称',{exact:true}).click();await dialog.getByLabel('新类别名称',{exact:true}).fill('拾光开发验收');await dialog.getByRole('button',{name:'保存类别名称'}).click();await expect(dialog).toContainText('类别已改名');
 await dialog.getByRole('button',{name:'关闭窗口',exact:true}).click();await page.getByLabel('筛选记录类别').selectOption({label:'拾光开发验收'});await expect(page.locator('.note-card')).toHaveCount(2);
 const data=await (await page.request.get('/api/bootstrap')).json();for(const original of notes){const saved=data.notes.find((n:{id:string})=>n.id===original.id);expect(saved.content).toBe(original.content);expect(saved.tags).toEqual(original.tags);expect(saved.attachments).toEqual(original.attachments);}
 const feedback=await (await page.request.get('/api/classification-corrections')).json();expect(feedback.items.filter((r:{reason:string})=>r.reason==='统一整理项目资料')).toHaveLength(2);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
