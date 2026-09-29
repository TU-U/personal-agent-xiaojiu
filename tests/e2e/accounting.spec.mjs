import {test,expect} from '@playwright/test';
import JSZip from 'jszip';

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
 await page.getByRole('button',{name:'保存账单'}).click();
 const entry=page.getByRole('row').filter({hasText:note});await expect(entry).toBeVisible();await expect(page.locator('.accounting-filter-stats')).toContainText('¥35.50');
 await entry.getByRole('button',{name:/编辑账单/}).click();await page.locator('.accounting-amount-field input').fill('40');await page.getByRole('button',{name:'保存账单'}).click();
 await expect(entry).toContainText('¥40.00');
 await page.getByRole('combobox',{name:'收支类型'}).selectOption('income');await expect(page.getByText('0 笔账单')).toBeVisible();await page.getByRole('combobox',{name:'收支类型'}).selectOption('all');
 page.on('dialog',dialog=>dialog.accept());await entry.getByRole('button',{name:/删除账单/}).click();await expect(page.getByRole('row').filter({hasText:note})).toHaveCount(0);
});

test('WeChat Excel import presents AI categories for review before writing records',async({page})=>{
 await page.goto('/#accounting');await page.getByRole('button',{name:'进入演示空间'}).click();
 await page.locator('input[type=file][accept*=".xlsx"]').setInputFiles({name:'test-statement.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:await statementFile()});
 await expect(page.getByRole('heading',{name:'核对并导入微信账单'})).toBeVisible();
 await expect(page.getByText('2 笔可导入')).toBeVisible();
 await page.getByRole('button',{name:/确认导入 2 笔/}).click();
 await expect(page.getByRole('row').filter({hasText:'午餐'})).toBeVisible();await expect(page.getByRole('row').filter({hasText:'薪资'})).toBeVisible();
 if(test.info().project.name==='android'){
  await expect(page.locator('.mobile-month-chart .accounting-bar-month')).toHaveCount(6);
  await expect(page.locator('.mobile-month-chart')).toBeVisible();await expect(page.locator('.desktop-month-chart')).toBeHidden();
 }else{
  await expect(page.locator('.desktop-month-chart .accounting-bar-month')).toHaveCount(12);
  await expect(page.locator('.desktop-month-chart .accounting-bar-month').nth(2)).toHaveAttribute('aria-label',/收入 ¥5,000\.00，支出 ¥35\.50/);
  await page.getByRole('button',{name:'向右查看月份'}).click();await expect.poll(()=>page.locator('.desktop-month-chart .accounting-bars-viewport').evaluate(element=>element.scrollLeft)).toBeGreaterThan(0);
 }
});
