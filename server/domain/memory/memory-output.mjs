import {z} from 'zod';
const conflictSchema=z.strictObject({
 conflictId:z.string().trim().min(1).nullable(),
 kind:z.enum(['duplicate','update','contradiction']).optional(),
 reason:z.string().trim().min(1).max(1000).optional(),
});
export function parseMemoryConflict(raw,candidates){
 const fail=message=>Object.assign(new Error('记忆冲突检查失败：'+message+'；候选仍保留，请重试。'),{status:502});
 let value;
 try{value=JSON.parse(String(raw??'').replace(/^```(?:json)?\s*|\s*```$/g,''));}catch{throw fail('模型没有返回有效JSON');}
 const parsed=conflictSchema.safeParse(value);
 if(!parsed.success)throw fail('结果字段缺失、类型错误或包含未知字段');
 const result=parsed.data;
 if(result.conflictId===null){
  if(result.kind!==undefined||result.reason!==undefined)throw fail('无冲突结论与附带冲突依据不一致');
  return null;
 }
 const target=candidates.find(memory=>memory.id===result.conflictId);
 if(!target)throw fail('模型引用了本次检查之外的记忆');
 if(!result.kind||!result.reason)throw fail('有冲突结论缺少分类或依据');
 return {...target,conflictKind:result.kind,conflictReason:result.reason};
}
const proposalsSchema=z.strictObject({items:z.array(z.strictObject({content:z.string().trim().min(1).max(300),conflictId:z.null().optional()})).max(3)});
export function parseMemoryProposals(raw){
 let value;
 try{value=JSON.parse(String(raw??'').replace(/^```(?:json)?\s*|\s*```$/g,''));}catch{throw new Error('模型没有返回有效JSON');}
 const parsed=proposalsSchema.safeParse(value);
 if(!parsed.success)throw new Error('记忆候选格式无效：最多3条，每条1至300字，不允许模型设置状态或冲突对象');
 return parsed.data.items.map(({content})=>({content}));
}
