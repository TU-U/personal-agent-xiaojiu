import {contractPost,contractPatch} from './api';
import TodoUpgrade,{pendingTodoUpgrade} from './TodoUpgrade';
import {openPetSource} from './PetReminderTable';
import {usePetTarget,focusPetSource} from './usePetTarget';
import { useEffect, useState, type FormEvent } from 'react';
import { Check, ListTodo, Plus, Trash2, CopyPlus } from 'lucide-react';
import {del} from './api';
import type { Todo } from './types';

const dayOf = (value: Date | string) => new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value));
const todoDay = (todo: Todo) => todo.day || dayOf(todo.createdAt);
const dayLabel = (day: string, today: string) => day === today ? '今天' : new Date(`${day}T12:00:00`).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });

export default function TodoPanel({ todos, onRefresh, onToast }: { todos: Todo[]; onRefresh: () => Promise<void>; onToast: (message: string) => void }) {
  const [today, setToday] = useState(() => dayOf(new Date()));
  const [selectedDay, setSelectedDay] = useState(() => dayOf(new Date()));
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const [upgrading,setUpgrading]=useState(pendingTodoUpgrade()?.todoId||'');
  const [error, setError] = useState('');
  useEffect(() => {
    const tick = () => {
      const next = dayOf(new Date());
      if (next !== today) {
        setToday(next);
        setSelectedDay(day => day === today ? next : day);
      }
    };
    const timer = window.setInterval(tick, 30_000);
    window.addEventListener('focus', tick);
    document.addEventListener('visibilitychange', tick);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', tick); document.removeEventListener('visibilitychange', tick); };
  }, [today]);
  usePetTarget('library',item=>{const todo=todos.find(x=>x.id===item.sourceId);if(!todo){setError('这条待办已不存在，请刷新提示。');return true;}setSelectedDay(todoDay(todo));focusPetSource('todo-'+todo.id);return true;});
  const days = [...new Set([today, ...todos.map(todoDay)])].sort((a, b) => b.localeCompare(a));
  const current = todos.filter(todo => todoDay(todo) === selectedDay);
  const remaining = current.filter(todo => !todo.done).length;
  const viewingToday = selectedDay === today;
  const alreadyCarried=(todo:Todo)=>todos.some(item=>todoDay(item)===today&&(item.carriedRootId||item.carriedFromId)===(todo.carriedRootId||todo.carriedFromId||todo.id));

  async function add(event: FormEvent) {
    event.preventDefault();
    const value = title.trim();
    if (!value || busy) return;
    setBusy(true); setError('');
    try {
      await contractPost('postTodos','/todos',{ title: value, day: dayOf(new Date()) });
      setTitle('');
      await onRefresh();
    } catch (cause) { setError((cause as Error).message); }
    finally { setBusy(false); }
  }

  async function toggle(todo: Todo) {
    if (busy || !viewingToday) return;
    setBusy(true); setError('');
    try {
      await contractPatch('patchTodosById','/todos/' + todo.id,{ done: !todo.done, day: selectedDay, revision: todo.revision });
      await onRefresh();
    } catch (cause) { setError((cause as Error).message); }
    finally { setBusy(false); }
  }

  async function remove(todo: Todo) {
    if (busy || !viewingToday) return;
    setBusy(true); setError('');
    try {
      await del('/todos/' + todo.id, todo.revision);
      await onRefresh();
      onToast('待办已删除');
    } catch (cause) { setError((cause as Error).message); }
    finally { setBusy(false); }
  }

  async function carry(todo: Todo) {
    if (busy || viewingToday) return;
    setBusy(true); setError('');
    try {
      await contractPost('postTodosByIdCarry','/todos/'+todo.id+'/carry',{ revision:todo.revision,targetDay:dayOf(new Date()) });
      await onRefresh();
      onToast('已加入今天的待办，历史记录仍保留');
    } catch (cause) { setError((cause as Error).message); }
    finally { setBusy(false); }
  }

  return <section className="todo-panel" aria-labelledby="todo-heading">
    <header className="todo-heading">
      <span className="todo-icon"><ListTodo size={18}/></span>
      <div><h2 id="todo-heading">{viewingToday ? '今日待办' : '历史待办'}</h2><p>{dayLabel(selectedDay, today)} · {current.length ? `${current.length - remaining} 项完成，${remaining} 项未完成` : '暂无记录'}</p></div>
      <span className="todo-count" aria-label={`${remaining} 项未完成`}>{remaining}</span>
    </header>
    <div className="todo-date-row"><label htmlFor="todo-day-select">查看日期</label><select id="todo-day-select" value={selectedDay} onChange={event => setSelectedDay(event.target.value)}>{days.map(day => <option key={day} value={day}>{dayLabel(day, today)} · {todos.filter(todo => todoDay(todo) === day).length} 项</option>)}</select>{!viewingToday && <button type="button" onClick={() => setSelectedDay(today)}>返回今天</button>}</div>
    {viewingToday && <form className="todo-add" onSubmit={add}>
      <input aria-label="添加待办事项" placeholder="今天想完成什么？" maxLength={160} value={title} onChange={event => setTitle(event.target.value)}/>
      <button type="submit" aria-label="添加待办" disabled={!title.trim() || busy}><Plus size={17}/></button>
    </form>}
    {error && <p className="todo-error" role="alert">{error}</p>}
    {current.length ? <ul className="todo-list">{current.map(todo => <li className={todo.done ? 'done' : ''} key={todo.id} id={'todo-'+todo.id} tabIndex={-1}>
      {viewingToday ? <button className="todo-check" type="button" aria-label={todo.done ? `重新打开：${todo.title}` : `完成：${todo.title}`} aria-pressed={todo.done} disabled={busy||!!todo.supervisionTaskId} onClick={() => void toggle(todo)}>{todo.done && <Check size={13}/>}</button> : <span className="todo-history-state" aria-label={todo.done ? '已完成' : '未完成'}>{todo.done ? <Check size={13}/> : '—'}</span>}
      <span title={todo.title}>{todo.title}{todo.carriedFromId&&<small className="todo-origin">来自 {todo.carriedFromDay||'历史待办'}</small>}</span>
      {todo.supervisionTaskId?<button className="todo-carry" onClick={()=>openPetSource({sourceKind:'workRun',sourceId:todo.supervisionRunId||'',actionTarget:{page:'workTasks',id:todo.supervisionTaskId!,runId:todo.supervisionRunId}})}>查看监督记录</button>:viewingToday ? <button className="todo-delete" type="button" aria-label={`删除：${todo.title}`} disabled={busy} onClick={() => void remove(todo)}><Trash2 size={14}/></button> : !todo.done && <button className="todo-carry" type="button" aria-label={`加入今天：${todo.title}`} disabled={busy || alreadyCarried(todo)} onClick={() => void carry(todo)}><CopyPlus size={14}/><span>{alreadyCarried(todo) ? '已加入今天' : '加入今天'}</span></button>}
      {!todo.done&&!todo.supervisionTaskId&&<button className="todo-carry" disabled={busy||!!upgrading} onClick={()=>setUpgrading(todo.id)}>升级监督</button>}
    </li>)}</ul> : <div className="todo-empty"><span>{viewingToday ? '今天还没有待办，写下一件小事。' : '这一天没有待办记录。'}</span></div>}
    {upgrading&&todos.find(todo=>todo.id===upgrading)&&<TodoUpgrade key={upgrading} todo={todos.find(todo=>todo.id===upgrading)!} onClose={()=>setUpgrading('')} onRefresh={onRefresh}/>}
  </section>;
}
