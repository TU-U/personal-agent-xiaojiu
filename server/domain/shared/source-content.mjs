// A derived reading view: never overwrite the user's text or the stored ASR.
export function noteReadableText(note){
 const segments=note.transcript?.segments;
 if(!Array.isArray(segments)||!segments.length)return note.content||'';
 const transcript=segments.map(s=>`[${(s.startMs/1000).toFixed(1)}-${(s.endMs/1000).toFixed(1)}秒 ${s.speakerId?s.speakerId.replace('speaker_','说话人 '):'说话人待核对'}] ${s.text}`).join('\n');
 return [note.content?.trim(),'以下为录音转写，识别可能有误；说话人是匿名编号，不能推断真实身份。',transcript].filter(Boolean).join('\n\n');
}
export function sourceReading(entity,kind){
 if(kind==='note'&&entity.transcript?.segments?.length)return {field:'transcriptContent',text:noteReadableText(entity)};
 return entity.content?{field:'content',text:entity.content}:{field:'summary',text:entity.summary||''};
}
