import {selectResearchPassages} from './research/research-evidence.mjs';
const clip=(text,size)=>{let end=Math.max(0,size);if(end<text.length&&/[\uD800-\uDBFF]/.test(text[end-1]))end--;return text.slice(0,end);};
export function buildArtifactContext(notes,{instructions='',template='weekly',maxChars=12000}={}){
 const sources=[],blocks=[];let used=0;
 for(const [index,note] of notes.entries()){
  const header=`[${sources.length+1}] ${note.title}（${note.createdAt.slice(0,10)}）\n`,share=Math.floor((maxChars-used)/(notes.length-index)),room=share-header.length-2;
  if(room<40)continue;
  const parts=selectResearchPassages(note.content,{topic:instructions,questions:[instructions||(template==='weekly'?'进展 完成 风险 问题 下一步 计划':'主题 观点 结论 感悟')]}),excerpts=[];
  const cap=Math.min(room,1800),perPart=Math.floor(cap/parts.length);
  for(const part of parts){const prefix=`[原文位置 ${part.start+1}] `,quote=clip(part.quote,perPart-prefix.length-1);if(quote)excerpts.push({start:part.start,end:part.start+quote.length,quote,selectionMethod:part.selectionMethod});}
  if(!excerpts.length)continue;
  const quote=excerpts.map(e=>`[原文位置 ${e.start+1}] ${e.quote}`).join('\n'),block=header+quote;
  if(used+block.length+2>maxChars)continue;
  used+=block.length+2;blocks.push(block);sources.push({id:note.id,title:note.title,quote,excerpts,revision:note.revision,createdAt:note.createdAt,totalCharacters:note.content.length,truncated:excerpts.length!==1||excerpts[0].start!==0||excerpts[0].end!==note.content.length,sourceField:note.transcript?.segments?.length?'transcriptContent':'content'});
 }
 return {sources,context:blocks.join('\n\n'),contextCharacters:used,omittedCount:notes.length-sources.length};
}
