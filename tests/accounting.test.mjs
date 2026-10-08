import test from 'node:test';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import {amountToCents,accountingAmount,parseWechatWorkbook,suggestCategories,validateTransaction} from '../server/domain/accounting/accounting.mjs';

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


test('conflicting money representations and malformed explicit fields cannot silently fall back',()=>{
 const base={type:'expense',amount:'35.50',category:'美食',date:'2026-10-08',note:'晚饭'};
 assert.equal(validateTransaction({...base,amountCents:3550}).amountCents,3550);
 assert.throws(()=>validateTransaction({...base,amountCents:3551}),/不一致/);
 for(const amountCents of ['3550',null,NaN,1.2,-1,0,100000000001])assert.throws(()=>validateTransaction({...base,amountCents}),/金额/);
 for(const amount of [null,'',{},'1e3','35.501'])assert.throws(()=>validateTransaction({...base,amount,amountCents:3550}),/金额/);
 assert.throws(()=>accountingAmount({amount:'2000',amountCents:100}),/不一致/);
 const old={...validateTransaction(base),id:'keep-id',revision:4,createdAt:'old-time'};
 const edited=validateTransaction({note:'新备注',revision:4},old);assert.equal(edited.amountCents,3550);assert.equal(edited.id,'keep-id');assert.equal(edited.createdAt,'old-time');
 for(const extra of [{confirmed:true},{id:'replace-id'},{amountCents:null},{category:null}])assert.throws(()=>validateTransaction({...extra},old));
 for(const input of [null,[],42])assert.throws(()=>validateTransaction(input),/格式无效/);
});
test('decimal parsing never rounds unsafe values into an accepted integer',()=>{
 assert.equal(amountToCents('90071992547409.91'),Number.MAX_SAFE_INTEGER);
 assert.equal(amountToCents('90071992547409.90'),Number.MAX_SAFE_INTEGER-1);
 assert.equal(amountToCents('90071992547409.92'),null);
 assert.equal(amountToCents({toString:()=> '1.00'}),null);
 assert.equal(accountingAmount({amount:'1000000000.00'}),100000000000);
 assert.throws(()=>accountingAmount({amount:'1000000000.01'}),/10 亿元/);
});
test('invalid AI authority, duplicate indices and missing results remain pending with visible reasons',async()=>{
 const rows=[{type:'expense',amountCents:100,note:'晚饭',category:'其他支出',categorySource:'待确认'}];
 for(const raw of ['null','[{"index":0,"category":"美食","confirmed":true}]','[{"index":0,"category":"美食"},{"index":0,"category":"日用"}]','[{"index":9,"category":"美食"}]','[{"index":0,"category":"工资"}]','nonsense','[]']){
  const result=await suggestCategories(rows,async()=>raw,()=>true);
  assert.equal(result.rows[0].categorySource,'待确认',raw);assert.ok(result.notice.length>0,raw);assert.equal(result.rows[0].category,'其他支出');
 }
 const failed=await suggestCategories(rows,async()=>{throw new Error('provider down');},()=>true);assert.match(failed.notice,/调用未成功/);
 const partial=await suggestCategories([...rows,...rows],async()=> '[{"index":0,"category":"美食"}]',()=>true);assert.equal(partial.rows[0].categorySource,'AI');assert.equal(partial.rows[1].categorySource,'待确认');assert.match(partial.notice,/结果不完整/);
});
