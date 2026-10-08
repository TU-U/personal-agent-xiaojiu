import {test,expect} from '@playwright/test';
test('project groups keep stable membership, isolate failures, and open original notes',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'进入演示空间'}).click();await expect(page.locator('.app-shell')).toBeVisible();
 const project=await (await page.request.post('/api/v1/projects',{data:{name:'统一项目验收'}})).json();
 const category=await (await page.request.post('/api/v1/categories',{data:{name:'统一项目验收分类',projectId:project.id}})).json();
 const note=await (await page.request.post('/api/v1/notes',{data:{title:'项目原始记录',content:'保留全文与独立聊天'}})).json();
 await page.request.post('/api/v1/notes/categories',{data:{opId:'project-browser-category',categoryId:category.id,notes:[{id:note.id,revision:note.revision}]}});
 const memoryResponse=await page.request.post('/api/v1/memories',{data:{content:'项目需要保留独立来源会话',scope:'周报',scopeKind:'project',scopeId:project.id}});expect(memoryResponse.ok()).toBe(true);
 const eventResponse=await page.request.post('/api/v1/events',{data:{title:'独立项目要事',summary:'自己的事件摘要',priority:'normal',tags:[],project:'',dueAt:''}});expect(eventResponse.ok()).toBe(true);
 let failFiles=true;await page.route('**/api/v1/projects/*/items?*',async route=>{const url=new URL(route.request().url());if(failFiles&&url.searchParams.get('kind')==='libraryFile')await route.fulfill({status:503,json:{error:'文件分组暂不可用'}});else await route.continue();});
 await page.getByRole('button',{name:'项目资料',exact:true}).click();const dialog=page.getByRole('dialog',{name:'项目资料'});await dialog.getByLabel('选择项目').selectOption(project.id);
 const notes=dialog.getByRole('region',{name:'项目记录'});await expect(notes).toContainText('项目原始记录');await expect(dialog.getByRole('region',{name:'项目文件'})).toContainText('文件分组暂不可用');
 const memories=dialog.getByRole('region',{name:'项目长期记忆'});await expect(memories).toContainText('项目需要保留独立来源会话');await expect(memories).toContainText('待确认');
 await memories.getByRole('button',{name:'项目需要保留独立来源会话'}).click();const memoryDialog=page.getByRole('dialog',{name:'项目记忆详情'});await expect(memoryDialog).toContainText('周报');await expect(memoryDialog).toContainText('项目汇集不会自动启用记忆');await memoryDialog.getByRole('button',{name:'关闭窗口',exact:true}).click();
 await dialog.getByText('关联已有资料',{exact:true}).click();await dialog.getByLabel('资料类型').selectOption('event');await dialog.getByLabel('按标题查找').fill('独立项目要事');await dialog.getByRole('button',{name:/独立项目要事 ·/}).click();
 await dialog.getByLabel('按标题查找').fill('不存在的关键词');await expect(dialog).toContainText('已选：独立项目要事');await dialog.getByRole('button',{name:'确认关联资料'}).click();await expect(dialog.getByRole('region',{name:'项目要事'})).toContainText('独立项目要事');
 failFiles=false;await dialog.getByRole('button',{name:'重试加载文件'}).click();await expect(dialog.getByRole('region',{name:'项目文件'})).toContainText('还没有关联的文件');
 await dialog.getByLabel('项目名称',{exact:true}).fill('重命名后的项目');await dialog.getByRole('button',{name:'保存项目名称'}).click();await expect(dialog.getByLabel('选择项目')).toHaveValue(project.id);await expect(notes).toContainText('项目原始记录');
 await notes.getByRole('button',{name:'项目原始记录',exact:true}).click();await expect(dialog).toHaveCount(0);await expect(page.getByRole('dialog')).toContainText('保留全文与独立聊天');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('project event images open with their existing independent discussion',async({page})=>{
 const {readFile}=await import('node:fs/promises');
 await page.goto('/');await page.getByRole('button',{name:'进入演示空间'}).click();await expect(page.locator('.app-shell')).toBeVisible();
 const bytes=await readFile('tests/fixtures/sample.png');
 const imported=await page.request.post('/api/v1/import',{multipart:{file:{name:'project-event.png',mimeType:'image/png',buffer:bytes}}});expect(imported.ok()).toBe(true);const note=await imported.json();
 const created=await page.request.post('/api/v1/events',{data:{title:'项目图片要事',sourceNoteId:note.id,summary:'图片原件需要保留',priority:'normal'}});expect(created.ok()).toBe(true);const event=await created.json();
 const project=await (await page.request.post('/api/v1/projects',{data:{name:'项目图片入口'}})).json();
 expect((await page.request.post('/api/v1/projects/'+project.id+'/links',{data:{id:event.id,kind:'event',revision:event.revision}})).ok()).toBe(true);
 const source=await (await page.request.post('/api/v1/source-threads',{data:{id:event.id,kind:'event'}})).json();
 const noteThread=await (await page.request.post('/api/v1/source-threads',{data:{id:note.id,kind:'note'}})).json();expect(noteThread.threadId).not.toBe(source.threadId);
 const previous=await page.request.post('/api/v1/ask',{data:{query:'保留项目要事自己的讨论',threadId:source.threadId,references:[source.reference],opId:crypto.randomUUID()}});expect(previous.ok()).toBe(true);
 for(let visit=0;visit<2;visit++){
  await page.getByRole('button',{name:'项目资料',exact:true}).click();const projects=page.getByRole('dialog',{name:'项目资料'});await projects.getByLabel('选择项目').selectOption(project.id);
  await projects.getByRole('region',{name:'项目要事'}).getByRole('button',{name:event.title,exact:true}).click();const detail=page.getByRole('dialog',{name:event.title,exact:true});
  const photo=detail.locator('.event-images img');await expect(photo).toHaveCount(1);await expect.poll(()=>photo.evaluate((img:HTMLImageElement)=>img.complete&&img.naturalWidth>0)).toBe(true);
  const downloaded=await page.request.get(await photo.getAttribute('src'));expect(await downloaded.body()).toEqual(bytes);
  const request=page.waitForResponse(r=>r.url().endsWith('/api/v1/source-threads')&&r.request().method()==='POST');await detail.getByRole('button',{name:'与搭子讨论',exact:true}).click();expect((await (await request).json()).threadId).toBe(source.threadId);
  await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.locator('.composer-references')).toContainText(event.title);await expect(page.locator('.answer-card')).toHaveCount(1);
 }
});
