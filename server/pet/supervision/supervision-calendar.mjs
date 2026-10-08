import {randomUUID} from 'node:crypto';
import {db} from '../../store.mjs';
import {calendarDay} from '../../domain/notes/todo-days.mjs';
import {payloadHash} from '../../core/device-auth.mjs';
// A segment records a known active period and its immutable template. No inferred
// pre-upgrade history: an existing task's first segment begins when first observed.
db.exec(`CREATE TABLE IF NOT EXISTS supervision_calendar (
 id TEXT PRIMARY KEY,task_id TEXT NOT NULL,start_day TEXT NOT NULL,end_day TEXT,
 through_day TEXT,template TEXT NOT NULL,signature TEXT NOT NULL,recorded_at TEXT NOT NULL
); CREATE UNIQUE INDEX IF NOT EXISTS supervision_calendar_open ON supervision_calendar(task_id) WHERE end_day IS NULL;`);
export const nextCalendarDay=day=>new Date(Date.parse(day+'T12:00:00Z')+86400000).toISOString().slice(0,10);
export function syncSupervisionCalendar(task,template,{clock=Date.now}={}){
 const today=calendarDay(clock()),active=task.repeat==='daily'&&task.status!=='cancelled'&&(task.supervisionStatus?task.supervisionStatus==='active':['running','waiting','review'].includes(task.status));
 const open=db.prepare('SELECT * FROM supervision_calendar WHERE task_id=? AND end_day IS NULL').get(task.id);
 if(!active){if(open)db.prepare('UPDATE supervision_calendar SET end_day=? WHERE id=?').run(today,open.id);return;}
 const signature=payloadHash({...template,conditionsSnapshot:{...template.conditionsSnapshot,taskRevision:undefined}});
 if(open?.signature===signature)return;
 if(open)db.prepare('UPDATE supervision_calendar SET end_day=? WHERE id=?').run(today,open.id);
 const start=open?nextCalendarDay(today):today;
 db.prepare('INSERT INTO supervision_calendar(id,task_id,start_day,template,signature,recorded_at) VALUES(?,?,?,?,?,?)').run(randomUUID(),task.id,start,JSON.stringify(template),signature,new Date(clock()).toISOString());
}
export function calendarSegments(taskId){return db.prepare('SELECT * FROM supervision_calendar WHERE task_id=? ORDER BY recorded_at,rowid').all(taskId).map(row=>({...row,template:JSON.parse(row.template)}));}
export function advanceCalendar(id,day){db.prepare('UPDATE supervision_calendar SET through_day=? WHERE id=?').run(day,id);}
