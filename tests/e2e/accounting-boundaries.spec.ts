import {test,expect} from '@playwright/test';
test('empty ledger, second page, failed deletion and failed read preserve authoritative bills',async({page})=>{
 await page.goto('/#accounting');await page.getByRole('button',{name:'进入演示空间'}).click();
 await expect(page.locator('.app-shell')).toBeVisible();
 await expect(page.getByText('还没有账单记录',{exact:true})).toBeVisible();
 const day=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 for(let i=0;i<51;i++)expect((await page.request.post('/api/v1/transactions',{data:{type:'expense',amount:'1',category:'美食',date:day,note:'边界账单'+i}})).ok()).toBe(true);
 await page.reload();const ledger=page.locator('.accounting-ledger'),stats=page.locator('.accounting-filter-stats');
 await expect(ledger.locator('tbody tr')).toHaveCount(50);await expect(stats).toContainText('51 笔账单');
 await ledger.getByRole('button',{name:'继续加载账单',exact:true}).click();await expect(ledger.locator('tbody tr')).toHaveCount(51);
 const row=ledger.locator('tbody tr').last();const note=await row.locator('.ledger-note span').textContent();
 await page.route('**/api/v1/transactions/*',async route=>{
  if(route.request().method()==='DELETE')return route.fulfill({status:503,json:{error:'本次删除失败，请重试'}});
  return route.continue();
 },{times:1});
 page.once('dialog',d=>d.accept());await row.getByRole('button',{name:/删除账单/}).click();
 await expect(page.getByRole('alert')).toContainText('本次删除失败');await expect(row).toContainText(note!);
 expect((await(await page.request.get('/api/v1/transactions')).json()).transactions).toHaveLength(51);
 await expect(stats).toContainText('¥51.00');
 await page.route('**/api/v1/accounting/view?**',route=>route.fulfill({status:503,json:{error:'账单读取失败，请重试'}}),{times:1});
 await page.reload();await expect(page.getByRole('alert')).toContainText('账单读取失败');
 await expect(page.getByText('还没有账单记录',{exact:true})).toBeHidden();
 await page.getByRole('button',{name:/重试/}).click();await expect(stats).toContainText('51 笔账单');
 expect((await(await page.request.get('/api/v1/transactions')).json()).transactions.some((t:{note:string})=>t.note===note)).toBe(true);
});
