import {test,expect} from '@playwright/test';
test.use({timezoneId:'America/Los_Angeles'});
test('midnight in Shanghai advances the daily view even in a different browser timezone',async({page})=>{
 await page.clock.install({time:new Date('2030-01-02T15:59:50Z')});
 await page.goto('/');await page.getByRole('button',{name:'进入演示空间'}).click();await expect(page.locator('.app-shell')).toBeVisible();
 await page.request.post('/api/todos',{data:{title:'跨日保留事项',day:'2030-01-02',done:true}});await page.reload();await expect(page.getByLabel('查看日期')).toHaveValue('2030-01-02');await expect(page.locator('.todo-panel')).toContainText('跨日保留事项');
 await page.clock.fastForward(31_000);await expect(page.getByLabel('查看日期')).toHaveValue('2030-01-03');await expect(page.locator('.todo-panel')).not.toContainText('跨日保留事项');
 await page.getByLabel('查看日期').selectOption('2030-01-02');await expect(page.locator('.todo-panel')).toContainText('跨日保留事项');await expect(page.locator('.todo-panel')).toContainText('1 项完成');await expect(page.getByLabel('已完成',{exact:true})).toBeVisible();
});
