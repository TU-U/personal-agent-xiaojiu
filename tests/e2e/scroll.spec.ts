import {test,expect} from '@playwright/test';

test.beforeEach(async({page})=>{
 await page.goto('/');
 await page.getByRole('button',{name:'进入演示空间'}).click();
 await expect(page.locator('.app-shell')).toBeVisible();
});

test('short viewport can scroll the whole navigation and reach settings',async({page},testInfo)=>{
 await page.setViewportSize({width:testInfo.project.name==='android'?390:960,height:480});
 if(testInfo.project.name==='android')await page.getByLabel('打开导航').click();
 const sidebar=page.locator('.sidebar');
 await expect(sidebar).toBeVisible();
 const metrics=await sidebar.evaluate(el=>({client:el.clientHeight,scroll:el.scrollHeight}));
 expect(metrics.scroll).toBeGreaterThan(metrics.client);
 await sidebar.evaluate(el=>{el.scrollTop=el.scrollHeight;});
 await expect.poll(()=>sidebar.evaluate(el=>el.scrollTop)).toBeGreaterThan(0);
 await expect(sidebar.getByRole('button',{name:'设置与数据'})).toBeInViewport();
 await sidebar.getByRole('button',{name:'设置与数据'}).click();
 await expect(page.getByRole('main')).toContainText('设置');
});

test('long report and editor reach their last content on a short viewport',async({page},testInfo)=>{
 await page.setViewportSize({width:testInfo.project.name==='android'?390:960,height:480});
 await page.goto('/#artifacts');
 await page.getByRole('button',{name:'新建成果'}).click();
 const form=page.getByRole('dialog',{name:'让记录变成一份新成果'}).locator('form');
 await expect(form.getByRole('button',{name:'开始整理'})).toBeVisible();
 await form.evaluate(el=>{el.scrollTop=el.scrollHeight;});
 await expect(form.getByRole('button',{name:'开始整理'})).toBeInViewport();
 await page.getByLabel('资料范围').selectOption('');
 await page.getByRole('button',{name:'开始整理'}).click();
 const detail=page.getByRole('dialog',{name:'成果工作台'}).locator('.artifact-detail');
 await expect(detail).toBeVisible();
 await detail.getByRole('button',{name:'编辑',exact:true}).click();
 await page.getByLabel('成果正文').fill('# 长报告\n\n'+Array.from({length:80},(_,i)=>`第 ${i+1} 段：这段内容用于检查较矮窗口中的报告能否读到末尾。`).join('\n\n')+'\n\n报告末尾标记');
 await detail.getByRole('button',{name:'保存',exact:true}).click();
 await expect(detail.getByText('报告末尾标记')).toBeAttached();
 const metrics=await detail.evaluate(el=>({client:el.clientHeight,scroll:el.scrollHeight}));
 expect(metrics.scroll).toBeGreaterThan(metrics.client);
 await detail.evaluate(el=>{el.scrollTop=el.scrollHeight;});
 await expect.poll(()=>detail.evaluate(el=>el.scrollTop)).toBeGreaterThan(0);
 await expect(detail.getByText('报告末尾标记')).toBeInViewport();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
