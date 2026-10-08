import {test,expect} from '@playwright/test';
import JSZip from 'jszip';

test('living budget excludes other categories and all monthly rankings remain accessible',async({page})=>{
 await page.goto('/#accounting');await page.getByRole('button',{name:'进入演示空间'}).click();await expect(page.locator('.app-shell')).toBeVisible();
 const day=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const rows=[...Array.from({length:8},(_,i)=>[String(i+1),'美食',day,'餐费'+(i+1)]),['20','日用',day,'日用品'],['30','花呗',day,'花呗还款'],['100','交通',day,'交通费'],['5000','美食','2020-01-01','历史消费']];
 for(const [amount,category,date,note] of rows)expect((await page.request.post('/api/v1/transactions',{data:{type:'expense',amount,category,date,note}})).ok()).toBe(true);
 await page.reload();const budget=page.locator('.accounting-budget-card');await expect(budget).toContainText('¥1,914.00');await expect(budget).toContainText('预算 ¥2,000.00');
 const ranking=page.locator('.accounting-ranking-card').filter({has:page.getByRole('heading',{name:'单笔消费排名',exact:true})});
 await expect(ranking.locator('li')).toHaveCount(10);await expect(ranking).toContainText('已显示 10 / 11 笔');await expect(ranking.locator('li').first()).toContainText('交通费');
 await ranking.getByRole('button',{name:'继续查看消费排名',exact:true}).click();await expect(ranking.locator('li')).toHaveCount(11);await expect(ranking.locator('li').last()).toContainText('餐费1');await expect(ranking).toContainText('已显示 11 / 11 笔');
 await page.getByLabel('统计图表月份',{exact:true}).selectOption('2020-01');await expect(ranking.locator('li')).toHaveCount(1);await expect(ranking).toContainText('历史消费');await expect(budget).toContainText('¥1,914.00');
 await page.getByLabel('统计图表月份',{exact:true}).selectOption(day.slice(0,7));await expect(ranking.locator('li')).toHaveCount(10);
 const categories=page.locator('.accounting-ranking-card').filter({has:page.getByRole('heading',{name:'消费类型排名',exact:true})});await expect(categories.locator('li')).toHaveCount(4);await expect(categories.locator('li').first()).toContainText('交通');await expect(categories.locator('li').filter({hasText:'美食'})).toContainText('¥36.00');
 await budget.getByRole('button',{name:'调整预算',exact:true}).click();const input=budget.getByRole('textbox',{name:'每月生活费预算',exact:true});await input.fill('3000');await budget.getByRole('button',{name:'保存',exact:true}).click();await expect(budget).toContainText('¥2,914.00');
 await page.reload();await expect(budget).toContainText('预算 ¥3,000.00');await expect(budget).toContainText('¥2,914.00');
 await budget.getByRole('button',{name:'调整预算',exact:true}).click();await input.fill('-1');await budget.getByRole('button',{name:'保存',exact:true}).click();await expect(page.getByRole('alert')).toBeVisible();await expect(input).toHaveValue('-1');await expect(budget).toContainText('预算 ¥3,000.00');
 await input.fill('50');await budget.getByRole('button',{name:'保存',exact:true}).click();await expect(budget.locator('strong.over-budget')).toHaveText('-¥36.00');
});

