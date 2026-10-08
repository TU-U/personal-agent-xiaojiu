import {test,expect} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
for(const [title,amount,time] of [['篝火旅程','137','周五'],['书架改造','286','周六']])test('real model continues synthetic topic '+title,async({page})=>{
 test.skip(process.env.SHIGUANG_E2E_CHAT_LIVE!=='1','Explicit real-provider opt-in required');test.setTimeout(150000);
 await page.goto('/#assistant');await page.getByRole('button',{name:'进入演示空间'}).click();await expect(page.locator('.app-shell')).toBeVisible();
 const evidence=[];
 {
  await page.locator('.history-item').filter({hasText:title}).getByRole('button').first().click();
  await page.getByLabel('向助手提问').fill('那它的预算上限、确认时间和未确认前不能做的事分别是什么？请只据本话题和引用原文回答。');
  const response=page.waitForResponse(r=>r.url().endsWith('/api/v1/ask')&&r.request().method()==='POST',{timeout:120000});await page.getByLabel('发送问题').click();const result=await response;expect(result.ok()).toBe(true);const answer=await result.json();
  evidence.push({title,mode:answer.mode,body:answer.body,sources:answer.sources,threadId:answer.threadId});
  await writeFile('/tmp/shiguang-chat-live-'+title+'.json',JSON.stringify({checkedAt:new Date().toISOString(),evidence,status:'incomplete'},null,2));
  expect(answer.mode).toBe('model');expect(answer.body).toContain(amount);expect(answer.body).toContain(time);// Supplemental records can be contrasted explicitly; factual attribution is reviewed from the saved answer.
  expect(answer.sources.some((source:any)=>source.title===title)).toBe(true);
  if(title==='篝火旅程')expect(answer.sources.find((source:any)=>source.title===title).quote).toContain('未确认不得订票');
  await expect(page.locator('.answer-card').last()).toContainText(amount);await expect(page.locator('.answer-card').last().locator('.source-item').filter({hasText:title})).toContainText(title);
 }
 const history=(await (await page.request.get('/api/v1/threads/'+evidence[0].threadId+'/turns')).json()).items;expect(history).toHaveLength(2);expect(history.every((turn:any)=>turn.threadTitle===title)).toBe(true);
 await writeFile('/tmp/shiguang-chat-live-'+title+'.json',JSON.stringify({checkedAt:new Date().toISOString(),evidence,limitations:'Synthetic prior-day conversations; one real reply; automatic structure checks require separate semantic review, not a general accuracy score.'},null,2));
});
