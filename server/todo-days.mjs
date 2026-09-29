import {z} from 'zod';
import {all,db,get,save,transaction} from './store.mjs';
import {validate} from './validation.mjs';
const formatter=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'});
export const calendarDay=(value=new Date())=>formatter.format(new Date(value));
export const validDay=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value+'T12:00:00Z'))&&new Date(value+'T12:00:00Z').toISOString().slice(0,10)===value;
const fail=(message,status=422)=>Object.assign(new Error(message),{status});
export function carryTodo(id,input,now=new Date()){
 const body=validate(z.strictObject({revision:z.number().int().positive(),targetDay:z.string().refine(validDay)}),input);
 const today=calendarDay(now);if(body.targetDay!==today)throw fail('日期已变化，请刷新后加入今天的待办。',409);
 return transaction(()=>{
  const source=get(id,'todo');if(!source)throw fail('来源待办已删除，无法继续转移。',404);
  if((source.day||calendarDay(source.createdAt))>=today)throw fail('只能将之前日期的未完成待办加入今天。');
  const root=source.carriedRootId||source.carriedFromId||source.id,key='todo-carry:'+root+':'+today;
  const cached=db.prepare('SELECT result FROM operations WHERE id=?').get(key);
  if(cached){const target=get(JSON.parse(cached.result).id,'todo');if(!target)throw fail('今天的转移项已被删除；如需重新安排，请新建待办。',410);return target;}
  if(source.supervisionTaskId)throw fail('这条待办已升级，请从监督记录处理，不再复制为普通待办。',409);
  if(source.revision!==body.revision)throw fail('来源待办已更新，请刷新后重新选择。',409);
  if(source.done)throw fail('已完成的待办无需转移。');
  const existing=all('todo').find(item=>(item.day||calendarDay(item.createdAt))===today&&(item.carriedRootId||item.carriedFromId)===root);
  const target=existing||save('todo',{title:source.title,day:today,timeZone:'Asia/Shanghai',done:false,completedAt:null,carriedFromId:source.id,carriedRootId:root,carriedFromDay:source.day||calendarDay(source.createdAt),carriedSourceRevision:source.revision});
  db.prepare('INSERT INTO operations(id,result) VALUES(?,?)').run(key,JSON.stringify({id:target.id}));return target;
 });
}
export function installTodoCarry(app){app.post('/api/todos/:id/carry',(req,res)=>res.json(carryTodo(req.params.id,req.body)));}
