import {test,expect} from '@playwright/test';
test('new conflict evidence requires a fresh choice before batch confirmation',async({page})=>{
 let turn:any={id:'review-turn',threadId:'review-thread',threadTitle:'记忆核对测试',revision:1,query:'我现在住广州',body:'已记录你的说明。',sources:[],mode:'model',createdAt:'2026-09-29T00:00:00Z',memoryReview:'pending',memoryProposals:[{content:'用户住广州',conflictId:'old-a',conflictRevision:1,conflictContent:'用户住深圳'}]};let calls=0;
 await page.route('**/api/bootstrap',async route=>{const response=await route.fetch();const data=await response.json();return route.fulfill({json:{...data,conversations:[turn]}});});
 await page.route('**/api/threads?**',route=>route.fulfill({json:{items:[turn],total:1,nextCursor:null}}));
 await page.route('**/api/threads/review-thread/turns?**',route=>route.fulfill({json:{items:[turn],nextCursor:null}}));
 await page.route('**/api/threads/review-thread/context',route=>route.fulfill({json:{text:''}}));
 await page.route('**/api/conversations/review-turn/memory-review',route=>{calls++;if(calls===1){turn={...turn,revision:2,memoryProposals:[{...turn.memoryProposals[0],conflictRefs:[{id:'old-a',revision:1,content:'用户住深圳',reason:'当前居住地不一致'},{id:'old-b',revision:1,content:'用户目前住北京',reason:'新增另一条当前居住地冲突'}]}]};return route.fulfill({status:409,json:{error:'请核对新增冲突',current:turn}});}expect(route.request().postDataJSON()).toEqual({revision:2,selected:[{index:0,keep:'new'}]});turn={...turn,revision:3,memoryReview:'reviewed',memoryProposals:[],memoryNotice:'已保留1条新记忆'};return route.fulfill({json:turn});});
 await page.goto('/');await page.getByRole('button',{name:'进入演示空间'}).click();await page.goto('/#assistant');await page.getByRole('button',{name:/^记忆核对测试.*继续聊/}).click();
 const review=page.locator('.memory-review');await review.getByRole('checkbox').check();await review.getByRole('radio',{name:'保留本轮新记忆'}).check();await review.getByRole('button',{name:'确认所选，丢弃其余'}).click();
 await expect(review.getByText('新增另一条当前居住地冲突')).toBeVisible();await expect(review.getByRole('button',{name:'确认所选，丢弃其余'})).toBeDisabled();await expect(review.getByRole('radio',{name:'保留本轮新记忆'})).not.toBeChecked();
 await review.getByRole('radio',{name:'保留本轮新记忆'}).check();await review.getByRole('button',{name:'确认所选，丢弃其余'}).click();await expect(page.getByText('已保留1条新记忆',{exact:true})).toBeVisible();expect(calls).toBe(2);
});
