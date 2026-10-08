import {test,expect} from '@playwright/test';
test('PDF import shows processing and later the parsed original without reopening',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'进入演示空间'}).click();await expect(page.locator('.app-shell')).toBeVisible();
 await page.getByLabel('选择导入文件').setInputFiles('tests/fixtures/sample.pdf');
 await page.getByLabel('导入记录类别').selectOption('category-work');
 await page.getByRole('button',{name:'保存并导入',exact:true}).click();
 await expect(page.getByRole('dialog').getByRole('heading',{name:'sample.pdf',exact:true})).toBeVisible();
 await expect(page.getByLabel('原件解析状态')).toContainText('原件解析已完成。',{timeout:20000});
 await expect(page.locator('.note-detail .markdown')).toContainText('支付接口');
 const boot=await (await page.request.get('/api/v1/bootstrap')).json();const note=boot.notes.find((n:{title:string})=>n.title==='sample.pdf');expect(note.categoryId).toBe('category-work');expect(note.classification.state).toBe('manual');
 await page.getByRole('button',{name:'编辑',exact:true}).click();await expect(page.getByLabel('记录内容')).toHaveValue(/支付接口/);
});
