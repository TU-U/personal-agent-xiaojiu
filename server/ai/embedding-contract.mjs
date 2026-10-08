import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const model=Object.freeze(JSON.parse(readFileSync(new URL('../../scripts/embedding/model.json',import.meta.url),'utf8')));
export const qwenProfile='qwen3-local-v1';
export const qwenModel=model;
const failure=message=>Object.assign(new Error(message),{status:503});
export function indexDescriptor(config){
 if(!config.indexProfile)return null; // Existing BGE index stays addressable until explicit migration.
 if(config.indexProfile!==qwenProfile)throw failure('未知索引模型协议，请检查迁移配置。');
 if(config.model!=='qwen3-embedding-0.6b')throw failure('Qwen索引协议与模型名称不一致。');
 return {profile:qwenProfile,repository:model.repository,revision:model.revision,sha256:model.sha256,
   quantization:model.quantization,dimensions:model.dimensions,pooling:model.pooling,normalization:model.normalization,
   preprocessing:model.preprocessing,queryInstruction:model.queryInstruction,chunking:model.chunking,
   runtime:model.runtime,lexical:'intl-zh-word-sha31-logtf-v1',payload:'scope-v1'};
}
export function embeddingInput(text,config,role='document'){
 const descriptor=indexDescriptor(config);
 if(!['query','document'].includes(role))throw failure('Embedding输入角色无效。');
 if(!descriptor)return text;
 if(typeof text!=='string'||!text.trim())throw failure('Embedding内容不能为空。');
 return role==='query'?`Instruct: ${descriptor.queryInstruction}\nQuery:${text}`:text;
}
export function checkedVector(vector,config){
 if(!Array.isArray(vector)||!vector.length||vector.some(value=>!Number.isFinite(value)))throw failure('Embedding模型没有返回有效向量。');
 const descriptor=indexDescriptor(config);
 if(descriptor&&vector.length!==descriptor.dimensions)throw failure(`Embedding维度不符：需要${descriptor.dimensions}维，收到${vector.length}维。`);
 const norm=Math.sqrt(vector.reduce((sum,value)=>sum+value*value,0));
 if(!Number.isFinite(norm)||norm===0)throw failure('Embedding模型返回了无效的零向量或溢出向量。');
 return descriptor?vector.map(value=>value/norm):vector;
}
export function indexCollection(config,prefix=process.env.QDRANT_COLLECTION||'shiguang_chunks_v2'){
 const descriptor=indexDescriptor(config);
 const fingerprint=descriptor?JSON.stringify(descriptor):config.model;
 return `${prefix}_${createHash('sha256').update(fingerprint).digest('hex').slice(0,descriptor?20:10)}`;
}
