import {get} from '../store.mjs';
import {memoryApplies} from '../retrieval/retrieval-scope.mjs';
import {hybridAvailable,hybridSearch} from '../retrieval/retrieval.mjs';

export async function artifactMemories({template,instructions='',sources=[]},{available=hybridAvailable,search=hybridSearch}={}){
 const purpose=template==='weekly'?'周报':'文章';
 if(!available())return {memories:[],notice:'长期记忆混合检索未配置，本次未载入记忆；仍可根据所选记录生成。'};
 // Legacy project names never authorize project-scoped memories.
 const query=[purpose+' 写作偏好与相关背景',instructions,sources.map(s=>s.title).join('\n')].filter(Boolean).join('\n').slice(0,6000);
 let hits;try{hits=await search(query,{kind:'memory',purpose,limit:8});}
 catch{return {memories:[],notice:'长期记忆检索未成功，本次未载入记忆；未改为全库注入。可检查检索服务后重新生成。'};}
 const memories=[],seen=new Set();let characters=0;
 for(const hit of hits){
  if(seen.has(hit.id))continue;seen.add(hit.id);
  const memory=get(hit.id,'memory');
  if(!memory||memory.revision!==hit.revision||!memoryApplies(memory,{purpose}))continue;
  if(typeof memory.content!=='string'||!memory.content.trim()||characters+memory.content.length>6000)continue;
  characters+=memory.content.length;memories.push(memory);
  if(memories.length===5)break;
 }
 return {memories,notice:memories.length?`本次按写作主题检索并采用 ${memories.length} 条已确认记忆。`:'未找到适用于本次写作的相关已确认记忆。'};
}
