import {test,expect} from '@playwright/test';
test('stable project selection survives send and reopening without using same-name text as ID',async({page})=>{
 let turns:any[]=[];let calls=0;
 await page.route('**/api/v1/bootstrap',async route=>{const response=await route.fetch();const data=await response.json();return route.fulfill({json:{...data,conversations:turns,pendingMemoryBatches:[]}});});
 await page.route('**/api/v1/projects',route=>route.fulfill({json:{items:[{id:'project-first',name:'同名项目'},{id:'project-second',name:'同名项目'}]}}));
 await page.route('**/api/v1/threads?**',route=>route.fulfill({json:{items:turns.length?[turns.at(-1)]:[],total:turns.length?1:0,nextCursor:null}}));
 await page.route('**/api/v1/threads/scope-thread/turns?**',route=>route.fulfill({json:{items:turns,nextCursor:null}}));
 await page.route('**/api/v1/threads/scope-thread/context',route=>route.fulfill({json:{text:''}}));
 await page.route('**/api/v1/ask',route=>{const body=route.request().postDataJSON();calls++;expect(body.projectId).toBe('project-second');expect(body.project).toBe('');if(calls===2)expect(body.threadId).toBe('scope-thread');const turn={id:'scope-turn-'+calls,threadId:'scope-thread',threadTitle:'项目范围讨论',projectId:body.projectId,project:'',query:body.query,body:'按照项目偏好建议。[1]',mode:'model',revision:1,createdAt:'2026-09-29T00:00:0'+calls+'Z',memoryReview:'none',sources:[{id:'memory',kind:'memory',title:'项目偏好',quote:'短句说明',revision:1,createdAt:'2026-09-29',scopeKind:'project',scopeId:body.projectId,purpose:'通用'}]};turns.push(turn);return route.fulfill({json:turn});});
 await page.goto('/');await page.getByRole('button',{name:'进入演示空间'}).click();await page.goto('/#assistant');await page.getByLabel('问答资料范围').selectOption('id:project-second');await page.getByLabel('向助手提问').fill('项目应该如何讨论');await page.getByRole('button',{name:'发送问题',exact:true}).click();
 await expect(page.getByText('已确认长期记忆 · 项目 project- · 通用 · 短句说明',{exact:true})).toBeVisible();
 await page.reload();await page.getByRole('button',{name:/^项目范围讨论.*继续聊/}).click();await expect(page.getByLabel('问答资料范围')).toHaveValue('id:project-second');await page.getByLabel('向助手提问').fill('接着聊');await page.getByRole('button',{name:'发送问题',exact:true}).click();await expect.poll(()=>calls).toBe(2);
});
