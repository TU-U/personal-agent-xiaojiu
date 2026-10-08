import {test,expect} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
test('real weekly generation retrieves a valid memory and preserves its visible snapshot',async({page})=>{
 test.skip(process.env.SHIGUANG_E2E_ARTIFACT_LIVE!=='1','Explicit real-provider opt-in required');test.setTimeout(120000);
 const fixture=JSON.parse(await readFile('/tmp/shiguang-artifact-live-fixture.json','utf8'));
 try{
 await page.goto('/#artifacts');await page.getByRole('button',{name:'进入演示空间'}).click();await expect(page.locator('.app-shell')).toBeVisible();
 await page.getByRole('button',{name:'新建成果',exact:true}).click();await page.getByLabel('资料范围').selectOption('合成周报');
 const done=page.waitForResponse(r=>r.url().endsWith('/api/v1/tasks')&&r.request().method()==='POST',{timeout:90000});await page.getByRole('button',{name:'开始整理',exact:true}).click();const response=await done;expect(response.ok()).toBe(true);const artifact=await response.json();
 await writeFile('/tmp/shiguang-artifact-live-memory.json',JSON.stringify({fixture:{collection:fixture.collection},artifact},null,2));
 expect(artifact.mode).toBe('model');expect(artifact.memories.map((m:any)=>m.id)).toEqual([fixture.goodId]);expect(artifact.body).toContain('备份');expect(artifact.body).toContain('字段表');
 const modal=page.getByRole('dialog',{name:'成果工作台'});await modal.getByText('生成时采用的记忆（1 条）',{exact:true}).click();await expect(modal).toContainText(artifact.memories[0].content);
 const update=await page.request.patch('/api/v1/notes/'+fixture.sourceId,{data:{revision:fixture.sourceRevision,content:'更正：写作习惯需要重新核对。'}});expect(update.ok()).toBe(true);
 const boot=await (await page.request.get('/api/v1/bootstrap')).json();const memory=boot.memories.find((m:any)=>m.id===fixture.goodId);expect(memory.status).toBe('candidate');expect(memory.sourceIssue).toContain('来源已修改');
 await modal.getByRole('button',{name:'关闭窗口'}).click();await page.reload();await page.getByRole('button').filter({has:page.getByRole('heading',{name:artifact.title,exact:true})}).click();
 await modal.getByText('生成时采用的记忆（1 条）',{exact:true}).click();await expect(modal).toContainText(artifact.memories[0].content);await expect(modal).toContainText('之后修改记忆不会改写这份成果');
 }finally{const cleanup=await page.request.delete(fixture.qdrant+'/collections/'+fixture.collection);expect(cleanup.ok()).toBe(true);}
});
