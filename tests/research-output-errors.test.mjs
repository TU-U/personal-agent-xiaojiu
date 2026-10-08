import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseResearchReport,reportSections} from '../server/agent/research/research-contract.mjs';
test('missing candidate kind remains rejected with a useful safe field location',()=>{
 const brief={type:'comparison',questions:['哪种符合约束？']};
 const report={sections:reportSections(brief.type).map(key=>({key,paragraphs:[{text:'待核实',basis:'model_knowledge',sourceIds:[]}]})),coverage:[{questionId:'Q1',status:'partial',reason:'需核对'}],actions:[{title:'人工核对',description:'没有类型不能猜测为行动或要事'}]};
 assert.throws(()=>parseResearchReport(JSON.stringify(report),brief,[]),e=>e.status===502&&e.code==='RESEARCH_OUTPUT'&&e.message.includes('候选事项 / 第1项 / 候选类型'));
 report.actions[0].kind='action';assert.equal(parseResearchReport(JSON.stringify(report),brief,[]).actions[0].kind,'action');
 report['private-user-string']='secret value';assert.throws(()=>parseResearchReport(JSON.stringify(report),brief,[]),e=>!e.message.includes('private-user-string')&&!e.message.includes('secret value'));
});
