import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mergeResearchEvidence,retainedEvidenceNotice} from '../server/agent/research/research-evidence-history.mjs';
import {renderResearchReport} from '../server/agent/research/research-contract.mjs';
const page={id:'P1',kind:'web',sourceId:'https://example.org/a',url:'https://example.org/a',title:'网页',revision:0,evidenceType:'web_page',quote:'旧事实',start:0,end:3,total:3,contentHash:'old-hash',retrievedAt:'2026-10-01T00:00:00Z',matchedQuestions:['Q1']};
test('failed refresh preserves original provenance and marks the retained snapshot in the report',()=>{
 const snapshot=structuredClone(page),evidence=mergeResearchEvidence([page],[]);
 assert.deepEqual(page,snapshot);assert.equal(evidence[0].retrievedAt,page.retrievedAt);assert.equal(evidence[0].contentHash,page.contentHash);
 assert.equal(evidence[0].retainedFromPrevious,true);assert.match(retainedEvidenceNotice(evidence),/不能作为最新事实核验/);
 const body=renderResearchReport({sections:[],coverage:[]},{topic:'核对',questions:['是否变化？']},evidence,retainedEvidenceNotice(evidence));
 assert.match(body,/非本轮重新取材/);assert.match(body,/2026-10-01T00:00:00Z/);
});
test('changed same-URL content is kept alongside its historical snapshot with unique stable IDs',()=>{
 const fresh={...page,quote:'新事实',contentHash:'new-hash',retrievedAt:'2026-10-08T00:00:00Z'};
 const merged=mergeResearchEvidence([page],[fresh]);assert.equal(merged.length,2);assert.equal(new Set(merged.map(e=>e.id)).size,2);
 assert.equal(merged[0].retainedFromPrevious,false);assert.equal(merged[1].quote,'旧事实');
 assert.equal(merged[1].retrievedAt,page.retrievedAt);
 const again=mergeResearchEvidence(merged,[fresh]);assert.deepEqual(again,merged);
});
test('identical newly retrieved content replaces old snapshot metadata without repeated growth',()=>{
 const fresh={...page,retrievedAt:'2026-10-08T00:00:00Z',matchedQuestions:['Q2']};
 let merged=mergeResearchEvidence([page],[fresh]);
 assert.equal(merged.length,1);assert.equal(merged[0].retainedFromPrevious,false);assert.equal(merged[0].retrievedAt,fresh.retrievedAt);
 assert.deepEqual(new Set(merged[0].matchedQuestions),new Set(['Q1','Q2']));assert.equal(retainedEvidenceNotice(merged),'');
 for(let i=0;i<20;i++)merged=mergeResearchEvidence(merged,[fresh]);assert.equal(merged.length,1);
 // Different evidence tiers, source fields and full-page hashes are not interchangeable.
 for(const changed of [{evidenceType:'search_snippet'},{sourceField:'summary'},{contentHash:'different-full-page'}])assert.equal(mergeResearchEvidence([page],[{...fresh,...changed}]).length,2);
});
