import {test,expect} from '@playwright/test';
test('scope save errors preserve draft and invalid selection; changing range keeps purpose and reopens correctly',async({page})=>{
 let memories:any[]=[];let calls=0;
 await page.route('**/api/v1/bootstrap',async route=>{const response=await route.fetch();const data=await response.json();return route.fulfill({json:{...data,memories,pendingMemoryBatches:[]}});});
 await page.route('**/api/v1/projects',route=>route.fulfill({json:{items:[{id:'project-one',name:'同名项目'},{id:'project-two',name:'同名项目'}]}}));
 await page.route('**/api/v1/threads?**',route=>route.fulfill({json:{items:[],total:0,nextCursor:null}}));
 await page.route('**/api/v1/memories',route=>{const body=route.request().postDataJSON();calls++;if(calls===1){expect(body.scopeKind).toBe('project');expect(body.scopeId).toBe('project-two');return route.fulfill({status:422,json:{error:'记忆所属项目不存在或已删除。'}});}expect(body).toEqual({opId:expect.any(String),content:'工作周报使用短句',scope:'周报',scopeKind:'global',scopeId:''});const memory={...body,id:'saved-memory',revision:1,status:'candidate'};memories=[memory];return route.fulfill({status:201,json:memory});});
 await page.goto('/');await page.getByRole('button',{name:'进入演示空间'}).click();await page.goto('/#memories');await page.getByRole('button',{name:'添加记忆',exact:true}).click();
 let dialog=page.getByRole('dialog');await dialog.getByLabel('记忆内容').fill('工作周报使用短句');await dialog.getByLabel('用途限制').selectOption('周报');await dialog.getByLabel('范围类型').selectOption('project');await dialog.getByLabel('所属项目').selectOption('project-two');await dialog.getByRole('button',{name:'保存记忆',exact:true}).click();
 await expect(dialog.getByRole('alert')).toContainText('项目不存在');await expect(dialog.getByLabel('所属项目')).toHaveValue('project-two');await expect(dialog.getByLabel('记忆内容')).toHaveValue('工作周报使用短句');
 await dialog.getByLabel('范围类型').selectOption('global');await expect(dialog.getByLabel('用途限制')).toHaveValue('周报');await dialog.getByRole('button',{name:'保存记忆',exact:true}).click();await expect(dialog).toHaveCount(0);
 await page.reload();await page.getByRole('button',{name:'编辑记忆',exact:true}).click();dialog=page.getByRole('dialog');await expect(dialog.getByLabel('范围类型')).toHaveValue('global');await expect(dialog.getByLabel('用途限制')).toHaveValue('周报');expect(calls).toBe(2);
});
