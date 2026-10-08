import {sourceReading} from '../domain/shared/source-content.mjs';
import {selectResearchPassages} from './research/research-evidence.mjs';
export function conversationSourceExcerpt(entity,kind,query){
 const reading=kind==='event'?{field:'summary',text:entity.summary||entity.title||''}:sourceReading(entity,kind);
 const text=reading.text||entity.summary||'',excerpts=selectResearchPassages(text,{questions:[query],topic:''},{maxPassages:3});
 const truncated=excerpts.length!==1||excerpts[0].start!==0||excerpts[0].end!==text.length;
 const quote=truncated?['以下仅为按问题词项匹配或分布式预览选取的片段，未阅读全文。',...excerpts.map(e=>`[原文位置 ${e.start}–${e.end}]\n${e.quote}`)].join('\n\n'):text;
 return {quote,excerpts,sourceField:reading.field,totalCharacters:text.length,truncated};
}
