import {test,expect} from '@playwright/test';
import JSZip from 'jszip';
import {readFile} from 'node:fs/promises';

test('settings creates a downloadable full backup and verifies isolated restore',async({page})=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/');await page.getByRole('button',{name:'进入演示空间'}).click();await expect(page.locator('.app-shell')).toBeVisible();
 const before=await (await page.request.get('/api/bootstrap')).json();
 await page.goto('/#settings');await page.getByRole('button',{name:'创建完整备份',exact:true}).click();
 await expect(page.getByText(/备份已创建：/)).toBeVisible();
 const download=page.waitForEvent('download');await page.getByRole('link',{name:'下载完整备份'}).click();
 const file=await download;const zip=await JSZip.loadAsync(await readFile((await file.path())!));
 expect(zip.file('manifest.json')).not.toBeNull();expect(zip.file('shiguang.sqlite')).not.toBeNull();
 const manifest=JSON.parse(await zip.file('manifest.json')!.async('string'));expect(manifest.includeSecrets).toBe(false);
 await page.getByRole('button',{name:'验证能否恢复'}).click();await expect(page.getByText('已在隔离目录恢复并核验数据库、附件与哈希，当前数据未被替换。')).toBeVisible();
 const after=await (await page.request.get('/api/bootstrap')).json();expect(after.notes).toEqual(before.notes);expect(after.events).toEqual(before.events);
 expect(errors).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
