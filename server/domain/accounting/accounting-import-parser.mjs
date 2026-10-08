import {readAccountingWorkbook,amountToCents,bad} from './accounting.mjs';

const text=value=>String(value??'').trim();
function realDay(y,m,d){const date=new Date(Date.UTC(y,m-1,d));return y>=1900&&y<=9999&&date.getUTCFullYear()===y&&date.getUTCMonth()===m-1&&date.getUTCDate()===d;}
export function accountingImportDate(value,{date1904=false}={}){
 const raw=text(value);
 if(/^\d+(?:\.\d+)?$/.test(raw)){
  const serial=Number(raw),days=Math.floor(serial);
  if(!Number.isFinite(serial)||serial>2958465||days<(date1904?0:1)||!date1904&&days===60)return '';
  const epoch=date1904?Date.UTC(1904,0,1):Date.UTC(1899,11,31),offset=date1904?days:days-(days>60?1:0);
  const date=new Date(epoch+offset*86400000);return date.getUTCFullYear()<=9999?date.toISOString().slice(0,10):'';
 }
 const match=raw.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/);
 if(!match)return '';
 const [,y,m,d,h='00',minute='00',second='00']=match;
 if(!realDay(+y,+m,+d)||+h>23||+minute>59||+second>59)return '';
 return `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
}
function money(value){
 let valueText=text(value).replace(/^[¥￥]\s*/,'');
 if(/^\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?$/.test(valueText))valueText=valueText.replaceAll(',','');
 const cents=amountToCents(valueText);return cents!==null&&cents<=100000000000?cents:null;
}
const aliases={date:['交易时间','交易创建时间','创建时间'],direction:['收/支','收支','收/付款'],amount:['金额(元)','金额（元）','金额'],status:['当前状态','交易状态'],merchant:['交易对方'],goods:['商品','商品名称','商品说明'],tradeType:['交易类型','交易分类'],payment:['支付方式','收/付款方式'],tradeId:['交易单号','交易号'],merchantId:['商户单号','商家订单号'],note:['备注']};
const success=new Set(['支付成功','交易成功','已存入零钱','已收钱','已转入零钱','已收款','还款成功']);
const failed=new Set(['支付失败','交易关闭','已关闭','已撤销']);
function parseSheet(book){
 const headerIndex=book.rows.findIndex(row=>{const cells=row.cells.map(text);return aliases.date.some(v=>cells.includes(v))&&aliases.direction.some(v=>cells.includes(v))&&aliases.amount.some(v=>cells.includes(v));});
 if(headerIndex<0)return {sheetName:book.sheetName,sheetIndex:book.sheetIndex,status:'unrecognized',rawRows:book.rows,rows:[]};
 const headers=book.rows[headerIndex].cells.map(text),channel=headers.includes('交易单号')?'wechat':headers.includes('交易号')?'alipay':'unknown';
 const columns=Object.fromEntries(Object.entries(aliases).map(([key,names])=>[key,headers.findIndex(h=>names.includes(h))]));
 for(const names of Object.values(aliases))if(headers.filter(h=>names.includes(h)).length>1)throw bad(`账单表头存在多个${names[0]}字段，请核对，未擅自选取一列。`);
 const rows=[];
 for(const original of book.rows.slice(headerIndex+1)){
  if(!original.cells.some(v=>text(v))&&!original.formulas.length)continue;
  const values=Object.fromEntries(Object.entries(columns).map(([key,column])=>[key,column<0?'':text(original.cells[column])]));
  const issues=[],type=values.direction==='收入'?'income':values.direction==='支出'?'expense':'',amountCents=money(values.amount),date=accountingImportDate(values.date,book);
  if(!type)issues.push('收支方向未知，请核对；不自动排除转账。');
  if(amountCents===null)issues.push('金额无效或超限，请核对原值。');
  if(!date)issues.push('日期无效或格式不支持，请核对原值。');
  if(!success.has(values.status))issues.push('交易状态未确认为成功，请核对。');
  if(channel==='unknown')issues.push('支付渠道未识别，请核对。');
  if(original.formulas.length)issues.push('含公式，未执行；缓存值需要人工核对。');
  if(values.tradeId.length>160)issues.push('来源交易标识超过160字，不能直接入账。');
  if(columns.tradeId>=0&&!['s','inlineStr','str'].includes(original.cellTypes[columns.tradeId])&&values.tradeId.replace(/\D/g,'').length>15)issues.push('交易号以长数字存储，可能已被Excel舍入，请核对原件。');
  const note=[values.merchant,values.goods&&values.goods!==values.merchant?values.goods:'',values.note==='/'?'':values.note].filter(Boolean).join(' · ');
  if(note.length>1000)issues.push('备注超过1000字，原文保留，入账前需编辑。');
  let exclusion='';
  if(/退款/.test(values.tradeType)||values.status==='退款成功'&&type==='income')exclusion='退款流水按已确认口径不计入统计；不自动冲销原消费。';
  else if(/退款/.test(values.status))issues.push('原订单带退款状态，需核对是否退款流水；不自动冲销或排除原消费。');
  else if(failed.has(values.status))exclusion='交易未成功，不计入统计。';
  const huabei=/花呗/.test(values.payment+' '+values.tradeType),repayment=/还款/.test(values.tradeType);
  if(!exclusion&&huabei&&!repayment)exclusion='花呗消费阶段不重复记账，按还款记录计入；原始消费行保留。';
  const draft={type,amountCents,date,note,category:huabei&&repayment&&type==='expense'?'花呗':'',source:channel,sourceRef:values.tradeId};
  rows.push({rowId:'row-'+original.rowNumber,rowNumber:original.rowNumber,rawCells:original.cells,formulas:original.formulas,values,draft,status:exclusion?'excluded':issues.length?'needs_review':'recognized',reason:exclusion,issues,duplicateCandidates:[],decision:'pending'});
 }
 const metadataRows=book.rows.slice(0,headerIndex).filter(row=>row.cells.some(v=>text(v)));
 return {channel,sheetName:book.sheetName,headerRowNumber:book.rows[headerIndex].rowNumber,headers,metadataRows,rows,
  summary:{nonemptyRows:metadataRows.length+1+rows.length,metadataRows:metadataRows.length,headerRows:1,dataRows:rows.length,recognized:rows.filter(r=>r.status==='recognized').length,needsReview:rows.filter(r=>r.status==='needs_review').length,excluded:rows.filter(r=>r.status==='excluded').length,duplicateRows:0},
  status:'parsed',sheetIndex:book.sheetIndex};
}
export async function parseAccountingWorkbook(buffer){
 const book=await readAccountingWorkbook(buffer),sheets=book.sheets.map(sheet=>{try{return parseSheet({...sheet,date1904:book.date1904});}catch(error){throw bad(`工作表“${sheet.sheetName}”：${error.message}`,error.status||400);}});
 if(!sheets.some(sheet=>sheet.status==='parsed'))throw bad('没有找到可识别的微信或支付宝账单表头（交易时间、收支、金额）。');
 const rows=sheets.flatMap(sheet=>sheet.rows.map(row=>({...row,sheetName:sheet.sheetName,sheetIndex:sheet.sheetIndex,rowId:book.sheetCount===1?row.rowId:`sheet-${sheet.sheetIndex+1}-${row.rowId}`})));
 // Duplicates are evidence for review, never a reason to omit a source row.
 const groups=new Map(),duplicateGroups=[];
 for(const row of rows){
  const d=row.draft,keys=[];
  if(d.sourceRef)keys.push(['same_channel_trade_id',JSON.stringify([d.source,d.sourceRef])]);
  if(d.date&&d.amountCents&&row.values.merchant)keys.push(['same_day_amount_merchant',JSON.stringify([d.source,d.type,d.date,d.amountCents,row.values.merchant])]);
  for(const [basis,key] of keys){const groupKey=basis+key,group=groups.get(groupKey)||{basis,rows:[]};group.rows.push(row);groups.set(groupKey,group);}
 }
 for(const group of groups.values())if(group.rows.length>1){const id='duplicate-'+(duplicateGroups.length+1);duplicateGroups.push({id,basis:group.basis,rowIds:group.rows.map(r=>r.rowId)});for(const row of group.rows)row.duplicateCandidates.push({groupId:id,basis:group.basis,count:group.rows.length-1});}

 const channels=[...new Set(sheets.filter(s=>s.status==='parsed').map(s=>s.channel))];
 return {channel:channels.length===1?channels[0]:'mixed',sheetName:book.sheetName,sheets:sheets.map(({rows,...sheet})=>sheet),rows,duplicateGroups,
 summary:{nonemptyRows:book.sheets.reduce((n,s)=>n+s.rows.filter(r=>r.cells.some(v=>text(v))||r.formulas.length).length,0),metadataRows:sheets.reduce((n,s)=>n+(s.metadataRows?.length||0),0),headerRows:sheets.filter(s=>s.status==='parsed').length,dataRows:rows.length,recognized:rows.filter(r=>r.status==='recognized').length,needsReview:rows.filter(r=>r.status==='needs_review').length,excluded:rows.filter(r=>r.status==='excluded').length,duplicateRows:rows.filter(r=>r.duplicateCandidates.length).length},
 notices:sheets.filter(s=>s.status==='unrecognized').map(s=>`工作表“${s.sheetName}”没有识别到账单表头，未生成入账候选；原始内容保留，请查看原件核对。`)};
}
