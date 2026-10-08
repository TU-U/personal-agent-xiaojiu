import {test} from 'node:test';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import {accountingImportDate,parseAccountingWorkbook} from '../server/domain/accounting/accounting-import-parser.mjs';
const headers=['交易时间','交易类型','交易对方','商品','收/支','金额(元)','支付方式','当前状态','交易单号','备注'];
const escape=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
async function workbook(rows,{date1904=false,otherSheet=false,otherRows=null}={}){
 const zip=new JSZip();
 zip.file('xl/workbook.xml',`<workbook><workbookPr date1904="${date1904?1:0}"/><sheets><sheet name="账单" r:id="rId1"/>${otherSheet?'<sheet name="另表" r:id="rId2"/>':''}</sheets></workbook>`);
 zip.file('xl/_rels/workbook.xml.rels','<Relationships><Relationship Target="worksheets/sheet1.xml" Id="rId1"/><Relationship Target="worksheets/sheet2.xml" Id="rId2"/></Relationships>');
 zip.file('xl/worksheets/sheet1.xml','<worksheet><sheetData>'+rows.map((row,i)=>`<row r="${row.number||i+1}">${(row.cells||row).map((value,j)=>`<c r="${String.fromCharCode(65+j)}${row.number||i+1}" t="inlineStr">${row.formulaColumn===j?'<f>1+1</f>':''}<is><t>${escape(value)}</t></is></c>`).join('')}</row>`).join('')+'</sheetData></worksheet>');
 if(otherSheet)zip.file('xl/worksheets/sheet2.xml','<worksheet><sheetData>'+(otherRows||[['说明文字']]).map((row,i)=>`<row r="${i+1}">${row.map((value,j)=>`<c r="${String.fromCharCode(65+j)}${i+1}" t="inlineStr"><is><t>${escape(value)}</t></is></c>`).join('')}</row>`).join('')+'</sheetData></worksheet>');
 return zip.generateAsync({type:'nodebuffer'});
}
const expense=(patch={})=>{const values={date:'2026-10-08 12:30:00',kind:'商户消费',merchant:'食堂',goods:'午餐',direction:'支出',amount:'35.50',payment:'零钱',status:'支付成功',id:'order1',note:'',...patch};return Object.values(values);};
test('all nonempty rows survive with original numbers, invalid values, refunds and duplicates accounted for',async()=>{
 const file=await workbook([{number:2,cells:['微信支付账单']},{number:5,cells:headers},{number:8,cells:expense()},{number:9,cells:expense()},
  {number:10,cells:expense({id:'other-valid-id'})},{number:11,cells:expense({date:'2026-02-30',amount:'NaN',status:'未知状态',id:'bad'})},
  {number:12,cells:expense({kind:'退款',direction:'收入',status:'退款成功',id:'refund'})},{number:13,cells:expense({status:'已全额退款',id:'original-refunded'})},
  {number:14,cells:expense({kind:'转账',merchant:'我的账户',id:'transfer'})},{number:15,cells:[]}]);
 const result=await parseAccountingWorkbook(file);assert.equal(result.rows.length,7);assert.equal(result.summary.nonemptyRows,9);assert.equal(result.summary.metadataRows,1);
 assert.deepEqual(result.rows.map(r=>r.rowNumber),[8,9,10,11,12,13,14]);assert.equal(result.rows[0].draft.category,'');assert.equal(result.rows[0].decision,'pending');
 assert.ok(result.rows[0].duplicateCandidates.some(d=>d.basis==='same_channel_trade_id'));assert.ok(result.rows[2].duplicateCandidates.some(d=>d.basis==='same_day_amount_merchant'));
 assert.equal(result.rows[3].status,'needs_review');assert.equal(result.rows[3].values.amount,'NaN');assert.equal(result.rows[3].issues.length,3);
 assert.equal(result.rows[4].status,'excluded');assert.match(result.rows[4].reason,/不自动冲销/);
 assert.equal(result.rows[5].status,'needs_review');assert.match(result.rows[5].issues.join(' '),/原消费/);
 assert.equal(result.rows[6].status,'recognized');assert.equal(result.rows[6].draft.type,'expense');
 assert.equal(result.summary.recognized+result.summary.excluded+result.summary.needsReview,result.summary.dataRows);
});
test('Alipay headers, Huabei repayment policy, raw long notes and formula warnings are retained',async()=>{
 const ali=['交易创建时间','交易分类','交易对方','商品名称','收/支','金额（元）','收/付款方式','交易状态','交易号','备注'];
 const rows=[ali,expense({date:'46106.5',kind:'消费',payment:'花呗',status:'交易成功',id:'spend'}),expense({kind:'花呗还款',payment:'余额',status:'交易成功',id:'repay'}),{cells:expense({note:'备注'.repeat(600),goods:'literal &lt;tag&gt;',id:'formula'}),formulaColumn:5}];
 const result=await parseAccountingWorkbook(await workbook(rows,{otherSheet:true}));assert.equal(result.channel,'alipay');assert.equal(result.rows[0].draft.date,'2026-03-25');assert.equal(result.rows[0].status,'excluded');assert.match(result.rows[0].reason,/消费阶段/);
 assert.equal(result.rows[1].draft.category,'花呗');assert.equal(result.rows[1].status,'recognized');assert.equal(result.rows[1].decision,'pending');
 const last=result.rows[2];assert.ok(last.draft.note.length>1000);assert.equal(last.values.goods,'literal &lt;tag&gt;');assert.equal(last.formulas.length,1);assert.match(last.issues.join(' '),/含公式/);assert.match(last.issues.join(' '),/超过1000/);assert.match(result.notices[0],/没有识别到账单表头/);
});
test('dates distinguish real days, times and Excel date systems without automatic rollover',()=>{
 for(const value of ['2026-02-30','2026/13/01','2026-01-01 24:00:00','2026-01-01 12:60:00','60','-1','garbage'])assert.equal(accountingImportDate(value),'',value);
 assert.equal(accountingImportDate('2024/2/29 23:59:59'),'2024-02-29');assert.equal(accountingImportDate('0',{date1904:true}),'1904-01-01');assert.equal(accountingImportDate('1'),'1900-01-01');assert.equal(accountingImportDate('61'),'1900-03-01');
});
test('large duplicate groups stay explicit without quadratic copies, and conflicting amount columns fail visibly',async()=>{
 const result=await parseAccountingWorkbook(await workbook([headers,...Array.from({length:500},()=>expense())]));assert.equal(result.rows.length,500);assert.equal(result.summary.duplicateRows,500);assert.equal(result.duplicateGroups.length,2);assert.equal(result.duplicateGroups[0].rowIds.length,500);assert.equal(result.rows[0].duplicateCandidates[0].count,499);
 await assert.rejects(parseAccountingWorkbook(await workbook([[...headers,'金额（元）'],[...expense(),'40']])),/多个金额/);
});

test('all recognizable sheets retain distinct row identities and cross-sheet duplicate evidence',async()=>{
 const result=await parseAccountingWorkbook(await workbook([headers,expense()],{otherSheet:true,otherRows:[headers,expense(),expense({id:'second',merchant:'书店'})]}));
 assert.equal(result.rows.length,3);assert.deepEqual(result.rows.map(r=>r.rowId),['sheet-1-row-2','sheet-2-row-2','sheet-2-row-3']);
 assert.deepEqual(result.rows.map(r=>r.sheetName),['账单','另表','另表']);assert.equal(result.summary.headerRows,2);
 assert.ok(result.duplicateGroups.some(g=>g.basis==='same_channel_trade_id'&&g.rowIds.length===2));
 assert.ok(result.rows.every(r=>r.decision==='pending'));assert.equal(result.notices.length,0);
});
