import {test,expect} from '@playwright/test';
test('reopening a source with five other references requires a choice and keeps its thread',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'进入演示空间'}).click();await expect(page.locator('.app-shell')).toBeVisible();
 const refs=[];
 for(let i=0;i<5;i++){const response=await page.request.post('/api/v1/notes',{data:{title:'保留资料'+i,content:'讨论旅行时需要核对的资料'+i,tags:[]}});expect(response.ok()).toBe(true);const note=await response.json();refs.push({id:note.id,kind:'note',title:note.title,revision:note.revision});}
 const created=await page.request.post('/api/v1/events',{data:{title:'旅行要事固定讨论',summary:'计划一次旅行',priority:'normal'}});expect(created.ok()).toBe(true);const event=await created.json();
 const target=await (await page.request.post('/api/v1/source-threads',{data:{kind:'event',id:event.id}})).json();
 const previous=await page.request.post('/api/v1/ask',{data:{query:'先讨论旅行资料',threadId:target.threadId,references:refs,opId:crypto.randomUUID()}});expect(previous.ok()).toBe(true);
 await page.goto('/#events');await page.locator('#event-'+event.id).getByRole('button',{name:'与搭子讨论'}).click();
 const picker=page.getByRole('dialog',{name:'引用记录或要事'});await expect(picker).toContainText('本次需要引用：旅行要事固定讨论');
 await picker.getByRole('button',{name:'完成引用'}).click();
 await page.getByLabel('向助手提问').fill('继续这个旅行话题');await page.getByLabel('发送问题').click();
 await expect(picker).toBeVisible();
 expect((await (await page.request.get('/api/v1/threads/'+target.threadId+'/turns')).json()).items).toHaveLength(1);
 await picker.getByRole('button',{name:'移除：保留资料0',exact:true}).click();
 await expect(picker).not.toContainText('本次需要引用：');await expect(picker).toContainText('已选 5/5');
 await picker.getByRole('button',{name:'完成引用'}).click();
 const selected=page.locator('.composer-references');await expect(selected).toContainText(event.title);await expect(selected).not.toContainText('保留资料0');
 await page.getByLabel('发送问题').click();await expect(page.getByLabel('向助手提问')).toHaveValue('');
 const turns=(await (await page.request.get('/api/v1/threads/'+target.threadId+'/turns')).json()).items;expect(turns).toHaveLength(2);expect(turns[0].references).toHaveLength(5);expect(turns[0].references.map((r:any)=>r.id)).toEqual([...refs.slice(1).map(r=>r.id),event.id]);
 await page.goto('/#events');await page.locator('#event-'+event.id).getByRole('button',{name:'与搭子讨论'}).click();
 await expect(picker).toHaveCount(0);await expect(selected).toContainText(event.title);
 const reopened=await (await page.request.post('/api/v1/source-threads',{data:{kind:'event',id:event.id}})).json();expect(reopened.threadId).toBe(target.threadId);
 await expect(page.locator('.answer-card')).toHaveCount(2);
});
