import {DatabaseSync} from 'node:sqlite';
import {createBackgroundQueue,createJobRepository} from '../../server/core/background-jobs.mjs';
const db=new DatabaseSync(process.env.JOB_DB);db.exec('PRAGMA busy_timeout=5000');
const repository=createJobRepository(db);
const service=createBackgroundQueue({repository,connection:{host:'127.0.0.1',port:Number(process.env.TEST_REDIS_PORT),maxRetriesPerRequest:null},leaseMs:800,lockDuration:800,stalledInterval:500,handlers:{parse:{
 async run(row){process.send?.({running:row.id});if(process.env.HOLD==='1')await new Promise(()=>{});return row.payload.text;},
 commit(row,result){db.prepare('INSERT INTO results VALUES(?,?)').run(row.id,result);}
}}});
const tick=()=>void service.dispatch().catch(()=>{});tick();const timer=setInterval(tick,100);
process.on('SIGTERM',async()=>{clearInterval(timer);await service.close();db.close();process.exit(0);});
