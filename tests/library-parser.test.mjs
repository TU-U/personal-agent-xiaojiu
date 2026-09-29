import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {parseLibraryCopy} from '../server/library-parser.mjs';
const root=await mkdtemp(path.join(os.tmpdir(),'library-parser-'));
test('isolated parser preserves full body and reports decoding errors',async()=>{
 const file=path.join(root,'long.md'),text='完整正文\n'.repeat(40000)+'末尾凭据';await writeFile(file,text);
 const result=await parseLibraryCopy(file,'.md');assert.equal(result.content,text);assert.equal(result.parse.state,'ready');
 const binary=path.join(root,'binary.txt');await writeFile(binary,Buffer.from([65,0,66]));
 await assert.rejects(parseLibraryCopy(binary,'.txt'),/二进制/);
});
test('CPU-bound child does not block parent timers; timeout kills it and next parse works',async()=>{
 const worker=path.join(root,'busy.mjs');await writeFile(worker,'while(true){}');
 let ticks=0;const ticker=setInterval(()=>ticks++,10);
 try{await assert.rejects(parseLibraryCopy('unused','.pdf',{workerPath:worker,timeoutMs:250}),/解析超过/);}finally{clearInterval(ticker);}
 assert.ok(ticks>=5,'API event loop remained responsive');
 const file=path.join(root,'after.md');await writeFile(file,'恢复后');assert.equal((await parseLibraryCopy(file,'.md')).content,'恢复后');
});
test('worker crash and malformed successful response are explicit failures',async()=>{
 const worker=path.join(root,'crash.mjs');await writeFile(worker,'process.exit(2)');await assert.rejects(parseLibraryCopy('unused','.pdf',{workerPath:worker}),/异常结束/);
 await writeFile(worker,"process.send({ok:true,result:{content:42}},()=>process.exit(0))");await assert.rejects(parseLibraryCopy('unused','.pdf',{workerPath:worker}),/无效结果/);
});
after(async()=>{await rm(root,{recursive:true,force:true});});
