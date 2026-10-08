import {test,expect} from '@playwright/test';
test('file indexing failure is separate from parse readiness and retry updates the detail without a full reload',async({page})=>{
 let retried=false,submitted:unknown;
 const failed={state:'failed',sourceRevision:7,retryable:true,message:'Embedding连接失败',completedChunks:2};
 const file={id:'index-file',revision:7,title:'已解析资料',sourcePath:'项目/a.md',status:'ready',reason:'正文已提取',content:'可阅读正文',copyName:'a.md',index:failed};
 await page.route('**/api/v1/library/files?**',route=>route.fulfill({json:{items:[file],total:1,nextCursor:null}}));
 await page.route('**/api/v1/library/index-file',route=>route.fulfill({json:file}));
 await page.route('**/api/v1/library/index-file/index',route=>{
  if(route.request().method()==='POST'){retried=true;submitted=route.request().postDataJSON();return route.fulfill({json:{state:'queued',sourceRevision:7,retryable:false,message:'索引任务已排队'}});}
  return route.fulfill({json:retried?{state:'indexed',sourceRevision:7,indexedRevision:7,completedChunks:3,retryable:false,message:'当前版本已完成索引'}:failed});
 });
 await page.goto('/');await page.getByRole('button',{name:'进入演示空间'}).click();await page.getByRole('button',{name:'资料库',exact:true}).click();
 const library=page.getByRole('dialog',{name:'个人资料库'});await expect(library.getByText('向量索引：Embedding连接失败 · 已处理 2 段',{exact:true})).toBeVisible();
 await library.getByRole('button',{name:'查看正文',exact:true}).click();const detail=page.getByRole('dialog',{name:'已解析资料',exact:true});
 await expect(detail.getByText('可阅读正文',{exact:true})).toBeVisible();await detail.getByRole('button',{name:'重试此文件索引',exact:true}).click();
 await expect(detail.getByText('向量索引：索引任务已排队',{exact:true})).toBeVisible();
 await expect(detail.getByText('向量索引：当前版本已完成索引 · 已处理 3 段 · 索引版本 7',{exact:true})).toBeVisible();
 await expect(detail.getByRole('button',{name:'重试此文件索引',exact:true})).toHaveCount(0);expect(submitted).toEqual({revision:7});
});
