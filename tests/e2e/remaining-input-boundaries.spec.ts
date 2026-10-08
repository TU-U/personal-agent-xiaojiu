import {test,expect} from '@playwright/test';
test.beforeEach(async({page})=>{
 test.skip(process.env.SHIGUANG_E2E_SUP_AUDIO!=='1','Uses an isolated stored transcript; no ASR or model calls');
 await page.goto('/');await page.getByRole('button',{name:'进入演示空间'}).click();await expect(page.locator('.app-shell')).toBeVisible();
});

test('transcript polling failure and source updates preserve an editable draft',async({page})=>{
 const endpoint='/api/v1/notes/supervision-audio-fixture/transcription';
 await page.getByRole('button',{name:'打开记录：录音学习心得',exact:true}).click();
 const panel=page.getByLabel('录音转写');
 await panel.getByRole('button',{name:'修订转写与说话人'}).click();
 const input=panel.getByLabel('第 1 段转写',{exact:true});
 await input.fill('尚未保存的人工修订，不得被轮询覆盖。');
 await page.route('**'+endpoint,route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'定向模拟刷新失败'})}));
 await expect(panel.getByRole('alert')).toContainText('转写状态暂时无法刷新');
 await expect(input).toHaveValue('尚未保存的人工修订，不得被轮询覆盖。');
 await page.unroute('**'+endpoint);
 const before=(await(await page.request.get(endpoint)).json()).note;
 const changed=await page.request.patch('/api/v1/notes/supervision-audio-fixture/transcript',{data:{revision:before.revision,transcriptRevision:before.transcript.transcriptRevision,texts:['另一个窗口已保存的新转写。']}});
 expect(changed.ok()).toBe(true);
 await expect(panel.getByRole('alert')).toHaveCount(0);
 await expect(input).toHaveValue('尚未保存的人工修订，不得被轮询覆盖。');
 await panel.getByRole('button',{name:'保存转写修订'}).click();
 await expect(panel.getByRole('alert')).toBeVisible();
 await expect(input).toHaveValue('尚未保存的人工修订，不得被轮询覆盖。');
 const stored=(await(await page.request.get(endpoint)).json()).note;
 expect(stored.transcript.segments[0].text).toBe('另一个窗口已保存的新转写。');
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('shiguang-transcript-supervision-audio-fixture')!).texts[0])).toBe('尚未保存的人工修订，不得被轮询覆盖。');
 await panel.getByRole('button',{name:'放弃修订'}).click();
 await expect(panel.locator('.transcript-segment p')).toHaveText('另一个窗口已保存的新转写。');
});

test('reference picker expands beyond one hundred and keeps selections across search and type changes',async({page})=>{
 for(let i=0;i<101;i++){
  const response=await page.request.post('/api/v1/notes',{data:{title:'分页资料'+String(i).padStart(3,'0'),content:'分页选取验证内容',tags:[]}});
  expect(response.ok()).toBe(true);
 }
 await page.goto('/#assistant');await page.getByRole('button',{name:'引用记录或要事',exact:true}).click();
 const picker=page.getByRole('dialog',{name:'引用记录或要事'});
 await picker.getByLabel('搜索可引用资料').fill('分页资料');
 await expect(picker.locator('.reference-picker-item')).toHaveCount(100);
 const initial=await picker.locator('.reference-picker-item strong').allTextContents();
 const missing=Array.from({length:101},(_,i)=>'分页资料'+String(i).padStart(3,'0')).find(title=>!initial.includes(title))!;
 await picker.getByRole('button',{name:'查看更多资料'}).click();
 await expect(picker.locator('.reference-picker-item')).toHaveCount(101);
 await picker.locator('.reference-picker-item').filter({has:page.getByText(missing,{exact:true})}).click();
 await picker.getByLabel('搜索可引用资料').fill(missing);
 await expect(picker.locator('.reference-picker-item')).toHaveCount(1);
 await expect(picker.locator('.reference-picker-item')).toHaveAttribute('aria-pressed','true');
 await picker.getByRole('button',{name:/^要事 ·/}).click();await expect(picker).toContainText('已选 1/5');
 await picker.getByRole('button',{name:/^记录 ·/}).click();await expect(picker.locator('.reference-picker-item')).toHaveAttribute('aria-pressed','true');
 await picker.getByRole('button',{name:'完成引用'}).click();
 await expect(page.locator('.composer-references')).toContainText(missing);
});
