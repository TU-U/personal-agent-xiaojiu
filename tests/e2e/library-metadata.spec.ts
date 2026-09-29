import {test,expect} from '@playwright/test';
test('invalid project remains removable, failed save preserves draft, and uncertain retry reuses the request before reopening',async({page})=>{
 let file={id:'metadata',revision:1,title:'原资料.md',sourcePath:'项目/原资料.md',content:'# 保留正文',status:'ready',reason:'已解析',copyName:'a.md',tags:['原标签'],projectId:'deleted-project',project:'旧项目标签'};
 const requests:Record<string,unknown>[]=[];
 await page.route('**/api/projects',route=>route.fulfill({json:{items:[]}}));
 await page.route('**/api/library/files?**',route=>route.fulfill({json:{items:[file],total:1,nextCursor:null}}));
 await page.route('**/api/library/metadata',route=>route.fulfill({json:file}));
 await page.route('**/api/library/metadata/index',route=>route.fulfill({json:{state:'queued',sourceRevision:file.revision,retryable:false,message:'等待当前版本索引'}}));
 await page.route('**/api/library/metadata/metadata',route=>{
  const body=route.request().postDataJSON();requests.push(body);
  if(requests.length===1)return route.fulfill({status:422,json:{error:'所选项目已失效，请重新选择或取消项目关联。'}});
  if(requests.length===2){file={...file,title:body.title,tags:body.tags,projectId:body.projectId,revision:2};return route.abort('connectionfailed');}
  return route.fulfill({json:{file,savedRevision:2}});
 });
 await page.goto('/');await page.getByRole('button',{name:'进入演示空间'}).click();await page.getByRole('button',{name:'资料库',exact:true}).click();
 const library=page.getByRole('dialog',{name:'个人资料库'});await library.getByRole('button',{name:'查看正文',exact:true}).click();
 let detail=page.getByRole('dialog',{name:'原资料.md',exact:true});await detail.getByRole('button',{name:'编辑资料信息',exact:true}).click();
 await detail.getByLabel('资料标题',{exact:true}).fill('新的资料标题');await detail.getByLabel('资料标签（每行一个，最多20个）',{exact:true}).fill('方案\n阅读');
 await expect(detail.getByLabel('资料关联项目')).toHaveValue('deleted-project');await detail.getByRole('button',{name:'保存资料信息',exact:true}).click();
 await expect(detail.getByRole('alert')).toContainText('所选项目已失效');await expect(detail.getByLabel('资料标题',{exact:true})).toHaveValue('新的资料标题');
 await detail.getByLabel('资料关联项目').selectOption('');await detail.getByRole('button',{name:'保存资料信息',exact:true}).click();
 await expect(detail.getByText('保存结果尚未确认，请重试同一次保存。当前输入已保留。',{exact:true})).toBeVisible();
 await detail.getByRole('button',{name:'重试确认保存',exact:true}).click();detail=page.getByRole('dialog',{name:'新的资料标题',exact:true});
 await expect(detail.getByText('资料信息保存已确认。',{exact:true})).toBeVisible();expect(requests[2]).toEqual(requests[1]);
 await page.keyboard.press('Escape');await library.getByRole('button',{name:'查看正文',exact:true}).click();
 await expect(page.getByRole('dialog',{name:'新的资料标题',exact:true}).getByText('标签：方案、阅读',{exact:true})).toBeVisible();
 await expect(page.getByRole('dialog',{name:'新的资料标题',exact:true}).getByRole('heading',{name:'保留正文',exact:true})).toBeVisible();
});
