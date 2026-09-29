import {test,expect} from '@playwright/test';
test('manual activation shows conflict evidence and requires explicit replacement, then persists on reopen',async({page})=>{
 let old={id:'old-memory',revision:1,title:'旧记忆',content:'我住深圳',scope:'通用',status:'active',createdAt:'2026-09-29',updatedAt:'2026-09-29'};
 let candidate={...old,id:'new-memory',title:'新记忆',content:'我住广州',status:'candidate'};
 let requests=0;
 await page.route('**/api/bootstrap',async route=>{const response=await route.fetch();const data=await response.json();await route.fulfill({json:{...data,memories:[old,candidate]}});});
 await page.route('**/api/memories/new-memory',route=>{
  const body=route.request().postDataJSON();requests++;
  if(requests===1){candidate={...candidate,revision:2};return route.fulfill({status:409,json:{error:'发现记忆冲突，请核对新旧内容后选择。',current:{memory:candidate,conflicts:[{id:old.id,revision:old.revision,content:old.content,reason:'同一用户当前居住地发生变化'}]}}});}
  expect(body).toEqual({opId:expect.any(String),revision:2,status:'active',replace:[{id:old.id,revision:1}]});old={...old,revision:2,status:'paused'};candidate={...candidate,revision:3,status:'active'};return route.fulfill({json:candidate});
 });
 await page.goto('/');await page.getByRole('button',{name:'进入演示空间'}).click();await page.goto('/#memories');
 await page.getByRole('button',{name:'确认记住',exact:true}).click();const dialog=page.getByRole('dialog',{name:'核对记忆冲突'});
 await expect(dialog.getByText('我住深圳',{exact:true})).toBeVisible();await expect(dialog.getByText('我住广州',{exact:true})).toBeVisible();await expect(dialog.getByText('同一用户当前居住地发生变化',{exact:true})).toBeVisible();expect(requests).toBe(1);
 await dialog.getByRole('button',{name:'确认使用新记忆，替代上述旧记忆',exact:true}).click();await expect(dialog).toHaveCount(0);
 await page.reload();await expect(page.locator('.memory-card.active')).toContainText('我住广州');await expect(page.locator('.memory-card.paused')).toContainText('我住深圳');expect(requests).toBe(2);
});
