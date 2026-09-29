import test from 'node:test';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import {amountToCents,parseWechatWorkbook,suggestCategories,validateTransaction} from '../server/accounting.mjs';

test('ledger amounts use exact integer cents and reject invalid precision',()=>{
 assert.equal(amountToCents('35.5'),3550);assert.equal(amountToCents('5000'),500000);assert.equal(amountToCents('0.01'),1);
 for(const value of ['', '0', '-2', '1.001', '1e3', 'abc'])assert.equal(amountToCents(value),null,value);
 assert.throws(()=>validateTransaction({type:'expense',amountCents:10,category:'工资',date:'2026-09-29'}),/分类/);
 assert.throws(()=>validateTransaction({type:'expense',amountCents:10,category:'美食',date:'2026-02-30'}),/日期/);
});

async function wechatFixture(){
 const zip=new JSZip();zip.file('xl/workbook.xml','<workbook xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="账单" sheetId="1" r:id="rId1"/></sheets></workbook>');
 zip.file('xl/_rels/workbook.xml.rels','<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>');
 const headers=['交易时间','交易类型','交易对方','商品','收/支','金额(元)','支付方式','当前状态','交易单号','商户单号','备注'];
 const rows=[headers,['46106.5','商户消费','某食堂','午餐','支出','35.5','零钱','支付成功','fixture-expense-1','m1','/'],['46106.6','转账','朋友','AA','收入','12','零钱','已存入零钱','fixture-income-1','m2','/'],['46106.7','充值','零钱','充值','中性交易','100','银行卡','支付成功','fixture-neutral','m3','/'],['46106.8','商户消费','商户','失败订单','支出','88','零钱','已全额退款','fixture-failed','m4','/'],['46106.5','商户消费','某食堂','午餐','支出','35.5','零钱','支付成功','fixture-expense-1','m1','/']];
 const column=n=>{let out='';for(n++;n;n=Math.floor((n-1)/26))out=String.fromCharCode((n-1)%26+65)+out;return out;};
 const xml=rows.map((row,r)=>`<row r="${r+1}">${row.map((value,c)=>`<c r="${column(c)}${r+1}" t="inlineStr"><is><t>${value}</t></is></c>`).join('')}</row>`).join('');
 zip.file('xl/worksheets/sheet1.xml',`<worksheet><sheetData>${xml}</sheetData></worksheet>`);return zip.generateAsync({type:'nodebuffer'});
}

test('微信 xlsx parser extracts posted income and expense rows and removes repeated transaction IDs',async()=>{
 const rows=await parseWechatWorkbook(await wechatFixture());assert.equal(rows.length,2);
 assert.deepEqual(rows.map(x=>[x.type,x.amountCents,x.date,x.sourceRef]),[['expense',3550,'2026-03-25','fixture-expense-1'],['income',1200,'2026-03-25','fixture-income-1']]);
 assert.equal(rows[0].note,'某食堂 · 午餐');
});

test('AI category suggestions are constrained to the supplied category lists and remain reviewable',async()=>{
 const rows=[{type:'expense',amountCents:100,date:'2026-03-25',note:'午餐',category:'其他支出'},{type:'income',amountCents:100,date:'2026-03-25',note:'薪资',category:'其他'}];
 const result=await suggestCategories(rows,async(_system,prompt)=>prompt.includes('美食')?'[{"index":0,"category":"美食"}]':'[{"index":0,"category":"工资"}]',()=>true);
 assert.deepEqual(result.rows.map(x=>[x.category,x.categorySource]),[['美食','AI'],['工资','AI']]);
 const fallback=await suggestCategories(rows,async()=>null,()=>false);assert.equal(fallback.rows.every(x=>x.categorySource==='待确认'),true);assert.ok(fallback.notice.includes('未连接'));
});
