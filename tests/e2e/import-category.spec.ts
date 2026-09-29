import {test,expect} from '@playwright/test';
test('import retains selected category and retries a lost response without duplicating the original',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'进入演示空间'}).click();await expect(page.locator('.app-shell')).toBeVisible();
 await page.getByLabel('选择导入文件').setInputFiles({name:'带分类的原件.txt',mimeType:'text/plain',buffer:Buffer.from('保留原文\n人工选择的分类')});
 const dialog=page.getByRole('dialog',{name:'导入记录'});await dialog.getByLabel('导入记录类别').selectOption('category-work');
 let lost=true;await page.route('**/api/import',async route=>{if(lost){lost=false;await route.fetch();await route.abort('failed');}else await route.continue();});
 await dialog.getByRole('button',{name:'保存并导入'}).click();await expect(dialog.getByRole('button',{name:'重试导入'})).toBeEnabled();await expect(dialog.getByLabel('导入记录类别')).toHaveValue('category-work');await expect(dialog).toContainText('带分类的原件.txt');
 await dialog.getByRole('button',{name:'重试导入'}).click();await expect(page.getByRole('dialog',{name:'记录详情'})).toContainText('人工选择的分类');
 const boot=await (await page.request.get('/api/bootstrap')).json();const notes=boot.notes.filter((n:{title:string})=>n.title==='带分类的原件.txt');expect(notes).toHaveLength(1);expect(notes[0].categoryId).toBe('category-work');expect(notes[0].classification.state).toBe('manual');
 const corrections=await (await page.request.get('/api/classification-corrections?limit=100')).json();expect(corrections.items.filter((c:{sourceId:string})=>c.sourceId===notes[0].id)).toHaveLength(1);
});
