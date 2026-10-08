// Controlled calendar, isolated data and synthetic AI; production routes unchanged.
process.env.SEED_DEMO='false';process.env.WORKER_MODE='true';process.env.FILE_WORKER_ENABLED='false';
const fixed=Date.parse('2026-10-15T04:00:00Z');Date.now=()=>fixed;
const {save}=await import('../../server/store.mjs');
save('todo',{title:'统一提示待办',day:'2026-10-15',done:false});
save('memory',{title:'统一提示候选',content:'偏好先核对再行动',status:'candidate',scope:'通用',scopeKind:'global'});
const event=save('event',{title:'统一提示要事',summary:'查看后还需确认',priority:'normal',eventType:'one_off',lifecycleStatus:'ongoing',tags:[],images:[],relatedEventIds:[]});
const occurrence=save('eventOccurrence',{eventId:event.id,status:'pending',dueAt:'2026-10-15T03:00:00Z'});save('event',{...event,currentOccurrenceId:occurrence.id,dueAt:occurrence.dueAt},event.revision);
const task=save('workTask',{title:'统一提示监督',goal:'监督',status:'running',supervisionStatus:'active',executionMode:'supervision',minutes:0,repeat:'once',time:'11:00',requirement:'人工核对',plan:{goal:'监督',conditions:'核对',steps:[],deliverable:'证据'},logs:[],outputs:[]});
save('workRun',{taskId:task.id,day:'2026-10-15',status:'open',seconds:0,reminded:true,reminders:[{kind:'due',at:'2026-10-15T03:00:00Z'}]});
await import('./research-web-server.mjs');
