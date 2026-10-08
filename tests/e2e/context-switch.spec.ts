import {test,expect} from '@playwright/test';
test('late context response does not replace the newly selected topic summary',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'进入演示空间'}).click();await expect(page.locator('.app-shell')).toBeVisible();
 const a=await (await page.request.post('/api/v1/ask',{data:{query:'上下文话题甲'}})).json(),b=await (await page.request.post('/api/v1/ask',{data:{query:'上下文话题乙'}})).json();
 let release,arrived;const gate=new Promise<void>(r=>release=r),seen=new Promise<void>(r=>arrived=r);let done;const fulfilled=new Promise<void>(r=>done=r);
 await page.route('**/api/v1/threads/*/context',async route=>{if(route.request().url().includes(a.threadId)){arrived();await gate;await route.fulfill({json:{text:'旧话题摘要甲',version:1,uncoveredCount:0}});done();}else await route.fulfill({json:{text:'当前话题摘要乙',version:2,uncoveredCount:0}});});
 await page.goto('/#assistant');await page.locator('.history-item button').filter({hasText:'上下文话题甲'}).click();await seen;await page.locator('.history-item button').filter({hasText:'上下文话题乙'}).click();await page.getByText('话题上下文摘要',{exact:true}).click();await expect(page.getByText('当前话题摘要乙',{exact:true})).toBeVisible();release();await fulfilled;await page.evaluate(()=>new Promise<void>(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r()))));await expect(page.getByText('当前话题摘要乙',{exact:true})).toBeVisible();await expect(page.getByText('旧话题摘要甲',{exact:true})).toHaveCount(0);
});
