import {z} from 'zod';
import {all,db,get,save,transaction} from '../../store.mjs';
import {calendarDay} from './todo-days.mjs';
import {conditionsSchema} from '../../pet/supervision/supervision-conditions.mjs';
import {initializeSupervisionRun,recordSupervisionCalendar} from '../../pet/supervision/supervision-runs.mjs';
import {syncSupervisionRun} from '../../pet/supervision/supervision-jobs.mjs';
import {validate} from '../../core/validation.mjs';
import {payloadHash} from '../../core/device-auth.mjs';
const fail=(message,status=409)=>Object.assign(new Error(message),{status});
const time=z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
export function upgradeTodo(id,input,{clock=Date.now}={}){
 const body=validate(z.strictObject({opId:z.string().min(8).max(100),revision:z.number().int().positive(),conditions:conditionsSchema,minutes:z.number().finite().min(0).max(1440),repeat:z.enum(['once','daily']),startTime:time,time}),input,{label:'监督条件'}),hash=payloadHash({id,...body}),key='todo-upgrade:'+body.opId;
 return transaction(()=>{
  const receipt=db.prepare('SELECT result FROM operations WHERE id=?').get(key);
  if(receipt){const prior=JSON.parse(receipt.result);if(prior.hash!==hash)throw fail('此操作编号已用于其他升级条件。');if(!get(prior.taskId,'workTask')||!get(prior.runId,'workRun'))throw fail('原监督记录已删除，不会重复创建。',410);return {taskId:prior.taskId,runId:prior.runId,todoId:id};}
  const todo=get(id,'todo');if(!todo)throw fail('待办已不存在。',404);
  if(todo.supervisionTaskId)throw fail('这条待办已经升级，请查看已有监督记录。');
  if(todo.revision!==body.revision)throw fail('待办已更新，请核对后重新确认。');if(todo.done)throw fail('已完成的待办不能升级，历史状态保持不变。');
  const today=calendarDay(clock()),root=todo.carriedRootId||todo.carriedFromId||todo.id;
  if(all('todo').some(item=>item.id!==todo.id&&(item.carriedRootId||item.carriedFromId)===root&&(item.day||calendarDay(item.createdAt))===today))throw fail('这条待办已转入今天，请从今天的待办升级，避免重复监督。');
  const requirement=body.conditions.map(item=>item.description).join('；');
  const task=save('workTask',{title:todo.title,goal:todo.title,status:'supervising',executionMode:'supervision',supervisionStatus:'active',supervisionVersion:1,planVersion:1,repeat:body.repeat,minutes:body.minutes,startTime:body.startTime,time:body.time,requirement,completionConditions:body.conditions,sourceTodoId:id,sourceTodoRevision:todo.revision,sourceTodoDay:todo.day||calendarDay(todo.createdAt),plan:{goal:todo.title,conditions:'用户已确认监督条件',steps:body.conditions.map(item=>item.description),deliverable:requirement},logs:[],outputs:[],calls:0,web:false});
  recordSupervisionCalendar(task,{clock});const run=initializeSupervisionRun(task,today,{onCreated:run=>syncSupervisionRun(run.id,{clock})});
  save('todo',{...todo,supervisionTaskId:task.id,supervisionRunId:run.id,upgradedAt:new Date(clock()).toISOString()},todo.revision);
  db.prepare('INSERT INTO operations(id,result) VALUES(?,?)').run(key,JSON.stringify({hash,taskId:task.id,runId:run.id}));return {taskId:task.id,runId:run.id,todoId:id};
 });
}
export function assertTodoChange(todo,body){if(todo.supervisionTaskId&&(body.done!==undefined&&body.done!==todo.done||body.day!==undefined&&body.day!==todo.day))throw fail('这条待办已升级，请在监督记录中核对证据并确认完成。');}
export function assertTodoRemoval(todo){if(todo?.supervisionTaskId)throw fail('这条待办保留了监督来源，请在监督任务中暂停或取消，不能删除来源历史。');}
export function completeSourceTodo(run){const task=get(run.taskId,'workTask'),todo=task?.sourceTodoId?get(task.sourceTodoId,'todo'):null;if(todo&&todo.supervisionTaskId===task.id&&todo.supervisionRunId===run.id&&!todo.done)save('todo',{...todo,done:true,completedAt:run.confirmedAt},todo.revision);}
