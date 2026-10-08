// Exact source slices only: selection is a lexical scan, never a claim that
// the model has read the entire document or that semantic search succeeded.
const segmenter=new Intl.Segmenter('zh-CN',{granularity:'word'});
const stop=new Set(['的','了','是','和','与','在','什么','如何','怎么','是否','为什么','哪些','一个','需要','可以','the','a','an','is','are','how','what','and','of','to']);
const terms=text=>[...new Set([...segmenter.segment(String(text).toLowerCase())].filter(s=>s.isWordLike&&!stop.has(s.segment)).map(s=>s.segment))];
export function selectResearchPassages(text,brief,{assertActive=()=>{},maxPassages=8}={}){
 if(!Number.isInteger(maxPassages)||maxPassages<1||maxPassages>8)throw new Error('选段数量无效。');
 assertActive();
 // Keep each selected passage below the report's per-evidence byte cap;
 // otherwise a medium Chinese document becomes one item whose tail is lost.
 if(text.length<=1000)return [{start:0,end:text.length,quote:text,selectionMethod:'full_text',matchedQuestions:[]}];
 const queries=(brief.questions||[]).map(terms),topic=terms(brief.topic||'');
 const chunks=[];
 // Overlap protects a sentence/query match at the artificial boundary. Each
 // selected slice is at most 1000 UTF-16 units; eight slices fit the old cap.
 for(let start=0;start<text.length;){
  assertActive();let end=Math.min(start+1000,text.length);
  if(end<text.length){const newline=text.lastIndexOf('\n',end-1);if(newline>start+500)end=newline+1;}
  const quote=text.slice(start,end),lower=quote.toLowerCase();
  chunks.push({start,end,quote,hits:queries.map(q=>q.filter(t=>lower.includes(t))),topicHits:topic.filter(t=>lower.includes(t)).length});
  if(end===text.length)break;start=end-100;
 }
 const frequency=new Map();for(const c of chunks){assertActive();for(const t of new Set(c.hits.flat()))frequency.set(t,(frequency.get(t)||0)+1);}
 const score=(c,q)=>c.hits[q].reduce((sum,t)=>sum+1+Math.log(chunks.length/(frequency.get(t)||1)),0);
 const selected=new Set();
 // Give every user question a first chance before filling spare capacity.
 for(let q=0;q<queries.length&&selected.size<maxPassages;q++){
  assertActive();let best,bestScore=0;for(const c of chunks){const value=score(c,q);if(value>bestScore){best=c;bestScore=value;}}
  if(best)selected.add(best);
 }
 const ranked=chunks.map(c=>({c,score:c.hits.reduce((sum,_,q)=>sum+score(c,q),0)+c.topicHits*.25})).sort((a,b)=>b.score-a.score||a.c.start-b.c.start);
 for(const item of ranked){assertActive();if(selected.size>=maxPassages||item.score<=0)break;selected.add(item.c);}
 // With no lexical match, provide distributed previews, explicitly labelled.
 if(!selected.size)for(let i=0;i<maxPassages;i++)selected.add(chunks[Math.round(i*(chunks.length-1)/Math.max(1,maxPassages-1))]);
 return [...selected].sort((a,b)=>a.start-b.start).map(c=>({start:c.start,end:c.end,quote:c.quote,selectionMethod:c.hits.some(h=>h.length)||c.topicHits?'keyword_scan':'distributed_preview',matchedQuestions:c.hits.flatMap((h,i)=>h.length?['Q'+(i+1)]:[])}));
}
export function collectResearchEvidence(input,brief,{taskId,assertActive=()=>{},now=()=>new Date().toISOString()}={}){
 const result=[];
 const append=(source,index,external)=>{
  const text=external?source.text:source.content,parts=selectResearchPassages(text,brief,{assertActive});
  for(const [partIndex,part] of parts.entries())result.push({id:(external?'X':'E')+(index+1)+(partIndex?'.'+(partIndex+1):''),sourceId:source.id,kind:external?'researchExternal':source.kind,title:source.title,revision:source.revision,...part,total:text.length,truncated:part.start!==0||part.end!==text.length,...(external?{taskId,evidenceType:'user_fill',verificationStatus:'unverified',providedAt:source.providedAt,urls:source.urls}:{evidenceType:'original',retrievedAt:now()})});
 };
 input.sources.forEach((s,i)=>append(s,i,false));input.externalSources.forEach((s,i)=>append(s,i,true));assertActive();return result;
}
