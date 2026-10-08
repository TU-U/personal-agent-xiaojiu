// The worker must not seed demo data or interrupt unrelated artifact generation.
process.env.SEED_DEMO='false';process.env.WORKER_MODE='true';
const {createBackgroundQueue}=await import('../../core/background-jobs.mjs');
const {fileJobs,fileHandlers,queueConnection,backgroundQueueName}=await import('../file-jobs.mjs');
const {audioHandlers}=await import('../audio-jobs.mjs');
const {classificationHandlers}=await import('../../domain/notes/classification.mjs');
const {migrationHandlers,reconcileIndexMigrations}=await import('../../retrieval/index/index-migration.mjs');
const {eventHandlers,reconcileEventJobs}=await import('../event-jobs.mjs');
const {supervisionHandlers,reconcileSupervisionJobs}=await import('../../pet/supervision/supervision-jobs.mjs');
const {researchHandlers}=await import('../../agent/research/research-jobs.mjs');
let lastError=0,workerReady=false,runtimeError=false,publisherClient,consumerClient,blockingClient,ticking=false,errorVersion=0;
function report(){const queueReady=workerReady&&publisherClient?.status==='ready'&&consumerClient?.status==='ready'&&blockingClient?.status==='ready';if(process.connected)process.send({type:'worker-status',queueReady:!!queueReady,error:runtimeError},()=>{});}
const onError=error=>{errorVersion++;runtimeError=true;report();if(Date.now()-lastError>30000){lastError=Date.now();console.error('[background] 后台队列暂不可用，任务仍保存在SQLite：',error.code||error.name);}};
const service=createBackgroundQueue({repository:fileJobs,handlers:{...fileHandlers,...audioHandlers,...classificationHandlers,...migrationHandlers,...eventHandlers,...supervisionHandlers,...researchHandlers},connection:queueConnection,name:backgroundQueueName,concurrency:1,onError});
service.worker.on('ready',()=>{workerReady=true;report();});
// Publishing and consuming have separate Redis clients. A ready consumer
// cannot certify a disconnected publisher or blocking reader. BullMQ 6 exposes
// Redis clients through getBackend(), not Queue/Worker.client.
for(const [side,connection] of [['publisher',service.queue.getBackend().client],['consumer',service.worker.getBackend().client],['blocking',service.worker.getBackend().blockingClient]])void connection.then(client=>{
 if(side==='publisher')publisherClient=client;else if(side==='consumer')consumerClient=client;else blockingClient=client;
 for(const event of ['ready','close','reconnecting','end'])client.on(event,report);
 report();
}).catch(onError);
const statusTimer=setInterval(report,2000);statusTimer.unref();report();
const tick=async()=>{if(ticking)return;ticking=true;const observedErrorVersion=errorVersion;try{reconcileIndexMigrations();reconcileEventJobs();reconcileSupervisionJobs();await service.dispatch();if(observedErrorVersion===errorVersion)runtimeError=false;}catch(error){onError(error);}finally{ticking=false;}};void tick();const timer=setInterval(()=>void tick(),1500);
let closing=false;
async function close(){if(closing)return;closing=true;clearInterval(timer);clearInterval(statusTimer);const deadline=setTimeout(()=>process.exit(0),5000);deadline.unref();try{await service.close();}finally{process.exit(0);}}
process.on('SIGTERM',close);process.on('SIGINT',close);process.on('disconnect',close);
