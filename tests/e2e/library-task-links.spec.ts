import {test,expect} from '@playwright/test';
test('associate from library, inspect a stale source in task, then remove without starting the task',async({page})=>{
 const file={id:'source-a',revision:1,title:'资料A',sourcePath:'a.md',content:'参考正文',copyName:'a.md',status:'ready'};
 const task={id:'task-a',revision:1,title:'学习目标',goal:'学习',status:'draft',minutes:0,repeat:'once',time:'20:00',requirement:'阅读',plan:{goal:'学习',conditions:'已有资料',steps:['阅读'],deliverable:'摘要'},logs:[],outputs:[]};
 let linked=false,attachment:Record<string,unknown>|null=null,starts=0;
 await page.route('**/api/v1/library/files?**',route=>route.fulfill({json:{items:[file],total:1,nextCursor:null}}));
 await page.route('**/api/v1/library/source-a',route=>route.fulfill({json:file}));
 await page.route('**/api/v1/library/source-a/index',route=>route.fulfill({json:{state:'indexed',sourceRevision:1,indexedRevision:1,retryable:false,message:'已完成索引'}}));
 await page.route('**/api/v1/library/source-a/tasks**',route=>{
  if(route.request().method()==='POST'){attachment=route.request().postDataJSON();linked=true;task.revision=2;return route.fulfill({json:task});}
  return route.fulfill({json:{items:[task],total:1,nextCursor:null}});
 });
 await page.route('**/api/v1/work-tasks',route=>route.fulfill({json:{tasks:[task],runs:[]}}));
 await page.route('**/api/v1/work-tasks/task-a/library',route=>route.fulfill({json:{items:linked?[{...file,available:false,issue:'资料已更新，请重新关联当前版本'}]:[],revision:task.revision,editable:true}}));
 await page.route('**/api/v1/work-tasks/task-a/library/source-a',route=>{linked=false;task.revision++;return route.fulfill({json:task});});
 await page.route('**/api/v1/work-tasks/task-a/action',route=>{starts++;return route.fulfill({json:task});});
 await page.goto('/');await page.getByRole('button',{name:'进入演示空间'}).click();await page.getByRole('button',{name:'资料库',exact:true}).click();
 await page.getByRole('dialog',{name:'个人资料库'}).getByRole('button',{name:'查看正文',exact:true}).click();
 const detail=page.getByRole('dialog',{name:'资料A',exact:true});await detail.getByText('关联已有任务',{exact:true}).click();
 await detail.getByRole('radio',{name:'选择任务 学习目标',exact:true}).check();await detail.getByRole('button',{name:'关联所选任务',exact:true}).click();
 await expect(detail.getByText('已关联到任务，尚未启动任务或确认完成。',{exact:true})).toBeVisible();
 expect(attachment).toMatchObject({taskId:'task-a',taskRevision:1,sourceRevision:1});
 await page.keyboard.press('Escape');await page.keyboard.press('Escape');await page.getByRole('button',{name:'任务',exact:true}).click();
 await page.getByRole('button',{name:'学习目标',exact:true}).click();const taskDialog=page.getByRole('dialog',{name:'学习目标',exact:true});
 await expect(taskDialog.getByText('资料已更新，请重新关联当前版本',{exact:true})).toBeVisible();
 await taskDialog.getByRole('button',{name:'移除资料关联',exact:true}).click();await expect(taskDialog.getByText('尚未关联资料，可从资料库详情添加。',{exact:true})).toBeVisible();
 expect(starts).toBe(0);expect(task.status).toBe('draft');
});
