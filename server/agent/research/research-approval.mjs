import {createHash} from 'node:crypto';
import {Command} from '@langchain/langgraph';
import {z} from 'zod';
import {validate} from '../../core/validation.mjs';
const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value;
export const researchPlanHash=plan=>createHash('sha256').update(JSON.stringify(canonical(plan))).digest('hex');
const decision=z.strictObject({approved:z.literal(true),planVersion:z.number().int().positive(),planHash:z.string().regex(/^[a-f0-9]{64}$/)});
// Validate BEFORE invoke(Command): LangGraph persists resume inputs, so rejecting
// a stale business version only inside the resumed node can poison later retries.
// The caller must also hold its durable job lease and verify the SQL approval record.
export function researchApprovalCommand(snapshot,input){
 const value=validate(decision,input),plan=snapshot.values?.plan;
 if(!snapshot.next?.includes('confirm_plan')||!plan||value.planVersion!==plan.version||value.planHash!==researchPlanHash(plan))throw Object.assign(new Error('必须确认当前版本计划；旧确认未提交到研究流程。'),{status:409,code:'RESEARCH_STALE_APPROVAL'});
 return new Command({resume:value});
}
