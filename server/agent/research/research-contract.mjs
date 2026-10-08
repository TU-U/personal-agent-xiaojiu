import {z} from 'zod';
const text=max=>z.string().trim().min(1).max(max);
export const researchRef=z.strictObject({kind:z.enum(['note','event','libraryFile']),id:text(100),revision:z.number().int().positive()});
export const researchCreate=z.strictObject({executionMode:z.literal('research'),opId:text(100).min(8),threadId:z.string().max(100).default(''),references:z.array(researchRef).max(8).default([]).refine(refs=>new Set(refs.map(r=>r.kind+':'+r.id)).size===refs.length,'重复引用'),researchBrief:z.strictObject({topic:text(500),background:z.string().max(6000).default(''),questions:z.array(text(500)).min(1).max(8),constraints:z.string().max(4000).default(''),type:z.enum(['learning','comparison','feasibility','custom']),asOf:z.string().max(100).default(''),expectedOutput:text(2000),web:z.boolean().default(true)})});
export const researchPlanSchema=z.strictObject({goal:text(1000),conditions:text(6000),known:z.array(text(1000)).max(12),unknown:z.array(text(1000)).max(12),steps:z.array(text(1000)).min(1).max(8),deliverable:text(2000)});
export const reportSections=type=>type==='learning'?['conclusion','concepts','path','exercise','unknown']:['conclusion','facts','comparison','conditions','risks','validation','unknown'];
export const reportHeadings={conclusion:'结论',concepts:'概念与前置知识',path:'最短学习路径',exercise:'小练习',facts:'事实依据',comparison:'选项比较',conditions:'适用条件',risks:'风险与未知',validation:'最小验证动作',unknown:'来源限制与待核实项'};
const paragraph=z.strictObject({text:text(4000),basis:z.enum(['evidence','model_knowledge']),sourceIds:z.array(text(100)).max(8)});
const reportSchema=z.strictObject({sections:z.array(z.strictObject({key:z.enum(Object.keys(reportHeadings)),paragraphs:z.array(paragraph).min(1).max(12)})).max(7),coverage:z.array(z.strictObject({questionId:text(10),status:z.enum(['answered','partial','missing']),reason:text(1000)})).min(1).max(8),actions:z.array(z.strictObject({title:text(160),description:text(2000),kind:z.enum(['action','event'])})).max(8)});
export function parseResearchJson(raw,schema,label){
 let data;try{data=JSON.parse(String(raw).replace(/^```(?:json)?\s*|\s*```$/g,''));}catch{throw Object.assign(new Error(`${label}不是有效 JSON，已保留进度，请重试。`),{status:502,code:'RESEARCH_OUTPUT'});}
 const result=schema.safeParse(data);if(result.success)return result.data;
 // Only schema-owned names and numeric positions are exposed, never model values or unknown keys.
 const names={goal:'目标',conditions:'条件',known:'已知信息',unknown:'待核实信息',steps:'步骤',deliverable:'交付物',sections:'章节',key:'章节类型',paragraphs:'段落',text:'正文',basis:'依据类型',sourceIds:'来源编号',coverage:'问题覆盖',questionId:'问题编号',status:'覆盖状态',reason:'说明',actions:'候选事项',title:'标题',description:'描述',kind:'候选类型'};
 const fields=[...new Set(result.error.issues.map(issue=>issue.path.map(part=>typeof part==='number'?`第${part+1}项`:Object.hasOwn(names,part)?names[part]:'字段').join(' / ')||'整体结构'))];
 throw Object.assign(new Error(`${label}格式无效，请检查：${fields.join('、')}。缺失或不符合要求的内容未自动补写，请重新生成。`),{status:502,code:'RESEARCH_OUTPUT',fields});
}
export function parseResearchReport(raw,brief,evidence){
 const report=parseResearchJson(raw,reportSchema,'AI 调研报告'),expected=reportSections(brief.type),ids=new Set(evidence.map(e=>e.id));
 const fail=message=>{throw Object.assign(new Error(message),{status:502,code:'RESEARCH_OUTPUT'});};
 if(report.sections.length!==expected.length||report.sections.some((s,i)=>s.key!==expected[i]))fail('AI 调研报告缺少约定章节或顺序有误。');
 const questions=brief.questions.map((_,i)=>'Q'+(i+1));
 if(report.coverage.length!==questions.length||report.coverage.some(c=>!questions.includes(c.questionId))||new Set(report.coverage.map(c=>c.questionId)).size!==questions.length)fail('AI 问题覆盖表与已确认问题不一致。');
 for(const section of report.sections)for(const p of section.paragraphs){
  if(p.sourceIds.some(id=>!ids.has(id))||new Set(p.sourceIds).size!==p.sourceIds.length)fail('AI 引用了本次未取得或重复的证据编号。');
  if(p.basis==='evidence'&&!p.sourceIds.length||p.basis==='model_knowledge'&&p.sourceIds.length)fail('AI 结论的来源类型与引用不一致。');
 }
 return {...report,coverage:questions.map(id=>report.coverage.find(c=>c.questionId===id))};
}
export function renderResearchReport(report,brief,evidence,fallback){
 const sourceLabel=id=>{const source=evidence.find(e=>e.id===id);return id+(source?.evidenceType==='search_snippet'?'（仅搜索摘要，不代表网页全文）':source?.evidenceType==='web_page'?'（已取得网页文字，结论仍需核对）':source?.evidenceType==='user_fill'?'（用户回填，未独立核验）':'（本地原文）');};
 const lines=['# '+brief.topic,'',...(fallback?['> '+fallback,'']:[]),'## 本次问题','',...brief.questions.map((q,i)=>`${i+1}. ${q}`),''];
 for(const section of report.sections){lines.push('## '+reportHeadings[section.key],'');for(const p of section.paragraphs)lines.push(p.text,'',p.basis==='progress'?'*程序保留的阶段状态，尚未完成分析*':p.basis==='model_knowledge'?'*模型已有知识，未联网核验*':`*依据本次材料：${p.sourceIds.map(sourceLabel).join('、')}；引用存在不代表结论已获独立核验*`,'');}
 lines.push('## 问题覆盖','');for(const c of report.coverage)lines.push(`- ${c.questionId} · ${{answered:'已回答',partial:'部分回答',missing:'缺少证据'}[c.status]}：${c.reason}`);
 lines.push('','## 来源与获取时间','');for(const source of evidence){if(source.retainedFromPrevious)lines.push(`- ${source.id} · 沿用此前材料（保留原获取时间，非本轮重新取材）`);if(source.kind==='web'){lines.push(`- ${source.id} · ${source.title} · ${source.evidenceType==='web_page'?'网页文字':'搜索摘要'} · ${source.url} · 获取于 ${source.retrievedAt} · 第 ${source.start+1}–${source.end} 字${source.truncated?'（仅片段）':''}${source.contentHash?' · 正文SHA256 '+source.contentHash:''}`);continue;}lines.push(`- ${source.id} · ${source.title} · 版本 ${source.revision} · 第 ${source.start+1}–${source.end} 字 · ${source.evidenceType==='user_fill'?'用户回填于 '+source.providedAt+'，链接未由应用读取/核验':source.retrievedAt}${source.truncated?'（仅引用片段）':''}${source.sourceField==='summary'?'；位置位于来源摘要字段':source.sourceField==='transcriptContent'?'；位置位于正文与带时间戳的录音转写合并阅读文本，识别仍需核对':''}${source.selectionMethod==='hybrid_search'?'；语义与词项混合检索片段':source.selectionMethod==='keyword_scan'?'；按问题关键词扫描全文选段，未作完整语义分析':source.selectionMethod==='distributed_preview'?'；未匹配问题关键词，仅提供分布式预览':''}`);}
 for(const source of evidence.filter(s=>s.evidenceType==='user_fill'))lines.push(`  ${source.id} 所附链接：${source.urls?.length?source.urls.join('、'):'未提供来源链接'}`);
 if(!evidence.length)lines.push(report.sections.every(s=>s.paragraphs.every(p=>p.basis==='progress'))?'本次尚未完成证据分析，暂时不能作出结论。':'本次没有可引用的原文证据；以上知识内容均未联网核验。');
 return lines.join('\n');
}
