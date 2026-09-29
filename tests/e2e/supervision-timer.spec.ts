import {test,expect} from '@playwright/test';
import {createServer} from 'node:http';
test('real timing and lost adjustment response preserve one auditable addition after reload',async({page})=>{
 const model=createServer(async(req,res)=>{let raw='';for await(const chunk of req)raw+=chunk;const body=JSON.parse(raw),planning=body.messages?.[0]?.content?.includes('任务规划助手');const content=planning?{goal:'阅读',conditions:'一本书',steps:['阅读'],deliverable:'心得'}:{tool:'wait_external',reason:'等待用户阅读'};res.setHeader('Content-Type','application/json');res.end(JSON.stringify({choices:[{message:{content:JSON.stringify(content)},finish_reason:'stop'}]}));});
 await new Promise<void>(resolve=>model.listen(0,'127.0.0.1',resolve));const address=model.address() as {port:number};
 try{
  await page.goto('/#workTasks');await page.getByRole('button',{name:'进入演示空间'}).click();await expect(page.locator('.app-shell')).toBeVisible();
  expect((await page.request.patch('/api/settings',{data:{provider:{baseUrl:`http://127.0.0.1:${address.port}`,model:'test-timer',apiKey:'test-key'}}})).ok()).toBe(true);
  const created=await page.request.post('/api/work-tasks',{data:{goal:'投入补记重试测试',minutes:45,repeat:'once',time:'20:00',startTime:'09:00',requirement:'心得'}});expect(created.ok()).toBe(true);const task=await created.json();
  expect((await page.request.post('/api/work-tasks/'+task.id+'/action',{data:{action:'start'}})).ok()).toBe(true);
  const data=await (await page.request.get('/api/work-tasks')).json(),run=data.runs.find((r:any)=>r.taskId===task.id);expect(run).toBeTruthy();
  await page.reload();const card=page.locator('.phase-card').filter({hasText:'本次完成要求：'}).filter({hasText:'投入补记重试测试'});
  await card.getByRole('button',{name:'开始计时',exact:true}).click();await card.getByRole('button',{name:'暂停计时',exact:true}).click();
  await card.getByText('投入记录 · 1 段计时 / 0 次补记',{exact:true}).click();await expect(card).toContainText('已保存');
  const before=(await (await page.request.get('/api/work-tasks')).json()).runs.find((r:any)=>r.id===run.id);expect(before.timerAt).toBeNull();
  let sent:any,requests=0;await page.route('**/api/work-runs/'+run.id+'/action',async route=>{requests++;const body=route.request().postDataJSON();if(requests===1){sent=body;expect(typeof body.opId).toBe('string');const response=await route.fetch();expect(response.ok()).toBe(true);return route.abort('failed');}expect(body).toEqual(sent);return route.fulfill({response:await route.fetch()});});
  await card.getByRole('button',{name:'提交证据 / 调整',exact:true}).click();const dialog=page.getByRole('dialog',{name:'本次执行证据'});await dialog.getByPlaceholder('分钟',{exact:true}).fill('5');await dialog.getByPlaceholder('补记原因',{exact:true}).fill('离线读书');await dialog.getByRole('button',{name:'补记',exact:true}).click();await expect(dialog).toContainText('连接暂时中断');
  await page.reload();await page.getByRole('button',{name:'重试任务操作',exact:true}).click();await expect(page.getByRole('button',{name:'重试任务操作',exact:true})).toHaveCount(0);expect(requests).toBe(2);
  const after=(await (await page.request.get('/api/work-tasks')).json()).runs.find((r:any)=>r.id===run.id);expect(after.seconds).toBe(before.seconds+300);expect(after.manualAdjustments).toHaveLength(1);expect(after.evidenceRevision).toBe(before.evidenceRevision);
  await page.getByText('投入记录 · 1 段计时 / 1 次补记',{exact:true}).click();await expect(page.locator('.phase-panel')).toContainText('原因：离线读书');
 }finally{await page.request.patch('/api/settings',{data:{provider:{baseUrl:'',model:'',clearKey:true}}}).catch(()=>{});model.closeAllConnections();await new Promise<void>(resolve=>model.close(()=>resolve()));}
});
