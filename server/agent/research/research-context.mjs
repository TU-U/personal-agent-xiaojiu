import {REPORT_INPUT_BYTES} from './research-limits.mjs';
// Bound the actual serialized report input, including JSON escaping. This is
// an input-size policy, not a tokenizer or a replacement for the cost ledger.
const bytes=value=>Buffer.byteLength(JSON.stringify(value),'utf8');
const tooLarge=()=>Object.assign(new Error('研究背景与计划已超出本次报告输入范围，保留阶段结果，请缩小问题范围。'),{code:'RESEARCH_BUDGET',status:422});
// Re-rendering an existing report must preserve the ranges actually supplied
// to its model, even if later collection retained larger source snapshots.
export function researchReportEvidence(evidence,context){
 if(!context?.sources)return evidence;
 return context.sources.map(range=>{
  const source=evidence.find(e=>e.id===range.id);
  if(!source||range.start<source.start||range.end>source.end)throw new Error('报告引用范围与已保存证据不一致。');
  const clipped=range.start!==source.start||range.end!==source.end;
  return {...source,start:range.start,end:range.end,quote:source.quote.slice(range.start-source.start,range.end-source.start),...(clipped?{truncated:true,contextExcerpt:true}:{})};
 });
}
function excerpt(source,limit){
 let quote='',used=0;
 for(const char of source.quote){const size=Buffer.byteLength(char,'utf8');if(used+size>limit)break;quote+=char;used+=size;}
 return quote===source.quote?{...source}:{...source,quote,end:source.start+quote.length,truncated:true,contextExcerpt:true};
}
export function buildResearchContext(base,evidence,{maxBytes=REPORT_INPUT_BYTES,excerptBytes=8000}={}){
 if(!Number.isSafeInteger(maxBytes)||maxBytes<1||!Number.isSafeInteger(excerptBytes)||excerptBytes<4)throw new TypeError('Invalid research context limits');
 const groups=new Map();
 // Round-robin by question and evidence type so a long run of local chunks
 // cannot consume the whole input before later questions or web sources.
 for(const source of evidence){const key=(source.matchedQuestions?.[0]||'unassigned')+':'+source.evidenceType;const group=groups.get(key)||[];group.push(source);groups.set(key,group);}
 const ordered=[];for(let index=0;;index++){let found=false;for(const group of groups.values())if(group[index]){ordered.push(group[index]);found=true;}if(!found)break;}
 const selected=[];
 const makeInput=items=>({...base,evidence:items,contextSelection:{available:evidence.length,included:items.length,omitted:evidence.length-items.length,excerpted:items.filter(e=>e.contextExcerpt).length}});
 if(bytes(makeInput([]))>maxBytes)throw tooLarge();
 for(const source of ordered){const candidate=excerpt(source,excerptBytes);if(bytes(makeInput([...selected,candidate]))<=maxBytes)selected.push(candidate);}
 const input=makeInput(selected),notice=input.contextSelection.omitted||input.contextSelection.excerpted?
  `报告输入限额：已保存 ${evidence.length} 条证据，本次模型读取 ${selected.length} 条，其中 ${input.contextSelection.excerpted} 条仅取片段；其余 ${input.contextSelection.omitted} 条未送入模型。完整已取材料仍保存在任务及成果来源中，不能声称全部读完。`:'';
 return {input,evidence:selected,notice,byteLength:bytes(input)};
}
