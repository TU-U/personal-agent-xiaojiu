import {performance} from 'node:perf_hooks';
// Meter graph/serialization/validation time between already-metered calls.
// A small durable reservation conservatively survives a lost worker. There is
// no timer while awaiting human approval: the job closes this clock on return.
export function createResearchExecutionClock(base,{runId,executionId,clock=()=>performance.now(),sliceMs=1000}){
 let segment=null,sequence=0,closed=false;
 const calls=new Set();
 function start(){
  if(closed||segment||calls.size)return;
  const snapshot=base.snapshot(runId);
  // A provider-contract failure cancels the run before settling its receipt.
  // Do not start another processing reservation and mask that original error.
  if(snapshot.state==='cancelled')return;
  const remaining=snapshot.remainingTimeMs;
  if(!remaining)return;
  const started=clock(),reservation=base.reserve({runId,stepKey:`processing:${executionId}:${sequence++}`,requestHash:'graph-processing-clock-v1',priceVersion:'local-processing-free-v1',maxCostMicros:0,maxTimeMs:Math.min(sliceMs,remaining)});
  segment={started,id:reservation.attempt.id};
 }
 function stop(){
  if(!segment)return;
  const current=segment;
  base.settle({attemptId:current.id,actualCostMicros:0,elapsedMs:Math.max(0,Math.ceil(clock()-current.started)),result:{stage:'graph-processing'}});
  segment=null;
 }
 const ledger={...base,
  reserve(input){
   stop();
   try{const result=base.reserve(input);if(!result.replay)calls.add(result.attempt.id);return result;}
   finally{start();}
  },
  settle(input){
   const result=base.settle(input);calls.delete(input.attemptId);start();return result;
  },
 };
 start();
 return {ledger,pulse(){if(!calls.size){stop();start();}},finish(){closed=true;stop();}};
}
