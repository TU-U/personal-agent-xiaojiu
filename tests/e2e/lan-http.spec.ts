import {test,expect} from '@playwright/test';
import {networkInterfaces} from 'node:os';
test('LAN HTTP explains microphone limits while audio import and note editing still work',async({page,baseURL})=>{
 const address=Object.values(networkInterfaces()).flat().find(n=>n&&!n.internal&&n.family==='IPv4'&&(/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/).test(n.address))?.address;
 test.skip(!address,'Needs an actual private network interface');
 const origin=new URL(baseURL!);origin.hostname=address!;const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin.href);expect(await page.evaluate(()=>window.isSecureContext)).toBe(false);expect(await page.evaluate(()=>typeof crypto.randomUUID)).toBe('undefined');
 await page.getByRole('button',{name:'进入演示空间'}).click();await expect(page.locator('.app-shell')).toBeVisible();
 await page.getByRole('button',{name:'语音记录',exact:true}).click();let dialog=page.getByRole('dialog');await dialog.getByRole('button',{name:'开始录音',exact:true}).click();await expect(dialog).toContainText('请用 HTTPS 或本机 localhost 打开');await expect(dialog).toContainText('局域网 HTTP 可直接导入已有音频');await dialog.getByRole('button',{name:'关闭窗口'}).click();
 await page.getByLabel('选择导入文件').setInputFiles('.local-runtime/asr-models/1-two-speakers-en.wav');await page.getByRole('button',{name:'保存并导入',exact:true}).click();dialog=page.getByRole('dialog',{name:'记录详情'});await expect(dialog.locator('audio')).toBeVisible();await expect(dialog.getByLabel('录音转写')).toBeVisible();
 await dialog.getByRole('button',{name:'编辑',exact:true}).click();await page.getByLabel('记录内容').fill('局域网 HTTP 下补充录音说明');await page.getByRole('button',{name:'保存记录',exact:true}).click();await page.getByRole('button',{name:'原文排版',exact:true}).click();await expect(page.locator('.note-original')).toContainText('局域网 HTTP 下补充录音说明');
 expect(errors).toEqual([]);
});
