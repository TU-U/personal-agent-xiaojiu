import {test,expect} from '@playwright/test';
test('new and edited note categories survive a failed save and produce one correction per change',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'进入演示空间'}).click();await page.getByRole('button',{name:/记一条/}).click();
 let dialog=page.getByRole('dialog');await dialog.getByLabel('记录标题').fill('手动归类记录');await dialog.getByLabel('记录内容').fill('失败时保留原文');await dialog.getByLabel('记录类别',{exact:true}).selectOption('category-life');
 let fail=true;await page.route('**/api/notes',async route=>{if(fail&&route.request().method()==='POST'){fail=false;await route.fulfill({status:503,json:{error:'保存临时失败'}});}else await route.continue();});
 await dialog.getByRole('button',{name:'保存记录'}).click();await expect(dialog).toContainText('保存临时失败');await expect(dialog.getByLabel('记录类别',{exact:true})).toHaveValue('category-life');await expect(dialog.getByLabel('记录内容')).toHaveValue('失败时保留原文');
 await dialog.getByRole('button',{name:'保存记录'}).click();await expect(dialog.getByRole('button',{name:'编辑',exact:true})).toBeVisible();
 await dialog.getByRole('button',{name:'编辑',exact:true}).click();await dialog.getByLabel('记录类别',{exact:true}).selectOption('category-reading');await dialog.getByRole('button',{name:'保存记录'}).click();await expect(dialog.getByRole('button',{name:'编辑',exact:true})).toBeVisible();
 const data=await (await page.request.get('/api/bootstrap')).json();const notes=data.notes.filter((n:{title:string})=>n.title==='手动归类记录');expect(notes).toHaveLength(1);expect(notes[0].categoryId).toBe('category-reading');expect(notes[0].classification.state).toBe('manual');expect(notes[0].content).toBe('失败时保留原文');
 const corrections=await (await page.request.get('/api/classification-corrections?limit=100')).json();expect(corrections.items.filter((c:{sourceId:string})=>c.sourceId===notes[0].id)).toHaveLength(2);
});
