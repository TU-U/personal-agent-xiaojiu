import {randomUUID,createHash} from 'node:crypto';
import {z} from 'zod';
import {validate} from '../../core/validation.mjs';
import {isResearchEvidenceStep,REPORT_CLOSING_MICROS,evidenceTimeAvailable} from './research-limits.mjs';
// Keep this library independent of the application singleton DB, including in
// isolated graph workers. Canonical settlement receipts include every field.
const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value;
const payloadHash=value=>createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
const fail=(message,code='RESEARCH_BUDGET',status=409)=>Object.assign(new Error(message),{code,status});
const key=z.string().min(1).max(200),integer=z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const reservation=z.strictObject({runId:key,stepKey:key,requestHash:z.string().min(16).max(100),priceVersion:z.string().min(1).max(200),maxCostMicros:integer.max(1000000),maxTimeMs:integer.min(1).max(300000)});
const settlement=z.strictObject({attemptId:key,actualCostMicros:integer.nullable(),chargeBasis:z.enum(['reported','usage-upper-bound']).optional(),elapsedMs:integer,result:z.unknown().optional(),error:z.string().max(1000).optional()});
// Monetary units are integer millionths of RMB. Limits are per research run,
// from planning onwards; callers cannot increase them on retry or restoration.
export function createResearchBudget(db,{clock=Date.now,assertWritable=()=>{}}={}){
 db.exec(`CREATE TABLE IF NOT EXISTS research_budgets (
  run_id TEXT PRIMARY KEY,state TEXT NOT NULL DEFAULT 'active',created_at INTEGER NOT NULL,
  max_time_ms INTEGER NOT NULL DEFAULT 300000 CHECK(max_time_ms=300000),
  max_cost_micros INTEGER NOT NULL DEFAULT 1000000 CHECK(max_cost_micros=1000000));
  CREATE TABLE IF NOT EXISTS research_budget_attempts (
  id TEXT PRIMARY KEY,run_id TEXT NOT NULL,step_key TEXT NOT NULL,request_hash TEXT NOT NULL,price_version TEXT NOT NULL,
  state TEXT NOT NULL,max_cost_micros INTEGER NOT NULL,max_time_ms INTEGER NOT NULL,started_at INTEGER NOT NULL,
  charged_micros INTEGER,elapsed_ms INTEGER,charge_basis TEXT,result TEXT,error TEXT,settlement_hash TEXT,
  UNIQUE(run_id,step_key));`);
 function atomic(fn,write=true){const outer=write&&!db.isTransaction;db.exec(outer?'BEGIN IMMEDIATE':'SAVEPOINT research_budget_change');try{const result=fn();db.exec(outer?'COMMIT':'RELEASE research_budget_change');return result;}catch(error){db.exec(outer?'ROLLBACK':'ROLLBACK TO research_budget_change; RELEASE research_budget_change');throw error;}}
 const decode=row=>row?{...row,result:row.result===null?null:JSON.parse(row.result)}:null;
 function snapshot(runId){
  const run=db.prepare('SELECT * FROM research_budgets WHERE run_id=?').get(runId);if(!run)throw fail('研究预算不存在。','RESEARCH_NOT_FOUND',404);
  const totals=db.prepare(`SELECT COALESCE(SUM(charged_micros),0) charged,COALESCE(SUM(elapsed_ms),0) elapsed,
   COALESCE(SUM(CASE WHEN state='reserved' THEN max_cost_micros ELSE 0 END),0) reserved_cost,
   COALESCE(SUM(CASE WHEN state='reserved' THEN max_time_ms ELSE 0 END),0) reserved_time,
   COALESCE(SUM(CASE WHEN charge_basis IN ('upper-bound','usage-upper-bound') THEN charged_micros ELSE 0 END),0) uncertain,
   COALESCE(SUM(CASE WHEN state='reserved' THEN 1 ELSE 0 END),0) pending
   FROM research_budget_attempts WHERE run_id=?`).get(runId);
  return {runId,state:run.state,maxTimeMs:run.max_time_ms,maxCostMicros:run.max_cost_micros,spentTimeMs:totals.elapsed,chargedMicros:totals.charged,reservedTimeMs:totals.reserved_time,reservedMicros:totals.reserved_cost,uncertainMicros:totals.uncertain,pendingAttempts:totals.pending,remainingTimeMs:Math.max(0,run.max_time_ms-totals.elapsed-totals.reserved_time),remainingMicros:Math.max(0,run.max_cost_micros-totals.charged-totals.reserved_cost),overLimit:totals.elapsed>run.max_time_ms||totals.charged>run.max_cost_micros};
 }
 return {
  initialize(runId){validate(key,runId);return atomic(()=>{assertWritable();db.prepare('INSERT INTO research_budgets(run_id,created_at) VALUES(?,?) ON CONFLICT(run_id) DO NOTHING').run(runId,clock());return snapshot(runId);});},
  attempt:(runId,stepKey)=>decode(db.prepare('SELECT * FROM research_budget_attempts WHERE run_id=? AND step_key=?').get(validate(key,runId),validate(key,stepKey))),
  snapshot:runId=>atomic(()=>snapshot(validate(key,runId)),false),
  reserve(input){
   if(!input.priceVersion)throw fail('尚无可靠价格版本，未发起付费调用。','RESEARCH_PRICE_REQUIRED',422);
   const value=validate(reservation,input);
   return atomic(()=>{
    assertWritable();const budget=snapshot(value.runId);if(budget.state!=='active')throw fail('研究已取消，不能继续调用。','RESEARCH_CANCELLED');
    const old=db.prepare('SELECT * FROM research_budget_attempts WHERE run_id=? AND step_key=?').get(value.runId,value.stepKey);
    if(old){
     if(old.request_hash!==value.requestHash||old.price_version!==value.priceVersion||old.max_cost_micros!==value.maxCostMicros||old.max_time_ms!==value.maxTimeMs)throw fail('同一研究步骤编号不能用于不同输入或价格。','RESEARCH_STEP_CONFLICT');
     if(old.state==='reserved')throw fail('这一步已有未结算调用，不能重复发起；额度仍保留。','RESEARCH_CALL_PENDING');
     return {replay:true,attempt:decode(old)};
    }
    if(value.maxCostMicros>budget.remainingMicros||value.maxTimeMs>budget.remainingTimeMs||budget.remainingTimeMs===0||budget.remainingMicros===0&&!value.stepKey.startsWith('processing:'))throw fail('本次研究的时间或费用额度不足，停止新调用并保留已有结果。');
    // Enforce inside the same write transaction as the reservation, including
    // other connections and worker recovery. Replays above consume no capacity.
    if(isResearchEvidenceStep(value.stepKey)&&(value.maxCostMicros>Math.max(0,budget.remainingMicros-REPORT_CLOSING_MICROS)||value.maxTimeMs>evidenceTimeAvailable(budget)))throw fail('取材额度不足：保留报告收束所需的32分费用和45秒执行时间，停止新增取材，使用已有材料继续。');
    const id=randomUUID();db.prepare(`INSERT INTO research_budget_attempts(id,run_id,step_key,request_hash,price_version,state,max_cost_micros,max_time_ms,started_at) VALUES(?,?,?,?,?,'reserved',?,?,?)`).run(id,value.runId,value.stepKey,value.requestHash,value.priceVersion,value.maxCostMicros,value.maxTimeMs,clock());
    return {replay:false,attempt:decode(db.prepare('SELECT * FROM research_budget_attempts WHERE id=?').get(id))};
   });
  },
  settle(input){
   const value=validate(settlement,input),hash=payloadHash(value);
   return atomic(()=>{
    assertWritable();const old=db.prepare('SELECT * FROM research_budget_attempts WHERE id=?').get(value.attemptId);if(!old)throw fail('研究调用记录不存在。','RESEARCH_NOT_FOUND',404);
    if(old.state!=='reserved'){if(old.settlement_hash!==hash)throw fail('已结算的调用不能更改费用或结果。','RESEARCH_SETTLEMENT_CONFLICT');return decode(old);}
    // Missing usage / timeout does not mean zero cost: retain the conservative upper bound.
    const charged=value.actualCostMicros??old.max_cost_micros;
    db.prepare(`UPDATE research_budget_attempts SET state=?,charged_micros=?,elapsed_ms=?,charge_basis=?,result=?,error=?,settlement_hash=? WHERE id=?`).run(value.error?'failed':'settled',charged,value.elapsedMs,value.actualCostMicros===null?'upper-bound':(value.chargeBasis||'reported'),JSON.stringify(value.result??null),value.error||null,hash,value.attemptId);
    return decode(db.prepare('SELECT * FROM research_budget_attempts WHERE id=?').get(value.attemptId));
   });
  },
  cancel(runId){return atomic(()=>{assertWritable();snapshot(validate(key,runId));db.prepare("UPDATE research_budgets SET state='cancelled' WHERE run_id=?").run(runId);return snapshot(runId);});},
 };
}
