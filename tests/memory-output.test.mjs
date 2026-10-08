import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseMemoryConflict,parseMemoryProposals} from '../server/domain/memory/memory-output.mjs';
const memory={id:'known',content:'用户住深圳',revision:3,status:'active'};
test('only explicit valid null counts as no conflict',()=>{
 assert.equal(parseMemoryConflict('{"conflictId":null}',[memory]),null);
 for(const value of [{},null,42,'',[],{conflictId:''},{conflictId:1},{conflictId:false},{conflictId:null,active:true},{conflictId:null,reason:'相反'}]){
  assert.throws(()=>parseMemoryConflict(JSON.stringify(value),[memory]),e=>e.status===502&&/候选仍保留/.test(e.message));
 }
 assert.throws(()=>parseMemoryConflict('not JSON',[memory]),e=>e.status===502);
});
test('conflict requires an in-scope identifier, classification and evidence',()=>{
 const valid={conflictId:'known',kind:'contradiction',reason:'同一用户当前居住地不一致'};
 assert.deepEqual(parseMemoryConflict(JSON.stringify(valid),[memory]),{...memory,conflictKind:'contradiction',conflictReason:valid.reason});
 for(const value of [{...valid,conflictId:'unknown'},{conflictId:'known'},{...valid,reason:''},{...valid,kind:'guess'},{...valid,reason:'x'.repeat(1001)}])assert.throws(()=>parseMemoryConflict(JSON.stringify(value),[memory]),e=>e.status===502);
 assert.deepEqual(memory,{id:'known',content:'用户住深圳',revision:3,status:'active'});
});

test('proposal extraction validates complete output and never silently truncates items or text',()=>{
 assert.deepEqual(parseMemoryProposals('{"items":[]}'),[]);
 assert.deepEqual(parseMemoryProposals(JSON.stringify({items:[{content:'用户居住深圳',conflictId:null}]})),[{content:'用户居住深圳'}]);
 for(const items of [[{content:'x'.repeat(301)}],Array.from({length:4},()=>({content:'事实'})),[{content:'事实',status:'active'}],[{content:'事实',conflictId:'old'}],[{content:42}]])assert.throws(()=>parseMemoryProposals(JSON.stringify({items})),/格式无效/);
});
