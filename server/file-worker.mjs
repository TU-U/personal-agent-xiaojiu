// The worker must not seed demo data or interrupt unrelated artifact generation.
process.env.SEED_DEMO='false';process.env.WORKER_MODE='true';
const {createBackgroundQueue}=await import('./background-jobs.mjs');
const {fileJobs,fileHandlers,queueConnection,backgroundQueueName}=await import('./file-jobs.mjs');
const {audioHandlers}=await import('./audio-jobs.mjs');
const {classificationHandlers}=await import('./classification.mjs');
const {migrationHandlers,reconcileIndexMigrations}=await import('./index-migration.mjs');
const {eventHandlers,reconcileEventJobs}=await import('./event-jobs.mjs');
const {supervisionHandlers,reconcileSupervisionJobs}=await import('./supervision-jobs.mjs');
let lastError=0;
const onError=error=>{if(Date.now()-lastError>30000){lastError=Date.now();console.error('[background] 后台队列暂不可用，任务仍保存在SQLite：',error.code||error.name);}};
const service=createBackgroundQueue({repository:fileJobs,handlers:{...fileHandlers,...audioHandlers,...classificationHandlers,...migrationHandlers,...eventHandlers,...supervisionHandlers},connection:queueConnection,name:backgroundQueueName,concurrency:1,onError});
const tick=()=>{try{reconcileIndexMigrations();reconcileEventJobs();reconcileSupervisionJobs();void service.dispatch().catch(onError);}catch(error){onError(error);}};tick();const timer=setInterval(tick,1500);
let closing=false;
async function close(){if(closing)return;closing=true;clearInterval(timer);const deadline=setTimeout(()=>process.exit(0),5000);deadline.unref();try{await service.close();}finally{process.exit(0);}}
process.on('SIGTERM',close);process.on('SIGINT',close);process.on('disconnect',close);
