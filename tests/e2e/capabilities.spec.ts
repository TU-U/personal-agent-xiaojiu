import {test,expect} from '@playwright/test';
test('audio diagnostics keep transcription and speaker failures separate and allow retry',async({page})=>{
 const checkedAt='2026-10-08T04:00:00Z';
 const items=[
  {id:'text',label:'文本生成',test:{ok:true,checkedAt}},
  {id:'asr',label:'语音转写',test:null},
  {id:'diarization',label:'说话人分离',test:null},
 ].map(item=>({...item,configured:true,source:'隔离诊断样本',notice:'',config:{baseUrl:'',model:'local-fixture',hasKey:false}}));
 let asrCalls=0,speakerCalls=0;
 await page.route('**/api/v1/settings/capabilities',route=>route.fulfill({json:{items}}));
 await page.route('**/api/v1/settings/capabilities/asr/test',async route=>{
  asrCalls++;Object.assign(items[1],{test:{ok:true,checkedAt,detail:{notice:'转写诊断完成'}}});
  await route.fulfill({json:{ok:true}});
 });
 await page.route('**/api/v1/settings/capabilities/diarization/test',async route=>{
  speakerCalls++;const ok=speakerCalls>1;
  Object.assign(items[2],{test:{ok,checkedAt,...(ok?{}:{error:'说话人模型加载失败，请检查本地配置'})}});
  await route.fulfill({status:ok?200:503,json:ok?{ok:true}:{error:'说话人模型加载失败，请检查本地配置'}});
 });
 await page.goto('/#settings');await page.getByRole('button',{name:'进入演示空间'}).click();await expect(page.locator('.app-shell')).toBeVisible();
 const panel=(label:string)=>page.locator('.settings-panel .subtle-notice').filter({has:page.locator('strong',{hasText:label})});
 await page.getByRole('button',{name:'测试语音转写',exact:true}).click();
 await expect(panel('语音转写').locator('p[role="status"]')).toHaveText('本项测试成功');
 await page.getByRole('button',{name:'测试说话人分离',exact:true}).click();
 await expect(panel('说话人分离').locator('p[role="status"]')).toContainText('本项测试失败：说话人模型加载失败');
 await expect(panel('语音转写').locator('p[role="status"]')).toHaveText('本项测试成功');
 await expect(panel('文本生成').locator('p[role="status"]')).toHaveText('本项测试成功');
 await page.reload();await expect(panel('说话人分离').locator('p[role="status"]')).toContainText('本项测试失败');
 await page.getByRole('button',{name:'测试说话人分离',exact:true}).click();
 await expect(panel('说话人分离').locator('p[role="status"]')).toHaveText('本项测试成功');
 await expect(panel('语音转写').locator('p[role="status"]')).toHaveText('本项测试成功');
 expect(asrCalls).toBe(1);expect(speakerCalls).toBe(2);
});
test('independent vision configuration persists and its failure is shown separately',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'进入演示空间'}).click();await expect(page.locator('.app-shell')).toBeVisible();
 await page.goto('/#settings');await page.getByText('单独配置图片分析模型',{exact:true}).click();
 await page.getByLabel('图片模型接口地址',{exact:true}).fill('http://127.0.0.1:1');await page.getByLabel('图片模型名称',{exact:true}).fill('vision-fixture');
 await page.getByRole('button',{name:'保存图片模型',exact:true}).click();await expect(page.getByRole('button',{name:'测试图片分析',exact:true})).toBeEnabled();
 await page.getByRole('button',{name:'测试图片分析',exact:true}).click();await expect(page.getByText(/本项测试失败：无法连接模型服务/)).toBeVisible();
 const capabilities=await(await page.request.get('/api/v1/settings/capabilities')).json();
 const audioButton=page.getByRole('button',{name:'测试语音转写',exact:true});
 if(capabilities.items.find((item:{id:string;configured:boolean})=>item.id==='asr').configured)await expect(audioButton).toBeEnabled();else await expect(audioButton).toBeDisabled();
 await page.reload();await page.getByText('单独配置图片分析模型',{exact:true}).click();await expect(page.getByLabel('图片模型名称',{exact:true})).toHaveValue('vision-fixture');
 await page.getByRole('button',{name:'沿用文本模型配置',exact:true}).click();await expect(page.getByText('未配置或尚未接入 · 沿用文本配置，需单独验证')).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