test('income validation, reload and combined filters keep ledger totals consistent',async({page})=>{
 await page.goto('/#accounting');await page.getByRole('button',{name:'进入演示空间'}).click();await expect(page.locator('.app-shell')).toBeVisible();
 const day=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 for(const [amount,category,date,note] of [['35.5','美食',day,'本月餐费'],['10','日用',day,'不属于美食的支出'],['20','美食','2020-01-01','历史餐费']])expect((await page.request.post('/api/v1/transactions',{data:{type:'expense',amount,category,date,note}})).ok()).toBe(true);
 await page.reload();await page.getByRole('button',{name:'新增账单',exact:true}).click();
 const dialog=page.getByRole('dialog',{name:'新增账单'});await dialog.getByRole('button',{name:'收入',exact:true}).click();
 await dialog.locator('.accounting-amount-field input').fill('-100');await dialog.getByRole('textbox',{name:'备注',exact:true}).fill('本月工资');
 await dialog.getByRole('combobox',{name:'分类',exact:true}).selectOption('工资');await dialog.getByRole('button',{name:'保存账单',exact:true}).click();
 await expect(dialog).toContainText('金额必须大于 0');await expect(dialog.locator('.accounting-amount-field input')).toHaveValue('-100');await expect(dialog.getByRole('textbox',{name:'备注',exact:true})).toHaveValue('本月工资');
 expect((await(await page.request.get('/api/v1/transactions')).json()).transactions).toHaveLength(3);
 await dialog.locator('.accounting-amount-field input').fill('5000');await dialog.getByRole('button',{name:'保存账单',exact:true}).click();await expect(dialog).toHaveCount(0);
 await page.getByRole('combobox',{name:'日期范围',exact:true}).selectOption('all');
 const stats=page.locator('.accounting-filter-stats');await expect(stats).toContainText('¥5,000.00');await expect(stats).toContainText('¥65.50');await expect(stats).toContainText('¥4,934.50');
 await page.reload();await page.getByRole('combobox',{name:'日期范围',exact:true}).selectOption('all');await expect(page.getByRole('row').filter({hasText:'本月工资'})).toBeVisible();await expect(stats).toContainText('¥4,934.50');
 await page.getByRole('combobox',{name:'日期范围',exact:true}).selectOption('month');await page.getByRole('combobox',{name:'收支类型',exact:true}).selectOption('expense');await page.getByRole('combobox',{name:'分类',exact:true}).selectOption('美食');
 await expect(stats).toContainText('1 笔账单');await expect(stats).toContainText('¥35.50');await expect(stats).toContainText('-¥35.50');
 const row=page.getByRole('row').filter({hasText:'本月餐费'});await expect(row).toBeVisible();await expect(page.getByRole('row').filter({hasText:'本月工资'})).toHaveCount(0);await expect(page.getByRole('row').filter({hasText:'历史餐费'})).toHaveCount(0);await expect(page.getByRole('row').filter({hasText:'不属于美食'})).toHaveCount(0);
 const allBefore=(await(await page.request.get('/api/v1/transactions')).json()).transactions;const original=allBefore.find(t=>t.note==='本月餐费');
 await row.getByRole('button',{name:/编辑账单/}).click();await page.locator('.accounting-amount-field input').fill('40');await page.getByRole('button',{name:'保存账单',exact:true}).click();await expect(stats).toContainText('-¥40.00');
 const allAfter=(await(await page.request.get('/api/v1/transactions')).json()).transactions;expect(allAfter).toHaveLength(4);expect(allAfter.find(t=>t.note==='本月餐费').id).toBe(original.id);
 page.once('dialog',d=>d.accept());await row.getByRole('button',{name:/删除账单/}).click();await expect(stats).toContainText('0 笔账单');await expect(stats.locator('strong')).toHaveText(['¥0.00','¥0.00','¥0.00']);
});

async function statementFile(){
 const zip=new JSZip();
 zip.file('xl/workbook.xml','<workbook xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="账单" sheetId="1" r:id="rId1"/></sheets></workbook>');
 zip.file('xl/_rels/workbook.xml.rels','<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>');
 const rows=[['交易时间','交易类型','交易对方','商品','收/支','金额(元)','支付方式','当前状态','交易单号','商户单号','备注'],['46106.5','消费','示例餐馆','午餐','支出','35.5','零钱','支付成功','e2e-expense','merchant-1','/'],['46106.6','工资','公司','薪资','收入','5000','银行卡','已存入零钱','e2e-income','merchant-2','/']];
 const col=index=>{let s='';for(index++;index;index=Math.floor((index-1)/26))s=String.fromCharCode((index-1)%26+65)+s;return s;};
 const body=rows.map((row,r)=>`<row r="${r+1}">${row.map((value,c)=>`<c r="${col(c)}${r+1}" t="inlineStr"><is><t>${value}</t></is></c>`).join('')}</row>`).join('');
 zip.file('xl/worksheets/sheet1.xml',`<worksheet><sheetData>${body}</sheetData></worksheet>`);return zip.generateAsync({type:'nodebuffer'});
}

