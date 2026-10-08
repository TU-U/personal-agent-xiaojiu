import {test,expect} from '@playwright/test';
test('conversation memories show their actual source and reopen that exact existing thread',async({page})=>{
 const turn={id:'origin-turn',threadId:'origin-thread',threadTitle:'来源话题',revision:2,query:'我喜欢短句',body:'来源回复内容',sources:[],mode:'model',createdAt:'2026-09-20T00:00:00Z',memoryReview:'reviewed',memoryProposals:[]};
 const base={revision:1,scope:'通用',status:'active',createdAt:turn.createdAt};
 await page.route('**/api/v1/bootstrap',async route=>{const response=await route.fetch(),data=await response.json();await route.fulfill({json:{...data,notes:[],conversations:[],pendingMemoryBatches:[],memories:[{...base,id:'conversation-memory',content:'用户喜欢短句',sourceConversationId:turn.id},{...base,id:'event-memory',content:'要事来源事实',sourceRef:{kind:'event',id:'source-event'},sourceRevision:7},{...base,id:'manual-memory',content:'手动事实'}]}});});
 await page.route('**/api/v1/conversations/origin-turn',route=>route.fulfill({json:turn}));
 await page.route('**/api/v1/threads?**',route=>route.fulfill({json:{items:[],total:0,nextCursor:null}}));
 await page.route('**/api/v1/threads/origin-thread/turns?**',route=>route.fulfill({json:{items:[],nextCursor:null}}));
 await page.route('**/api/v1/threads/origin-thread/context',route=>route.fulfill({json:{text:''}}));
 await page.goto('/#memories');await page.getByRole('button',{name:'进入演示空间'}).click();
 const card=page.locator('.memory-card').filter({hasText:'用户喜欢短句'});
 await expect(card).not.toContainText('由你手动添加');await expect(page.locator('.memory-card').filter({hasText:'手动事实'})).toContainText('由你手动添加');
 const event=page.locator('.memory-card').filter({hasText:'要事来源事实'});await expect(event).toContainText('来源要事');await expect(event).toContainText('来源版本 7');
 await card.getByRole('button',{name:'查看来源对话'}).click();await expect(page).toHaveURL(/#assistant$/);
 const target=page.locator('#conversation-origin-turn');await expect(target).toBeVisible();await expect(target).toContainText('来源回复内容');await expect(target).toBeFocused();
});
