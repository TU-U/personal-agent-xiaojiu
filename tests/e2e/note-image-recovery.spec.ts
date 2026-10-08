import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';

test('multiple images survive a partial upload failure and cut-paste preserves saved originals',async({page})=>{
 const bytes=await readFile('tests/fixtures/sample.png'),title='多图上传恢复';let uploads=0;
 await page.addInitScript(()=>Object.defineProperty(navigator,'clipboard',{value:{write:async()=>{throw Error('test unavailable');},read:async()=>{throw Error('test unavailable');}}}));
 await page.route('**/api/v1/notes/*/images',route=>++uploads===1?route.fulfill({status:503,json:{error:'第二张图片暂时上传失败'}}):route.continue());
 await page.goto('/');await page.getByRole('button',{name:'进入演示空间'}).click();await expect(page.locator('.app-shell')).toBeVisible();
 await page.locator('.capture-prompt').click();await page.getByLabel('记录标题').fill(title);await page.getByLabel('记录内容').fill('失败后保留这段说明。');
 await page.getByLabel('选择记录图片').setInputFiles([{name:'第一张.png',mimeType:'image/png',buffer:bytes},{name:'第二张.png',mimeType:'image/png',buffer:bytes}]);
 await page.getByRole('button',{name:'保存记录',exact:true}).click();
 await expect(page.getByRole('alert')).toContainText('第二张图片暂时上传失败');
 await expect(page.locator('.editor-image')).toHaveCount(2);await expect(page.getByLabel('记录内容')).toHaveValue('失败后保留这段说明。');
 await page.getByRole('button',{name:'保存记录',exact:true}).click();await expect(page.locator('.attachment img')).toHaveCount(2);
 await page.getByRole('button',{name:'编辑',exact:true}).click();
 await page.getByRole('button',{name:'剪切图片：第一张.png',exact:true}).click();await expect(page.locator('.editor-image')).toHaveCount(1);
 await page.getByRole('button',{name:'粘贴图片',exact:true}).click();await expect(page.locator('.editor-image')).toHaveCount(2);
 await page.getByRole('button',{name:'保存记录',exact:true}).click();await expect(page.locator('.attachment img')).toHaveCount(2);
 await page.getByLabel('关闭窗口').click();await page.reload();await page.getByLabel('搜索记录').fill(title);
 await page.locator('.note-card').filter({hasText:title}).locator('.note-card-body').click();await expect(page.locator('.attachment img')).toHaveCount(2);
 const data=await(await page.request.get('/api/v1/bootstrap')).json(),notes=data.notes.filter((note:{title:string})=>note.title===title);
 expect(notes).toHaveLength(1);expect(notes[0].attachments).toHaveLength(2);expect(notes[0].content).toBe('失败后保留这段说明。');
 for(const attachment of notes[0].attachments){const response=await page.request.get(`/api/v1/notes/${notes[0].id}/file/${attachment.id}`);expect(response.ok()).toBe(true);expect(await response.body()).toEqual(bytes);}
 expect(uploads).toBe(3);
});
