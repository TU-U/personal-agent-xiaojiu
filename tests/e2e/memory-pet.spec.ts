import {test,expect} from '@playwright/test';
test('pet pending prompt opens an old source turn without confirming it and clears after manual discard',async({page})=>{
 let turn:any={id:'pet-old-turn',threadId:'pet-thread',threadTitle:'更早的话题',revision:1,query:'长期事实讨论',body:'这是原来的回复。',sources:[],mode:'model',createdAt:'2026-09-20T00:00:00Z',memoryReview:'pending',memoryProposals:[{content:'用户喜欢简洁说明'}]};let writes=0;
 await page.route('**/api/v1/bootstrap',async route=>{const response=await route.fetch();const data=await response.json();return route.fulfill({json:{...data,memories:[],conversations:[],pendingMemoryBatches:turn.memoryReview==='pending'?[{id:turn.id,threadId:turn.threadId,title:turn.threadTitle,count:1,revision:turn.revision}]:[]}});});
 await page.route('**/api/v1/pet/reminders',route=>route.fulfill({json:{snapshot:'test',cursor:turn.revision,total:turn.memoryReview==='pending'?1:0,items:turn.memoryReview==='pending'?[{id:'candidate',sourceKind:'conversation',sourceId:turn.id,title:turn.threadTitle,message:'这轮有 1 条记忆候选，等你选择。',count:1,actionTarget:{page:'assistant',id:turn.id,threadId:turn.threadId}}]:[]}}));
 await page.route('**/api/v1/conversations/pet-old-turn',route=>route.fulfill({json:turn}));
 await page.route('**/api/v1/threads?**',route=>route.fulfill({json:{items:[],total:0,nextCursor:null}}));
 await page.route('**/api/v1/threads/pet-thread/turns?**',route=>route.fulfill({json:{items:[],nextCursor:'older'}}));
 await page.route('**/api/v1/threads/pet-thread/context',route=>route.fulfill({json:{text:''}}));
 await page.route('**/api/v1/conversations/pet-old-turn/memory-review',route=>{writes++;expect(route.request().postDataJSON().selected).toEqual([]);turn={...turn,revision:2,memoryReview:'reviewed',memoryProposals:[],memoryNotice:'本轮记忆建议已丢弃'};return route.fulfill({json:turn});});
 await page.goto('/');await page.getByRole('button',{name:'进入演示空间'}).click();await expect(page.getByLabel('1 项待处理提示',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:/小九现在/}).hover();await page.getByRole('button',{name:'查看：更早的话题',exact:true}).click();
 const target=page.locator('#conversation-pet-old-turn');await expect(target).toBeVisible();await expect(target).toBeFocused();await expect(target).toContainText('用户喜欢简洁说明');expect(writes).toBe(0);
 await target.getByRole('button',{name:'全部丢弃',exact:true}).click();await expect(page.getByLabel('1 项待处理提示',{exact:true})).toHaveCount(0);await expect(target).toContainText('本轮记忆建议已丢弃');expect(writes).toBe(1);
});
