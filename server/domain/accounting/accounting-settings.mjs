import {z} from 'zod';
import {all,get,save,transaction} from '../../store.mjs';
import {accountingAmount,bad} from './accounting.mjs';
import {calendarDay} from '../notes/todo-days.mjs';
const budgetInput=z.strictObject({revision:z.number().int().nonnegative(),amount:z.union([z.string(),z.number()]).optional(),amountCents:z.number().optional()});
export function updateAccountingBudget(input){
 const checked=budgetInput.safeParse(input);if(!checked.success)throw bad('预算金额或版本无效，请刷新后重新核对。');
 const amountCents=accountingAmount(checked.data);
 return transaction(()=>{const old=all('accountingBudget')[0];if((old?.revision||0)!==checked.data.revision)throw Object.assign(bad('预算已在其他页面修改，请刷新后重新核对；本次输入尚未保存。',409),{current:old});return save('accountingBudget',{...old,id:old?.id||'monthly-living-budget',amountCents},old?.revision);});
}
export function currentAccountingCheck({clock=Date.now}={}){
 const day=calendarDay(clock());if(!['01','15'].includes(day.slice(-2)))return null;
 const id='accounting-check-'+day,old=get(id,'accountingCheck');
 return old||{id,revision:0,day,status:'pending',title:day.endsWith('01')?'月初账单检查':'月中账单检查',message:day.endsWith('01')?'一起核对上月账单吧，可以从微信或支付宝导出文件，再到记账里导入。':'来看看这半个月的消费和剩余生活费吧。'};
}
export function completeAccountingCheck(input,{clock=Date.now}={}){
 const checked=z.strictObject({day:z.string().regex(/^\d{4}-\d{2}-(01|15)$/),confirmed:z.literal(true)}).safeParse(input);if(!checked.success)throw bad('请明确确认本次账单检查。');
 return transaction(()=>{const previous=get('accounting-check-'+checked.data.day,'accountingCheck');if(previous?.status==='completed')return previous;const current=currentAccountingCheck({clock});if(!current||current.day!==checked.data.day)throw bad('检查日期已变化，请刷新后查看。',409);return save('accountingCheck',{...current,status:'completed',confirmedAt:new Date(clock()).toISOString()});});
}
export function installAccountingSettings(app){
 app.patch('/api/accounting/budget',(req,res)=>res.json(updateAccountingBudget(req.body)));
 app.get('/api/accounting/checks',(_req,res)=>res.json({current:currentAccountingCheck(),history:all('accountingCheck').sort((a,b)=>b.day.localeCompare(a.day)).slice(0,24)}));
 app.post('/api/accounting/checks/confirm',(req,res)=>res.json(completeAccountingCheck(req.body)));
}
