import {test,expect} from '@playwright/test';
test('web event lifecycle preserves checks across confirmation, new schedule, snooze and explicit end',async({page})=>{
 await page.goto('/#events');await page.getByRole('button',{name:'进入演示空间'}).click();
 await page.getByRole('button',{name:'新建要事'}).click();let dialog=page.getByRole('dialog',{name:'新建要事'});
 await dialog.getByLabel('标题',{exact:true}).fill('长期项目检查');await dialog.getByLabel('要事类型').selectOption('long_term');await dialog.getByLabel('等级').selectOption('high');
 await dialog.getByRole('button',{name:'确认并保存要事'}).click();await expect(dialog).toHaveCount(0);
 const card=page.locator('.event-card').filter({hasText:'长期项目检查'});await expect(card).toContainText('未设提醒');await expect(card).toContainText('长期');
 await card.getByRole('button',{name:'检查历史 / 安排'}).click();dialog=page.getByRole('dialog',{name:'检查历史与安排'});
 await expect(dialog).toContainText('尚无约定检查');await dialog.getByLabel('下一次检查时间').fill('2020-01-01T10:00');await dialog.getByRole('button',{name:'安排下一次检查'}).click();await expect(dialog).toContainText('待确认');await dialog.getByRole('button',{name:'关闭窗口'}).click();
 await card.getByRole('button',{name:/^(立即|重新)复核$/}).click();await expect(card).toContainText('未配置 AI 模型');await card.getByRole('button',{name:'确认提醒'}).click();await expect(card).toContainText('本次检查已确认，事情进行中');
 await card.getByRole('button',{name:'检查历史 / 安排'}).click();dialog=page.getByRole('dialog',{name:'检查历史与安排'});await expect(dialog).toContainText('确认于');await dialog.getByLabel('下一次检查时间').fill('2099-01-01T10:00');await dialog.getByRole('button',{name:'安排下一次检查'}).click();await expect(dialog.locator('article')).toHaveCount(2);
 await dialog.getByLabel('稍后检查时间').fill('2099-01-02T10:00');await dialog.getByRole('button',{name:'确认改期'}).click();await expect(dialog).toContainText('历史约定');
 page.once('dialog',d=>d.accept());await dialog.getByRole('button',{name:'结束要事',exact:true}).click();await expect(dialog).toContainText('已结束');await expect(dialog).toContainText('已取消');await expect(dialog.getByRole('button',{name:'安排下一次检查'})).toHaveCount(0);
 await dialog.getByRole('button',{name:'关闭窗口'}).click();await page.reload();await expect(card).toContainText('已结束');await card.getByRole('button',{name:'检查历史 / 安排'}).click();await expect(page.getByRole('dialog').locator('article')).toHaveCount(2);
});
test('background review failure becomes visible without an entity change and offers explicit retry',async({page})=>{
 let loads=0,retried=false;
 const event={id:'queue-ui-event',revision:1,title:'队列状态展示',summary:'后台检查',priority:'high',eventType:'one_off',lifecycleStatus:'ongoing',status:'open',currentOccurrenceId:'queue-ui-occurrence',dueAt:'2020-01-01T00:00:00.000Z',tags:[],project:'',createdAt:'2020-01-01T00:00:00.000Z'};
 await page.route('**/api/bootstrap',async route=>{const response=await route.fetch(),data=await response.json();loads++;await route.fulfill({json:{...data,events:[{...event,...(retried?{reviewedDueAt:event.dueAt,reviewNotice:'复核重试返回失败说明'}:{}),reviewJob:{id:'queue-job',state:retried?'completed':loads===1?'pending':'failed',error:!retried&&loads>1?'后台任务测试失败，请重试':''}}]}});});
 await page.route('**/api/events/queue-ui-event/check',route=>{retried=true;return route.fulfill({status:202,json:{...event}});});
 await page.goto('/#events');await page.getByRole('button',{name:'进入演示空间'}).click();const card=page.locator('#event-queue-ui-event');await expect(card).toContainText('后台任务测试失败，请重试');
 await card.getByRole('button',{name:'立即复核',exact:true}).click();await expect(card).toContainText('复核重试返回失败说明');await expect(card.getByRole('button',{name:'确认提醒'})).toBeEnabled();
});
test('stale review shows evidence version and blocks confirmation until a fresh result',async({page})=>{
 let fresh=false;const dueAt='2020-01-01T00:00:00.000Z';
 await page.route('**/api/bootstrap',async route=>{const response=await route.fetch(),data=await response.json();await route.fulfill({json:{...data,events:[{id:'stale-event',revision:1,title:'复核依据展示',summary:'摘要',priority:'high',eventType:'one_off',lifecycleStatus:'ongoing',status:'open',currentOccurrenceId:'stale-check',dueAt,reviewedDueAt:dueAt,reviewStale:!fresh,reviewText:fresh?'新依据生成的建议':'旧依据生成的建议',tags:[],project:'',createdAt:dueAt,reviewSnapshot:{createdAt:dueAt,sources:[{kind:'note',id:'source',title:'来源计划',revision:fresh?2:1,missing:false}]}}]}});});
 await page.route('**/api/events/stale-event/check',route=>{fresh=true;return route.fulfill({status:202,json:{ok:true}});});
 await page.goto('/#events');await page.getByRole('button',{name:'进入演示空间'}).click();const card=page.locator('#event-stale-event');await expect(card).toContainText('旧建议依据已变化');await expect(card.getByRole('button',{name:'确认提醒'})).toBeDisabled();
 await card.getByText('本次复核依据',{exact:true}).click();await expect(card).toContainText('来源计划 · 版本 1');await expect(card).toContainText('本次未直接识图');
 await card.getByRole('button',{name:'重新复核'}).click();await expect(card).toContainText('新依据生成的建议');await expect(card).toContainText('来源计划 · 版本 2');await expect(card.getByRole('button',{name:'确认提醒'})).toBeEnabled();
});
