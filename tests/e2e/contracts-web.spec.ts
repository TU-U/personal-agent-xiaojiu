import {test,expect} from '@playwright/test';

test('web uses v1 for login, save and reload while old reads see the same note',async({page})=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/');
 const loggedIn=page.waitForResponse(response=>response.url().endsWith('/api/v1/login')&&response.request().method()==='POST');
 await page.getByRole('button',{name:'进入演示空间'}).click();expect((await loggedIn).status()).toBe(200);
 await expect(page.locator('.app-shell')).toBeVisible();
 await page.locator('.capture-prompt').click();
 await page.getByLabel('记录标题',{exact:true}).fill('协议迁移网页验收');
 await page.getByLabel('记录内容',{exact:true}).fill('# 完整内容\n\n1. 先记录\n2. 再讨论');
 const saved=page.waitForResponse(response=>response.url().endsWith('/api/v1/notes')&&response.request().method()==='POST');
 await page.getByRole('button',{name:'保存记录',exact:true}).click();
 const response=await saved;expect(response.status()).toBe(201);expect(response.headers()['x-contract-version']).toBe('0.1.0');const note=await response.json();
 await page.reload();await expect(page.locator('.app-shell')).toBeVisible();
 const old=await (await page.request.get('/api/bootstrap')).json();const current=await (await page.request.get('/api/v1/bootstrap')).json();
 expect(old.notes.find((item:{id:string})=>item.id===note.id)).toEqual(current.notes.find((item:{id:string})=>item.id===note.id));
 expect(errors).toEqual([]);
});
