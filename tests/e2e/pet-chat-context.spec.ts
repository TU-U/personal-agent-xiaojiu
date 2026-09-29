import {test,expect} from '@playwright/test';
test('pet shows supplied memory receipts and visible retrieval degradation separately from its reply',async({page})=>{
 let calls=0;
 await page.route('**/api/pet/chat',route=>{calls++;const body=route.request().postDataJSON();expect(Object.keys(body).sort()).toEqual(['history','message']);return route.fulfill({json:calls===1?{reply:'一起安静待会儿吧 🐾',memoryUsage:[{id:'general-1',revision:3,title:'喜欢安静'}],memoryNotice:''}:{reply:'我在听 🐾',memoryUsage:[],memoryNotice:'通用记忆暂时检索失败，本次仅根据当前交流回复。'}});});
 await page.goto('/');await page.getByRole('button',{name:'进入演示空间'}).click();await expect(page.locator('.app-shell')).toBeVisible();
 await page.getByRole('button',{name:/小九现在/}).hover();const panel=page.getByLabel('小九的互动面板');await panel.getByRole('button',{name:'交流',exact:true}).click();
 const input=page.getByLabel('和小九说话',{exact:true});await input.fill('想安静一会儿');await page.getByLabel('发送给小九',{exact:true}).click();
 await expect(input).toHaveValue('');await panel.getByText('本次提供给模型的通用记忆 · 1 条',{exact:true}).click();await expect(panel).toContainText('喜欢安静 · 版本 3');
 await input.fill('今天有点累');await page.getByLabel('发送给小九',{exact:true}).click();await expect(panel).toContainText('通用记忆暂时检索失败');await expect(panel.getByText('喜欢安静 · 版本 3',{exact:true})).toHaveCount(0);await expect(input).toHaveValue('');
});