test('ledger page saves, edits, filters and deletes an entry with live statistics',async({page})=>{
 const note=`晚饭-${Date.now()}`;
 await page.goto('/#accounting');await page.getByRole('button',{name:'进入演示空间'}).click();
 await expect(page.getByRole('heading',{name:/记账，慢慢看清生活的流向/})).toBeVisible();
 await page.getByRole('button',{name:'新增账单'}).click();
 await page.locator('.accounting-amount-field input').fill('35.5');await page.getByLabel('备注').fill(note);
 // The server commits successfully but the browser loses the response.
 await page.route('**/api/v1/transactions',async route=>{if(route.request().method()!=='POST')return route.continue();await route.fetch();await route.abort('failed');},{times:1});
 await page.getByRole('button',{name:'保存账单'}).click();
 await page.getByRole('dialog',{name:'新增账单'}).getByRole('button',{name:'重试确认上次保存'}).click();
 const saved=await (await page.request.get('/api/v1/transactions')).json();expect(saved.transactions.filter(tx=>tx.note===note)).toHaveLength(1);
 const entry=page.getByRole('row').filter({hasText:note});await expect(entry).toBeVisible();await expect(page.locator('.accounting-filter-stats')).toContainText('¥35.50');
 await entry.getByRole('button',{name:/编辑账单/}).click();await page.locator('.accounting-amount-field input').fill('40');await page.getByRole('button',{name:'保存账单'}).click();
 await expect(entry).toContainText('¥40.00');
 await page.getByRole('combobox',{name:'收支类型'}).selectOption('income');await expect(page.getByText('0 笔账单')).toBeVisible();await page.getByRole('combobox',{name:'收支类型'}).selectOption('all');
 page.on('dialog',dialog=>dialog.accept());await entry.getByRole('button',{name:/删除账单/}).click();await expect(page.getByRole('row').filter({hasText:note})).toHaveCount(0);
});

test('Excel original and reviewed rows persist before explicit final confirmation',async({page})=>{
 await page.goto('/#accounting');await page.getByRole('button',{name:'进入演示空间'}).click();
 await page.getByRole('button',{name:'导入账单 / 截图',exact:true}).click();
 let modal=page.getByRole('dialog',{name:'账单导入与核对'});
 const original=await statementFile();
 await modal.locator('input[type=file]').setInputFiles({name:'test-statement.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:original});
 await expect(modal.locator('.account-import-rows article')).toHaveCount(2);
 const download=await page.request.get(await modal.getByRole('link',{name:'下载原账单'}).getAttribute('href'));
 expect(download.ok()).toBe(true);expect(await download.body()).toEqual(original);
 const expense=modal.locator('.account-import-rows article').filter({hasText:'午餐'});
 const income=modal.locator('.account-import-rows article').filter({hasText:'薪资'});
 await expense.getByLabel('本行决定').selectOption('include');await expense.getByRole('combobox',{name:'分类',exact:true}).selectOption('美食');
 await income.getByLabel('本行决定').selectOption('include');await income.getByRole('combobox',{name:'分类',exact:true}).selectOption('工资');
 for(const row of [expense,income]){const warning=row.getByRole('checkbox',{name:'我已核对本行提示及原件'});if(await warning.count())await warning.check();}
 // Closing/reloading keeps edits and the uploaded original; it must not book them.
 await modal.getByRole('button',{name:'关闭窗口'}).click();await page.reload();
 expect((await (await page.request.get('/api/v1/transactions')).json()).transactions).toHaveLength(0);
 await page.getByRole('button',{name:'导入账单 / 截图',exact:true}).click();
 await expect(expense.getByRole('combobox',{name:'分类',exact:true})).toHaveValue('美食');
 await modal.getByRole('button',{name:'核对本次决定（2 行）',exact:true}).click();
 await expect(modal.getByRole('heading',{name:'最后核对'})).toBeVisible();
 expect((await (await page.request.get('/api/v1/transactions')).json()).transactions).toHaveLength(0);
 await modal.getByRole('button',{name:'确认保存本次决定',exact:true}).click();
 await expect(modal.locator('.account-import-rows')).toContainText('已入账');
 await modal.getByRole('button',{name:'关闭窗口'}).click();
 await expect(page.getByRole('row').filter({hasText:'午餐'})).toBeVisible();await expect(page.getByRole('row').filter({hasText:'薪资'})).toBeVisible();
 await expect(page.locator('.accounting-filter-stats')).toContainText('¥5,000.00');await expect(page.locator('.accounting-filter-stats')).toContainText('¥35.50');
 await page.getByLabel('收支统计年份',{exact:true}).selectOption('2026');
 await expect(page.locator('.desktop-month-chart .accounting-bar-month')).toHaveCount(12);
 await expect(page.locator('.desktop-month-chart .accounting-bar-month').nth(2)).toHaveAttribute('aria-label',/收入 ¥5,000\.00，支出 ¥35\.50/);
});
