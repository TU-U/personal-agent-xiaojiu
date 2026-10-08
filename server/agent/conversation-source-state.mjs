import {noteReadableText} from '../domain/shared/source-content.mjs';
export function conversationSourceIssue(source,kind){
 if(!source)return '来源已删除，请移除后重新选择。';
 if(kind==='libraryFile'&&source.status!=='ready')return '资料尚未解析完成或已不可用，请先到资料库处理。';
 const transcript=kind==='note'&&source.transcript?.segments?.some(segment=>typeof segment.text==='string'&&segment.text.trim());
 if(kind==='note'&&source.status==='needs_text'&&source.summaryMode!=='ai'&&!transcript)return '还没有可引用的文字，请先补充内容或完成录音转写。';
 const text=kind==='note'?noteReadableText(source)||source.summary:kind==='event'?source.summary||source.title:source.content||source.summary;
 return typeof text==='string'&&text.trim()?'':'还没有可引用的文字，请先补充内容。';
}
