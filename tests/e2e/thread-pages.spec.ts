import {test,expect} from '@playwright/test';
test('directory reaches older topics and conversation loads earlier pages',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'进入演示空间'}).click();await expect(page.locator('.app-shell')).toBeVisible();
 const first=await (await page.request.post('/api/v1/ask',{data:{query:'旧话题分页零号'}})).json();expect(first.threadId).toBeTruthy();
 for(let i=1;i<34;i++){const r=await page.request.post('/api/v1/ask',{data:{threadId:first.threadId,query:'历史轮次编号'+i}});expect(r.ok()).toBe(true);}
 for(let i=0;i<31;i++){const note=await (await page.request.post('/api/v1/notes',{data:{title:'目录资料'+i,content:'独立记录正文'}})).json();await page.request.post('/api/v1/source-threads',{data:{kind:'note',id:note.id}});}
 await page.goto('/#assistant');await expect(page.getByRole('button',{name:'更多话题',exact:true})).toBeVisible();await expect(page.locator('.history-item').filter({hasText:'旧话题分页零号'})).toHaveCount(0);await page.getByRole('button',{name:'更多话题',exact:true}).click();await page.locator('.history-item button').filter({hasText:'旧话题分页零号'}).click();await expect(page.locator('.answer-card')).toHaveCount(30);await expect(page.getByRole('button',{name:'加载更早消息'})).toBeVisible();await page.getByRole('button',{name:'加载更早消息'}).click();await expect(page.locator('.answer-card')).toHaveCount(34);await expect(page.locator('.answer-card').first()).toContainText('旧话题分页零号');
});
