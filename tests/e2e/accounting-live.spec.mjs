import {test,expect} from '@playwright/test';
import JSZip from 'jszip';
import {writeFileSync} from 'node:fs';
test('two workbook sheets receive real classification but wait for human confirmation',async({page})=>{
 test.skip(process.env.SHIGUANG_E2E_ACCOUNTING_LIVE!=='1','Real classification requires explicit opt-in');test.setTimeout(90000);
 const zip=new JSZip(),headers=['交易时间','交易类型','交易对方','商品','收/支','金额(元)','支付方式','当前状态','交易单号','商户单号','备注'];
 zip.file('xl/workbook.xml','<workbook xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="餐费表" sheetId="1" r:id="rId1"/><sheet name="工资表" sheetId="2" r:id="rId2"/></sheets></workbook>');
 zip.file('xl/_rels/workbook.xml.rels','<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Target="worksheets/sheet2.xml"/></Relationships>');
 const rows=[['2026-10-08 12:00:00','消费','示例食堂','午餐餐费','支出','35.50','零钱','支付成功','synthetic-lunch','merchant-lunch','食堂午餐'],['2026-10-08 13:00:00','工资','示例公司','月工资','收入','5000','银行卡','已存入零钱','synthetic-salary','merchant-salary','公司工资']];
 for(let i=0;i<2;i++)zip.file('xl/worksheets/sheet'+(i+1)+'.xml','<worksheet><sheetData>'+[headers,rows[i]].map((row,r)=>'<row r="'+(r+1)+'">'+row.map((v,c)=>'<c r="'+String.fromCharCode(65+c)+(r+1)+'" t="inlineStr"><is><t>'+v+'</t></is></c>').join('')+'</row>').join('')+'</sheetData></worksheet>');
 const bytes=await zip.generateAsync({type:'nodebuffer'});
 await page.goto('/#accounting');await page.getByRole('button',{name:'进入演示空间'}).click();await expect(page.locator('.app-shell')).toBeVisible();await page.getByRole('button',{name:'导入账单 / 截图',exact:true}).click();
 const modal=page.getByRole('dialog',{name:'账单导入与核对'});await modal.locator('input[type=file]').setInputFiles({name:'synthetic-two-sheets.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:bytes});
 const items=modal.locator('.account-import-rows article');await expect(items).toHaveCount(2);const lunch=items.filter({hasText:'餐费表 · 第 2 行'}),salary=items.filter({hasText:'工资表 · 第 2 行'});await expect(lunch).toBeVisible();await expect(salary).toBeVisible();
 const originalUrl=await modal.getByRole('link',{name:'下载原账单'}).getAttribute('href');expect(await(await page.request.get(originalUrl)).body()).toEqual(bytes);
 const classified=page.waitForResponse(r=>r.url().endsWith('/classify')&&r.request().method()==='POST');await modal.getByRole('button',{name:'AI 建议本页分类',exact:true}).click();const response=await classified;expect(response.ok()).toBe(true);const result=await response.json();expect(result.status).toBe('ready');expect(result.suggestions).toHaveLength(2);
 await expect(lunch).toContainText('AI 建议：美食');await expect(salary).toContainText('AI 建议：工资');
 for(const row of [lunch,salary])await expect(row.getByLabel('本行决定')).toHaveValue('pending');
 const transactions=async()=>(await(await page.request.get('/api/v1/transactions')).json()).transactions;expect(await transactions()).toHaveLength(0);
 for(const row of [lunch,salary]){await row.getByRole('button',{name:'应用此分类',exact:true}).click();const warning=row.getByRole('checkbox',{name:'我已核对本行提示及原件'});if(await warning.count())await warning.check();}
 expect(await transactions()).toHaveLength(0);await modal.getByRole('button',{name:'核对本次决定（2 行）',exact:true}).click();await expect(modal.getByRole('heading',{name:'最后核对'})).toBeVisible();expect(await transactions()).toHaveLength(0);
 await modal.getByRole('button',{name:'确认保存本次决定',exact:true}).click();await expect(items.getByText(/已入账/)).toHaveCount(2);const saved=await transactions();expect(saved).toHaveLength(2);expect(new Set(saved.map(t=>t.importRowId)).size).toBe(2);expect(saved.find(t=>t.type==='expense').category).toBe('美食');expect(saved.find(t=>t.type==='income').category).toBe('工资');
 await modal.getByRole('button',{name:'关闭窗口'}).click();await page.getByRole('combobox',{name:'日期范围',exact:true}).selectOption('all');await expect(page.locator('.accounting-filter-stats')).toContainText('¥4,964.50');
 writeFileSync('/tmp/shiguang-accounting-classification-live.json',JSON.stringify({at:new Date().toISOString(),classification:result,transactions:saved,originalBytes:bytes.length,limitations:'Synthetic two-sheet workbook; real saved text model; approvals simulated through the browser. Not an OCR or real export variant test.'},null,2));
});
