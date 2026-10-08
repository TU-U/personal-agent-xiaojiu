import {test,expect} from '@playwright/test';
import {createServer} from 'node:http';

test('stored audio evidence flows through manual confirmation and recap, retaining stale-source explanations',async({page})=>{
 test.skip(process.env.SHIGUANG_E2E_SUP_AUDIO!=='1','Requires the isolated stored-transcript fixture');
 let reviews=0,recaps=0;
 const model=createServer(async(req,res)=>{
  let raw='';for await(const chunk of req)raw+=chunk;
  const data=JSON.parse(raw),system=data.messages[0].content,input=JSON.parse(data.messages[1].content);
  let result;
  if(system.includes('验收任务证据')){
   reviews++;const source=input.sources.find((s:any)=>s.id==='supervision-audio-fixture');
   expect(source.content).toContain('识别可能有误');expect(source.content).toContain('回滚失败的转账');
   result={results:input.conditions.map((c:any)=>({conditionId:c.id,status:'satisfied',reason:'找到口述心得及实践例子',evidence:[{sourceId:source.id,quote:'实践例子：回滚失败的转账。'}]}))};
  }else if(system.includes('每日复盘助手')){
   recaps++;expect(input.items[0].references[0].content).toContain('回滚失败的转账');
   result={items:input.items.map((item:any)=>({runId:item.id,advice:'核对口述转写中的回滚例子，再安排下一次练习。'}))};
  }else{res.statusCode=500;res.end('Unexpected model operation');return;}
  res.setHeader('Content-Type','application/json');res.end(JSON.stringify({choices:[{message:{content:JSON.stringify(result)},finish_reason:'stop'}]}));
 });
 await new Promise<void>((resolve,reject)=>{model.once('error',reject);model.listen(0,'127.0.0.1',resolve);});
 try{
  await page.goto('/#workTasks');await page.getByRole('button',{name:'进入演示空间'}).click();await expect(page.locator('.app-shell')).toBeVisible();
  expect((await page.request.patch('/api/v1/settings',{data:{provider:{baseUrl:`http://127.0.0.1:${(model.address() as {port:number}).port}`,model:'test-audio-evidence',apiKey:'test-key'}}})).ok()).toBe(true);
  const todo=await(await page.request.post('/api/v1/todos',{data:{title:'口述学习验收'}})).json();
  const upgraded=await page.request.post(`/api/v1/todos/${todo.id}/upgrade`,{data:{opId:'audio-browser-upgrade',revision:todo.revision,conditions:[{id:'result',kind:'evidence',required:true,description:'口述三条心得及一个实践例子'}],minutes:0,repeat:'once',startTime:'09:00',time:'20:00'}});
  expect(upgraded.ok()).toBe(true);const {runId}=await upgraded.json();await page.reload();
  const card=page.locator('.phase-card').filter({hasText:'本次完成要求：口述三条心得及一个实践例子'});
  await card.getByRole('button',{name:'提交证据 / 调整',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'本次执行证据'});
  await dialog.getByRole('checkbox',{name:/录音学习心得/}).check();await dialog.getByRole('button',{name:'检查证据',exact:true}).click();await expect(dialog).toHaveCount(0);
  const getRun=async()=>{const state=await(await page.request.get('/api/v1/work-tasks')).json();return state.runs.find((r:any)=>r.id===runId);};
  expect((await getRun()).status).toBe('review');
  await card.getByRole('button',{name:'确认完成',exact:true}).click();await expect(card).toContainText('已确认完成');
  await page.getByText('每日复盘',{exact:true}).click();
  const recap=page.locator('details').filter({has:page.locator('summary').getByText('每日复盘',{exact:true})});
  await expect(recap).toContainText('已确认完成 1 项');await recap.getByText('查看交付与证据',{exact:true}).click();await recap.getByText(/录音学习心得 · 版本/).click();await expect(recap).toContainText('识别可能有误');
  await recap.getByRole('button',{name:'生成 AI 复盘建议',exact:true}).click();await expect(recap).toContainText('核对口述转写中的回滚例子');
  expect((await page.request.patch('/api/v1/notes/supervision-audio-fixture/transcript',{data:{revision:1,transcriptRevision:1,texts:['修订后：实践例子还需核对。']}})).ok()).toBe(true);
  await recap.getByRole('button',{name:'刷新复盘事实'}).click();await expect(recap).toContainText('已有 AI 建议依据的记录已变化');
  await recap.getByText('查看交付与证据',{exact:true}).click();await recap.getByText(/录音学习心得 · 版本/).click();await expect(recap).toContainText('版本已变化');await expect(recap).not.toContainText('修订后：实践例子还需核对');
  expect((await getRun()).status).toBe('completed');expect(reviews).toBe(1);expect(recaps).toBe(1);
 }finally{await page.request.patch('/api/v1/settings',{data:{provider:{baseUrl:'',model:'',clearKey:true}}}).catch(()=>{});model.closeAllConnections();await new Promise<void>(resolve=>model.close(()=>resolve()));}
});
