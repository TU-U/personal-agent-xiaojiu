// One real generation with synthetic inputs; queue transport is covered separately.
import {DatabaseSync} from 'node:sqlite';
import {writeFileSync} from 'node:fs';
if(process.env.SHIGUANG_E2E_EVENT_LIVE!=='1'||!process.env.DATA_DIR?.startsWith('/tmp/shiguang-e2e-'))throw new Error('Requires opt-in and isolated data');
const live=new DatabaseSync('.data/shiguang.sqlite',{readOnly:true});
const provider=JSON.parse(live.prepare("SELECT value FROM settings WHERE key='provider'").get()?.value||'null');live.close();if(!provider)throw new Error('Saved provider required');
Object.assign(process.env,{SEED_DEMO:'false',WORKER_MODE:'true',FILE_WORKER_ENABLED:'false'});
const {db,save,setSetting,get}=await import('../../server/store.mjs');setSetting('provider',provider);
for(const signal of ['SIGTERM','SIGINT'])process.once(signal,()=>db.prepare("DELETE FROM settings WHERE key='provider'").run());
const {initializeEventLifecycle}=await import('../../server/domain/events/event-lifecycle.mjs');
const {eventJobs,makeEventHandlers}=await import('../../server/jobs/event-jobs.mjs');
const {generateEventReview}=await import('../../server/domain/events/events.mjs');
const source=save('note',{title:'合成活动预算依据',type:'text',content:'活动预算上限200元。场地尚未预订，交通报价80元。必须先确认预算再付款。',tags:[],attachments:[],status:'ready'});
const dueAt='2020-01-01T00:00:00.000Z';
const high=initializeEventLifecycle({title:'合成高等级活动复核',summary:'准备直接支付场地180元及交通80元，并把场地登记为已预订。',priority:'high',eventType:'one_off',dueAt,sourceNoteId:source.id,tags:[]});
const normal=initializeEventLifecycle({title:'合成普通活动提醒',summary:'到时间人工核对携带物品。',priority:'normal',eventType:'one_off',dueAt,tags:[]});
let calls=0;
const handler=makeEventHandlers(async(...args)=>{calls++;return generateEventReview(...args);})['event-check'];
for(const event of [high,normal]){
 const row=db.prepare("SELECT id FROM background_jobs WHERE entity_id=? ORDER BY rowid DESC LIMIT 1").get(event.id);
 const job=eventJobs.get(row.id);const result=await handler.run(job);handler.commit(job,result);
}
writeFileSync(process.env.DATA_DIR+'/event-live-result.json',JSON.stringify({calls,source,high:get(high.id,'event'),normal:get(normal.id,'event')},null,2));
// No worker starts; browser actions exercise stored results and history only.
await import('../../server/index.mjs');
