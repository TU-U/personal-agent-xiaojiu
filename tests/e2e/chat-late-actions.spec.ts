import {test,expect} from '@playwright/test';
test('late search brief and delete responses cannot replace a different topic or its draft',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'进入演示空间'}).click();await expect(page.locator('.app-shell')).toBeVisible();
 const a=await(await page.request.post('/api/v1/ask',{data:{query:'简报目标甲'}})).json(),b=await(await page.request.post('/api/v1/ask',{data:{query:'保留目标乙'}})).json();
 await page.goto('/#assistant');await page.locator('.history-item button').filter({hasText:'简报目标甲'}).click();await expect(page.locator('.answer-card')).toHaveCount(1);
 let releaseBrief!:()=>void,briefArrived!:()=>void;const briefGate=new Promise<void>(r=>releaseBrief=r),briefSeen=new Promise<void>(r=>briefArrived=r);
 await page.route('**/api/v1/search-brief',async route=>{expect(route.request().postDataJSON().threadId).toBe(a.threadId);briefArrived();await briefGate;await route.fulfill({json:{brief:'仅属于甲的旧搜索简报'}});});
 const briefButton=page.getByRole('button',{name:'整理搜索简报 · 去 DeepSeek 网页端',exact:true});
 await briefButton.click();await briefSeen;
 await page.locator('.history-item button').filter({hasText:'保留目标乙'}).click();await page.getByLabel('向助手提问').fill('乙话题未发送的草稿');releaseBrief();
 await expect(briefButton).toBeEnabled();await expect(page.getByRole('dialog',{name:'DeepSeek 联网搜索简报'})).toHaveCount(0);await expect(page.getByLabel('向助手提问')).toHaveValue('乙话题未发送的草稿');
 let releaseDelete!:()=>void,deleteArrived!:()=>void;const deleteGate=new Promise<void>(r=>releaseDelete=r),deleteSeen=new Promise<void>(r=>deleteArrived=r);
 await page.route('**/api/v1/threads/'+a.threadId,async route=>{if(route.request().method()!=='DELETE'){await route.continue();return;}const response=await route.fetch();expect(response.ok()).toBe(true);deleteArrived();await deleteGate;await route.fulfill({response});});
 await page.locator('.history-item button').filter({hasText:'简报目标甲'}).click();await page.getByRole('button',{name:'删除会话：简报目标甲',exact:true}).click();await deleteSeen;
 await page.locator('.history-item button').filter({hasText:'保留目标乙'}).click();await page.getByLabel('向助手提问').fill('删除甲也不能丢掉乙的输入');releaseDelete();
 await expect(page.getByRole('button',{name:'删除会话：简报目标甲',exact:true})).toHaveCount(0);await expect(page.locator('.history-item.selected')).toContainText('保留目标乙');await expect(page.getByLabel('向助手提问')).toHaveValue('删除甲也不能丢掉乙的输入');
 const data=await(await page.request.get('/api/v1/bootstrap')).json();expect(data.conversations.some((c:any)=>c.threadId===a.threadId)).toBe(false);expect(data.conversations.some((c:any)=>c.threadId===b.threadId)).toBe(true);
});
