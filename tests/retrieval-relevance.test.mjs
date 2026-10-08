import {test} from 'node:test';
import assert from 'node:assert/strict';
import {cosineSimilarity,relevancePolicy} from '../server/retrieval/retrieval-relevance.mjs';
import {qwenProfile} from '../server/ai/embedding-contract.mjs';
test('Qwen relevance uses cosine rather than fusion rank or vector magnitude and rejects missing evidence',()=>{
 const c={indexProfile:qwenProfile};assert.equal(relevancePolicy(c).minimumCosine,0.45);
 assert.equal(relevancePolicy({model:'bge-m3'}),null);
 assert.equal(cosineSimilarity([2,0],{vector:{dense:[7,0]},score:0.001}),1);
 assert.equal(cosineSimilarity([2,0],{vector:{dense:[0,7]},score:1}),0);
 assert.equal(cosineSimilarity([2,0],{vector:{dense:[-7,0]}}),-1);
 assert.throws(()=>cosineSimilarity([1,0],{score:1}),/无法判断/);
 assert.throws(()=>cosineSimilarity([1,0],{vector:{dense:[1]}}),/无法判断/);
 assert.throws(()=>cosineSimilarity([1,0],{vector:{dense:[0,0]}}),/无效/);
});
