import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createWorkerStatus} from '../server/jobs/worker-status.mjs';
test('worker observation separates startup, queue failure, stale heartbeats and child replacement',()=>{
 let time=1000;const status=createWorkerStatus({clock:()=>time});
 assert.equal(status.snapshot().state,'stopped');status.start(1);assert.equal(status.snapshot().state,'starting');
 status.message(1,{type:'worker-status',queueReady:true,error:false});assert.equal(status.snapshot().state,'ready');
 status.message(1,{type:'worker-status',queueReady:true,error:true});assert.equal(status.snapshot().state,'degraded');
 time+=11000;assert.equal(status.snapshot().state,'unresponsive');assert.equal(status.snapshot().queueReady,false);
 status.exit(1);assert.equal(status.snapshot().state,'stopped');status.start(2);
 status.message(1,{type:'worker-status',queueReady:true,error:false});status.exit(1);assert.equal(status.snapshot().state,'starting');
 status.message(2,{type:'worker-status',queueReady:true,error:false});assert.equal(status.snapshot().state,'ready');
 assert.equal(createWorkerStatus({enabled:false}).snapshot().state,'disabled');
});
