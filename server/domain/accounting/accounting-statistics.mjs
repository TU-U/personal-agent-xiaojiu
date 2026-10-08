import {z} from 'zod';
import {all,db} from '../../store.mjs';
import {expenseCategories,incomeCategories,bad} from './accounting.mjs';
import {calendarDay} from '../notes/todo-days.mjs';
const querySchema=z.strictObject({period:z.enum(['all','today','week','month','custom']).default('month'),kind:z.enum(['all','income','expense']).default('all'),category:z.enum(['all',...expenseCategories,...incomeCategories]).default('all'),start:z.string().default(''),end:z.string().default(''),search:z.string().max(1000).default(''),rankMonth:z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),chartYear:z.string().regex(/^\d{4}$/)});
const sum=(rows,type)=>rows.filter(r=>r.type===type).reduce((s,r)=>s+BigInt(r.amountCents),0n).toString();
const totals=rows=>({income:sum(rows,'income'),expense:sum(rows,'expense')});
const monthRows=(rows,month)=>rows.filter(r=>r.date.slice(0,7)===month);
const realDate=s=>/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
export function calculateAccountingView(rows,budget,input,{clock=Date.now}={}){
 const parsed=querySchema.safeParse(input);if(!parsed.success)throw bad('账单筛选条件无效，请检查日期、类型和分类。');
 const q=parsed.data,day=calendarDay(clock()),nowMonth=day.slice(0,7);let low='0000-01-01',high='9999-12-31';
 if(q.period==='today')low=high=day;
 if(q.period==='month'){low=nowMonth+'-01';high=nowMonth+'-31';}
 if(q.period==='week'){const d=new Date(day+'T00:00:00Z'),offset=(d.getUTCDay()+6)%7;d.setUTCDate(d.getUTCDate()-offset);low=d.toISOString().slice(0,10);d.setUTCDate(d.getUTCDate()+6);high=d.toISOString().slice(0,10);}
 if(q.period==='custom'){if(!realDate(q.start)||!realDate(q.end)||q.start>q.end)throw bad('自定义日期须为有效日期，开始日期不能晚于结束日期。');low=q.start;high=q.end;}
 for(const r of rows)if(!Number.isSafeInteger(r.amountCents)||r.amountCents<=0||!['income','expense'].includes(r.type)||!realDate(r.date))throw bad('账本中存在无效金额、类型或日期，请修正原账单后统计。',409);
 const search=q.search.trim().toLocaleLowerCase(),filtered=rows.filter(r=>r.date>=low&&r.date<=high&&(q.kind==='all'||r.type===q.kind)&&(q.category==='all'||r.category===q.category)&&(!search||`${r.category} ${r.note}`.toLocaleLowerCase().includes(search))).sort((a,b)=>b.date.localeCompare(a.date)||b.createdAt.localeCompare(a.createdAt)||a.id.localeCompare(b.id));
 const current=monthRows(rows,nowMonth),selected=monthRows(rows,q.rankMonth),livingSpent=sum(current.filter(r=>['美食','日用','花呗'].includes(r.category)),'expense');
 const categories=expenseCategories.map((name,i)=>({name,i,value:sum(selected.filter(r=>r.category===name),'expense')})).filter(c=>BigInt(c.value)>0n).sort((a,b)=>BigInt(a.value)>BigInt(b.value)?-1:BigInt(a.value)<BigInt(b.value)?1:a.i-b.i);
 const chart=month=>({month,label:month.slice(5)+'月',...totals(monthRows(rows,month))});
 return {day,filtered,filteredTotals:totals(filtered),monthTotals:totals(current),livingSpent,budgetCents:String(budget.amountCents),budgetRemaining:(BigInt(budget.amountCents)-BigInt(livingSpent)).toString(),monthlySpend:sum(selected,'expense'),categories,chartYears:[...new Set([day.slice(0,4),...rows.map(r=>r.date.slice(0,4))])].sort().reverse(),monthOptions:[...new Set([nowMonth,...rows.map(r=>r.date.slice(0,7))])].sort().reverse(),monthChart:Array.from({length:12},(_,i)=>chart(q.chartYear+'-'+String(i+1).padStart(2,'0'))),recentMonthChart:Array.from({length:6},(_,i)=>{const d=new Date(day+'T00:00:00Z');d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()-5+i);return chart(d.toISOString().slice(0,7));}),ranking:selected.filter(r=>r.type==='expense').sort((a,b)=>b.amountCents-a.amountCents||b.date.localeCompare(a.date)||a.id.localeCompare(b.id))};
}
export function accountingView(input){db.exec('BEGIN');try{const result=calculateAccountingView(all('transaction'),all('accountingBudget')[0]||{amountCents:200000},input);db.exec('COMMIT');return result;}catch(e){db.exec('ROLLBACK');throw e;}}
export function installAccountingStatistics(app){app.get('/api/accounting/view',(req,res)=>res.json(accountingView(req.query)));}
