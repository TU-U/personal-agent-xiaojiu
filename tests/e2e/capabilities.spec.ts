import {test,expect} from '@playwright/test';
test('independent vision configuration persists and its failure is shown separately',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'进入演示空间'}).click();await expect(page.locator('.app-shell')).toBeVisible();
 await page.goto('/#settings');await page.getByText('单独配置图片分析模型',{exact:true}).click();
 await page.getByLabel('图片模型接口地址',{exact:true}).fill('http://127.0.0.1:1');await page.getByLabel('图片模型名称',{exact:true}).fill('vision-fixture');
 await page.getByRole('button',{name:'保存图片模型',exact:true}).click();await expect(page.getByRole('button',{name:'测试图片分析',exact:true})).toBeEnabled();
 await page.getByRole('button',{name:'测试图片分析',exact:true}).click();await expect(page.getByText(/本项测试失败：无法连接模型服务/)).toBeVisible();
 await expect(page.getByRole('button',{name:'测试语音转写',exact:true})).toBeDisabled();
 await page.reload();await page.getByText('单独配置图片分析模型',{exact:true}).click();await expect(page.getByLabel('图片模型名称',{exact:true})).toHaveValue('vision-fixture');
 await page.getByRole('button',{name:'沿用文本模型配置',exact:true}).click();await expect(page.getByText('未配置或尚未接入 · 沿用文本配置，需单独验证')).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
