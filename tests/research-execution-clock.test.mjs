import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {createResearchBudget} from '../server/agent/research/research-budget.mjs';
import {createResearchExecutionClock} from '../server/agent/research/research-execution-clock.mjs';
const request={runId:'run',stepKey:'report:1',requestHash:'synthetic-model-request',priceVersion:'synthetic',maxCostMicros:1000,maxTimeMs:10000};
function setup(){const db=new DatabaseSync(':memory:'),base=createResearchBudget(db);base.initialize('run');let time=0;return {db,base,advance:ms=>{time+=ms;},meter:id=>createResearchExecutionClock(base,{runId:'run',executionId:id,clock:()=>time})};}
test('graph work is metered while calls keep their own time; human waiting and replay add no model charge',()=>{
 const s=setup();try{
  const clock=s.meter('first');s.advance(120);const call=clock.ledger.reserve(request);s.advance(800);
  clock.ledger.settle({attemptId:call.attempt.id,actualCostMicros:500,elapsedMs:800,result:{content:'done'}});
  s.advance(70);clock.finish();const first=s.base.snapshot('run');assert.equal(first.spentTimeMs,990);assert.equal(first.reservedTimeMs,0);assert.equal(first.chargedMicros,500);
  s.advance(86400000);const resumed=s.meter('second');s.advance(20);assert.equal(resumed.ledger.reserve(request).replay,true);s.advance(10);resumed.finish();
  const final=s.base.snapshot('run');assert.equal(final.spentTimeMs,1020);assert.equal(final.chargedMicros,500);assert.equal(final.pendingAttempts,0);
 }finally{s.db.close();}
});
test('pulses account active non-call work and an abandoned slice remains conservatively reserved',()=>{
 const s=setup();try{
  const clock=s.meter('lost');s.advance(250);clock.pulse();s.advance(250);clock.pulse();
  const state=s.base.snapshot('run');assert.equal(state.spentTimeMs,500);assert.equal(state.reservedTimeMs,1000);
  // Simulate process loss: do not finish the old meter. A new lease/session
  // cannot refund the previous uncertain segment or mistake waiting for work.
  s.advance(86400000);const next=s.meter('replacement');s.advance(50);next.finish();
  assert.equal(s.base.snapshot('run').spentTimeMs,550);assert.equal(s.base.snapshot('run').reservedTimeMs,1000);
 }finally{s.db.close();}
});
test('zero-cost graph finalization is recorded even after all money is consumed',()=>{
 const s=setup();try{
  const clock=s.meter('end'),call=clock.ledger.reserve({...request,maxCostMicros:1000000});s.advance(300);
  clock.ledger.settle({attemptId:call.attempt.id,actualCostMicros:1000000,elapsedMs:300});s.advance(25);clock.finish();
  assert.equal(s.base.snapshot('run').chargedMicros,1000000);assert.equal(s.base.snapshot('run').spentTimeMs,325);
 }finally{s.db.close();}
});
test('pending network time is not also charged by the graph heartbeat; lease loss cannot settle its slice',()=>{
 const s=setup();try{
  const clock=s.meter('call'),call=clock.ledger.reserve(request);s.advance(500);clock.pulse();assert.equal(s.base.snapshot('run').spentTimeMs,0);
  clock.ledger.settle({attemptId:call.attempt.id,actualCostMicros:500,elapsedMs:500});clock.finish();assert.equal(s.base.snapshot('run').spentTimeMs,500);
  let writable=true;const fenced=createResearchBudget(s.db,{assertWritable:()=>{if(!writable)throw new Error('lease lost');}}),other=createResearchExecutionClock(fenced,{runId:'run',executionId:'fenced',clock:()=>0});writable=false;
  assert.throws(()=>other.finish(),/lease lost/);assert.equal(s.base.snapshot('run').reservedTimeMs,1000);
 }finally{s.db.close();}
});
test('processing reaches the shared time limit before another model reservation can start',()=>{
 const s=setup();try{
  const prior=s.base.reserve({...request,stepKey:'prior',maxTimeMs:299000});s.base.settle({attemptId:prior.attempt.id,actualCostMicros:0,elapsedMs:299000});
  const clock=s.meter('last-second');s.advance(1000);
  assert.throws(()=>clock.ledger.reserve(request),e=>e.code==='RESEARCH_BUDGET');clock.finish();
  assert.equal(s.base.snapshot('run').spentTimeMs,300000);assert.equal(s.base.snapshot('run').pendingAttempts,0);assert.equal(s.base.attempt('run','report:1'),null);
 }finally{s.db.close();}
});
