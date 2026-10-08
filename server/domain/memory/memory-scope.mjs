import {z} from 'zod';
import {db,get} from '../../store.mjs';
export const memoryScopeFields={scopeKind:z.enum(['global','project','thread']).optional(),scopeId:z.string().max(200).optional()};
export function memoryScope(memory){return {scopeKind:memory.scopeKind==='legacy'?'global':memory.scopeKind||'global',scopeId:memory.scopeId||'',scope:memory.scope||'通用'};}
function thread(id){return get(id,'thread')||get('thread-state:'+id,'thread');}
export function memoryScopeIssue(memory){
 const {scopeKind,scopeId,scope}=memoryScope(memory);
 if(!['通用','周报','文章'].includes(scope))return '记忆用途无效。';
 if(scopeKind==='global')return scopeId?'全局记忆不能携带项目或话题ID。':'';
 if(scopeKind==='project')return scopeId&&get(scopeId,'project')?'':'记忆所属项目不存在或已删除。';
 if(scopeKind==='thread')return scopeId&&thread(scopeId)?.status!=='deleted'&&(thread(scopeId)||db.prepare("SELECT 1 FROM entities WHERE kind='conversation' AND deleted=0 AND (json_extract(data,'$.threadId')=? OR id=?) LIMIT 1").get(scopeId,scopeId))?'':'记忆所属话题不存在或已删除。';
 return '记忆范围类型无效。';
}
export function requireMemoryScope(memory){const issue=memoryScopeIssue(memory);if(issue)throw Object.assign(new Error(issue),{status:422});return memoryScope(memory);}
export function memoryScopesOverlap(a,b){
 if(memoryScopeIssue(a)||memoryScopeIssue(b))return false;
 const left=memoryScope(a),right=memoryScope(b);
 if(left.scope!=='通用'&&right.scope!=='通用'&&left.scope!==right.scope)return false;
 if(left.scopeKind==='global'||right.scopeKind==='global')return true;
 if(left.scopeKind===right.scopeKind)return left.scopeId===right.scopeId;
 // A thread may be used with a project filter; without an explicit immutable
 // project binding, do not assume these two scopes can never intersect.
 return true;
}
