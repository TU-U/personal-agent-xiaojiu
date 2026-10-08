import {test,expect} from '@playwright/test';
test('business feedback ignores initial history and repeated polls, and an old timeout cannot erase a newer mood',async({page})=>{
 await page.clock.install();
 const completed={id:'completed-old',kind:'completed',at:'2026-10-01T12:00:00Z',taskId:'task',runId:'old',message:'旧完成记录'};
 let feedback=[completed],version=1;const writes:string[]=[];
 await page.route('**/api/v1/pet/reminders',route=>route.fulfill({json:{snapshot:String(version),cursor:version,total:1,items:[{id:'pending',sourceKind:'todo',sourceId:'todo',title:'仍待处理的事项',message:'这件事还等你处理哦。',count:1,actionTarget:{page:'library',id:'todo'}}],feedback}}));
 await page.goto('/');await page.getByRole('button',{name:'进入演示空间'}).click();await expect(page.locator('.app-shell')).toBeVisible();await expect(page.getByLabel('1 项待处理提示')).toBeVisible();
 page.on('request',request=>{if(request.method()!=='GET'&&request.url().includes('/api/v1/'))writes.push(request.url());});
 const pet=page.getByRole('button',{name:/小九现在/});await expect(pet).toHaveAttribute('aria-label',/很安心/);
 const refresh=async()=>{version++;await page.evaluate(()=>window.dispatchEvent(new Event('business-changed')));};
 feedback=[{...completed,id:'completed-new',runId:'new',message:'刚刚确认完成啦 ✨'},completed];await refresh();await expect(pet).toHaveAttribute('aria-label',/开心地贴贴/);await expect(page.locator('.pet-buddy-speech')).toContainText('刚刚确认完成啦');
 await page.clock.fastForward(6000);
 feedback=[{...completed,id:'concern-new',kind:'concern',message:'三天的证据已提交，等你核对哦。'},...feedback];await refresh();await expect(pet).toHaveAttribute('aria-label',/认真想想/);
 await page.clock.fastForward(1500);await expect(pet).toHaveAttribute('aria-label',/认真想想/);await expect(page.locator('.pet-buddy-speech')).toContainText('等你核对');
 await page.clock.fastForward(6000);await expect(pet).toHaveAttribute('aria-label',/很安心/);await expect(page.locator('.pet-buddy-speech')).toHaveCount(0);await expect(page.getByLabel('1 项待处理提示')).toBeVisible();
 await refresh();await expect(page.getByLabel('1 项待处理提示')).toBeVisible();await expect(pet).toHaveAttribute('aria-label',/很安心/);
 await page.reload();await expect(page.getByLabel('1 项待处理提示')).toBeVisible();await expect(pet).toHaveAttribute('aria-label',/很安心/);expect(writes).toEqual([]);
});
