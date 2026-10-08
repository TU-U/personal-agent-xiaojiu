import {test,expect} from '@playwright/test';
import {createServer} from 'node:http';
test('ordinary task retains chat context, repairs a stale reference and saves a reviewable plan',async({page})=>{
 test.skip(process.env.SHIGUANG_E2E_SUP_AUDIO!=='1','Requires isolated fixture with workers disabled');
 const calls:any[]=[];
 const model=createServer(async(req,res)=>{
  let raw='';for await(const part of req)raw+=part;
  const request=JSON.parse(raw),input=JSON.parse(request.messages[1].content);calls.push(input);
  res.setHeader('Content-Type','application/json');res.end(JSON.stringify({choices:[{message:{content:JSON.stringify({goal:input.goal,conditions:input.requirement,steps:['核对所选资料','整理本地练习提纲'],deliverable:'待人工核对的练习提纲'})},finish_reason:'stop'}]}));
 });
 await new Promise<void>((resolve,reject)=>{model.once('error',reject);model.listen(0,'127.0.0.1',resolve);});
 try{
  await page.goto('/');await page.getByRole('button',{name:'进入演示空间'}).click();await expect(page.locator('.app-shell')).toBeVisible();
  const note=await(await page.request.post('/api/v1/notes',{data:{title:'普通任务来源笔记',content:'在本地练习事务回滚，不购买课程。'}})).json();
  const turn=await(await page.request.post('/api/v1/ask',{data:{query:'只做本地练习，预算为零，不代替我执行。',references:[{id:note.id,kind:'note',revision:note.revision}],opId:crypto.randomUUID()}})).json();
  await page.goto('/#assistant');await page.locator('.history-item').filter({hasText:'只做本地练习'}).getByRole('button').first().click();
  const goal='整理事务回滚的练习提纲';await page.getByLabel('向助手提问').fill(goal);await page.getByRole('button',{name:'从这个话题创建任务',exact:true}).click();
  const form=page.locator('form').filter({has:page.getByRole('textbox',{name:'想完成什么',exact:true})});
  await expect(form.getByRole('textbox',{name:'想完成什么',exact:true})).toHaveValue(goal);await expect(form).toContainText('已关联搭子话题');
  await form.getByText('引用记录、要事或已导入的文件（1/5）',{exact:true}).click();await expect(form.getByLabel('已选调研材料')).toContainText(note.title);
  const requirement='保留预算为零和人工确认的要求';await form.getByRole('textbox',{name:'完成要求',exact:true}).fill(requirement);
  const updated=await(await page.request.patch('/api/v1/notes/'+note.id,{data:{revision:note.revision,content:'新版资料：在本地练习事务回滚，以原子性检查失败恢复，不购买课程。'}})).json();
  await page.request.patch('/api/v1/settings',{data:{provider:{baseUrl:`http://127.0.0.1:${(model.address() as {port:number}).port}`,model:'test-task-context',apiKey:'test-key'}}});
  await form.getByRole('button',{name:'生成待确认计划',exact:true}).click();await expect(page.getByRole('alert')).toContainText('版本已变化');expect(calls).toHaveLength(0);
  await expect(form.getByRole('textbox',{name:'想完成什么',exact:true})).toHaveValue(goal);await expect(form.getByRole('textbox',{name:'完成要求',exact:true})).toHaveValue(requirement);
  await form.getByRole('button',{name:'刷新材料列表',exact:true}).click();await expect(form).toContainText('已选旧版本，请移除后重选');
  await form.getByRole('button',{name:'移除 '+note.title,exact:true}).click();await form.getByRole('checkbox',{name:new RegExp(note.title+' · 版本 '+updated.revision)}).check();
  const saved=page.waitForResponse(r=>r.url().endsWith('/api/v1/work-tasks')&&r.request().method()==='POST');await form.getByRole('button',{name:'生成待确认计划',exact:true}).click();const result=await saved;expect(result.ok()).toBe(true);const task=await result.json();
  expect(calls).toHaveLength(1);expect(calls[0].requirement).toBe(requirement);expect(calls[0].sourceContext.sources[0].quote).toContain('新版资料');expect(calls[0].sourceContext.history[0].query).toContain('预算为零');
  expect(task.threadId).toBe(turn.threadId);expect(task.references[0].revision).toBe(updated.revision);expect(task.status).toBe('draft');expect(task.outputs).toEqual([]);
  await page.getByText('创建任务',{exact:true}).click();await expect(form.getByRole('textbox',{name:'想完成什么',exact:true})).toHaveValue('');await expect(form.getByRole('button',{name:'移除话题背景'})).toHaveCount(0);expect(await page.evaluate(()=>sessionStorage.getItem('taskDraft'))).toBeNull();
  await page.locator('.phase-card').getByRole('button',{name:goal,exact:true}).click();const dialog=page.getByRole('dialog',{name:goal});
  await dialog.getByText('生成计划时的来源与背景',{exact:true}).click();await dialog.getByText(note.title+' · 版本 '+updated.revision,{exact:true}).click();await expect(dialog).toContainText('新版资料');
  await dialog.getByText('只做本地练习，预算为零，不代替我执行。',{exact:true}).click();await expect(dialog.getByRole('button',{name:'确认计划并开始',exact:true})).toBeVisible();
 }finally{await page.request.patch('/api/v1/settings',{data:{provider:{baseUrl:'',model:'',clearKey:true}}}).catch(()=>{});model.closeAllConnections();await new Promise<void>(resolve=>model.close(()=>resolve()));}
});
