import {test,expect} from '@playwright/test';
test('search pricing is explicit, persists, and web retry creates a new budgeted report',async({page})=>{
 await page.goto('/#settings');await page.getByRole('button',{name:'进入演示空间'}).click();await expect(page.locator('.app-shell')).toBeVisible();
 await page.getByLabel('Brave Search API 密钥',{exact:true}).fill('browser-synthetic-search-key');await page.getByRole('button',{name:'保存搜索密钥'}).click();
 await page.getByText('调研自动搜索的人民币费用上限',{exact:true}).click();
 const pricing=page.locator('details').filter({has:page.getByText('调研自动搜索的人民币费用上限',{exact:true})});
 await pricing.getByLabel('每次搜索费用上限（人民币）').fill('0.05');await pricing.getByLabel('价格复核期限（未来31天内）').fill(new Date(Date.now()+40*86400000).toISOString().slice(0,16));
 await expect(pricing.getByRole('button',{name:'保存已核对的搜索费用'})).toBeDisabled();await pricing.getByRole('checkbox').check();await pricing.getByRole('button',{name:'保存已核对的搜索费用'}).click();await expect(pricing.getByRole('alert')).toContainText('未来31天内');await expect(pricing.getByLabel('每次搜索费用上限（人民币）')).toHaveValue('0.05');
 await pricing.getByLabel('价格复核期限（未来31天内）').fill(new Date(Date.now()+3*86400000).toISOString().slice(0,16));await pricing.getByRole('checkbox').check();await pricing.getByRole('button',{name:'保存已核对的搜索费用'}).click();await expect(pricing).toContainText('费用上限已保存');
 const saved=await (await page.request.get('/api/v1/research-search-settings')).json();expect(saved.usable).toBe(true);expect(saved.maxCostMicros).toBe(50000);expect(saved.keyHash).toBeUndefined();
 await page.reload();await page.getByText('调研自动搜索的人民币费用上限',{exact:true}).click();await expect(pricing.getByLabel('每次搜索费用上限（人民币）')).toHaveValue('0.050000');
 await page.request.patch('/api/v1/settings',{data:{webSearch:{apiKey:'changed-test-key'}}});await pricing.getByRole('button',{name:'重新读取搜索费用设置'}).click();await expect(pricing).toContainText('搜索密钥已变化');await page.request.patch('/api/v1/settings',{data:{webSearch:{apiKey:'browser-synthetic-search-key'}}});
 await page.goto('/#workTasks');await page.getByText('快速学习与调研',{exact:true}).click();await page.getByLabel('调研主题',{exact:true}).fill('联网学习事务');await page.getByLabel(/^关键问题（每行一个/).fill('怎样回滚事务？');await page.getByRole('button',{name:'生成调研计划',exact:true}).click();
 const modal=page.getByRole('dialog',{name:'调研计划与进度'});await expect(modal.getByRole('button',{name:'确认此计划并开始调研'})).toBeVisible();await modal.getByRole('button',{name:'确认此计划并开始调研'}).click();await expect(modal.getByRole('heading',{name:'调研报告',exact:true})).toBeVisible();
 await expect(modal).toContainText('搜索摘要');await expect(modal).toContainText('网页文字');await modal.getByText('查看当时引用的原文',{exact:true}).click();await expect(modal.getByRole('link',{name:'打开网页来源'})).toHaveCount(2);await expect(modal).toContainText('网页全文长度未知');
 const task=(await (await page.request.get('/api/v1/work-tasks')).json()).tasks.find((t:any)=>t.title==='联网学习事务');const first=await (await page.request.get('/api/v1/research-tasks/'+task.id)).json();expect(first.budget.chargedMicros).toBe(51000);
 await modal.getByRole('button',{name:'重新联网取材（沿用剩余预算）'}).click();await expect(modal.getByLabel('报告版本 2',{exact:true})).toBeVisible();const second=await (await page.request.get('/api/v1/research-tasks/'+task.id)).json();expect(second.artifacts).toHaveLength(2);expect(second.artifacts[0].body).toBe(first.artifacts[0].body);expect(second.budget.chargedMicros).toBe(101500);
 await page.request.post('/api/v1/research-search-settings',{data:{revision:saved.revision,enabled:false}});await page.request.patch('/api/v1/settings',{data:{webSearch:{clearKey:true}}});
});
