import {test,expect} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
test('real multi-image note summary and event draft retain image facts and save only after confirmation',async({page,context})=>{
 test.skip(process.env.SHIGUANG_E2E_ACCOUNTING_LIVE!=='1','Uses the opt-in isolated saved-provider fixture with worker disabled');test.setTimeout(90000);
 const imagePage=await context.newPage();await imagePage.setViewportSize({width:800,height:600});
 await imagePage.setContent('<html lang="zh-CN"><meta charset="utf-8"><body style="font:30px sans-serif;padding:35px;background:white;color:black"><h2>工作坊计划草案（合成样本）</h2><p>活动总预算上限：200元</p><p>场地报价：180元</p><p>交通报价：80元</p><p>场地尚未预订，也未付款。</p><p>必须先确认预算，再决定是否执行。</p></body></html>');
 const planImage=await imagePage.screenshot({path:'/tmp/shiguang-synthetic-workshop.png'});await imagePage.close();
 const receipt=await readFile('tests/fixtures/synthetic-receipt.png');
 await page.goto('/');await page.getByRole('button',{name:'进入演示空间'}).click();await expect(page.locator('.app-shell')).toBeVisible();
 let note=await(await page.request.post('/api/v1/notes',{data:{title:'合成活动计划与独立午餐账单',content:'两张图是虚构练习素材。活动计划和午餐账单分开说明，不要将账单金额加到活动支出里；活动尚未执行。',tags:[]}})).json();
 for(const [name,buffer] of [['活动草案.png',planImage],['独立午餐账单.png',receipt]] as const){const response=await page.request.post('/api/v1/notes/'+note.id+'/images',{multipart:{revision:String(note.revision),images:{name,mimeType:'image/png',buffer}}});expect(response.ok()).toBe(true);note=await response.json();}
 await page.reload();await page.getByRole('button',{name:'打开记录：'+note.title,exact:true}).click();
 const summaryResponse=page.waitForResponse(r=>r.url().endsWith('/summarize')&&r.request().method()==='POST');await page.getByRole('button',{name:'AI 归纳',exact:true}).click();const summarizedResponse=await summaryResponse;expect(summarizedResponse.ok()).toBe(true);const summarized=await summarizedResponse.json();
 expect(summarized.summary).toContain('200');expect(summarized.summary).toContain('35.5');expect(summarized.summary).toMatch(/未.*(预订|付款|执行)|尚未/);expect(summarized.summaryInputs.imageIds).toHaveLength(2);
 await page.getByRole('dialog',{name:'记录详情'}).getByRole('button',{name:'关闭窗口'}).click();
 const created=await page.request.post('/api/v1/events',{data:{title:'待整理的合成活动',summary:'请结合活动图片整理，独立午餐账单不要并入活动预算。',sourceNoteId:note.id,priority:'normal',eventType:'one_off'}});expect(created.ok()).toBe(true);const event=await created.json();
 await page.goto('/#events');await page.locator('#event-'+event.id).getByRole('button',{name:'编辑',exact:true}).click();const dialog=page.getByRole('dialog',{name:'编辑要事'});
 await expect(dialog.locator('.event-images img')).toHaveCount(2);
 const draftResponse=page.waitForResponse(r=>r.url().includes('/api/v1/events/')&&r.request().method()==='POST');await dialog.getByRole('button',{name:'交由 AI 辅助编辑'}).click();const draftedResponse=await draftResponse;expect(draftedResponse.ok()).toBe(true);const draft=await draftedResponse.json();
 await expect(dialog.getByRole('textbox',{name:'摘要',exact:true})).toContainText('200');
 const before=await(await page.request.get('/api/v1/bootstrap')).json();expect(before.events.find((e:any)=>e.id===event.id).revision).toBe(event.revision);
 await dialog.getByRole('button',{name:'确认并保存要事'}).click();await expect(dialog).toHaveCount(0);
 const after=await(await page.request.get('/api/v1/bootstrap')).json(),saved=after.events.find((e:any)=>e.id===event.id);expect(saved.priority).toBe('normal');expect(saved.images).toHaveLength(2);expect(saved.summary).toContain('200');expect(saved.summary).toMatch(/未.*(预订|付款|执行)|尚未/);
 for(let i=0;i<2;i++){const response=await page.request.get('/api/v1/events/'+event.id+'/image/'+saved.images[i].id);expect(await response.body()).toEqual(i===0?planImage:receipt);}
 await writeFile('/tmp/shiguang-image-note-event-live.json',JSON.stringify({checkedAt:new Date().toISOString(),summary:summarized.summary,summaryInputs:summarized.summaryInputs,draft,saved,scope:'Synthetic Chinese activity image and English receipt; real saved model, UI/API; human save simulated; no real spending or activity'},null,2));
});
