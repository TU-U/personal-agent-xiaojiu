import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const root=await mkdtemp(join(tmpdir(),'search-brief-'));Object.assign(process.env,{DATA_DIR:root,SEED_DEMO:'false',WORKER_MODE:'true'});
const {prepareSearchBrief}=await import('../server/ai/web/search-brief.mjs');
const {db}=await import('../server/store.mjs');
after(async()=>{db.close();await rm(root,{recursive:true,force:true});});
test('handoff retains full selected evidence and context; invalid AI output is explicitly local',async()=>{
 const sources=[{kind:'libraryFile',title:'资料',revision:3,quote:'背景'.repeat(400)+'关键决定：需要离线运行。'}];
 const deps={enabled:()=>true,summary:'用户限制：不购买云服务',generate:async(system,input)=>{assert.match(input,/需要离线运行/);assert.match(input,/不购买云服务/);return JSON.stringify({topic:'核实离线方案',background:['资料说明需要离线运行'],questions:['有哪些方案？','需要什么硬件？','成本如何？']});}};
 const result=await prepareSearchBrief('请比较可行性',sources,[{query:'本地优先'}],deps);
 assert.equal(result.mode,'model');assert.match(result.brief,/需要离线运行/);assert.match(result.brief,/版本 3/);assert.match(result.brief,/本地优先/);
 const invalid=await prepareSearchBrief('原始问题',sources,[],{enabled:()=>true,generate:async()=>JSON.stringify({topic:'x'.repeat(121),background:[],questions:['一','二','三']})});
 assert.equal(invalid.mode,'local');assert.match(invalid.brief,/未采用 AI 整理结果/);assert.match(invalid.brief,/原始问题/);assert.match(invalid.brief,/需要离线运行/);
});
