import {memoryScopeIssue} from './memory-scope.mjs';
import {memorySourceValid} from './memory-source.mjs';
import {libraryMatches} from './library-filters.mjs';
import {get,db} from './store.mjs';
import {threadMetadata,threadUnavailable} from './source-threads.mjs';
import {sourceProjectId} from './categories.mjs';

// Stable project membership and legacy free-text labels remain distinct.
export function retrievalPayload(entity,kind){
 return {project:entity.project||'',projectId:sourceProjectId(entity,kind)||'',
   scopeKind:kind==='memory'?(entity.scopeKind||(entity.scope==='通用'?'global':'legacy')):'',
   scopeId:entity.scopeId||'',purpose:kind==='memory'&&['周报','文章'].includes(entity.scope)?entity.scope:''};
}
export function memoryApplies(entity,{projectId='',threadId='',purpose=''}={}){
 if(entity.status!=='active'||!memorySourceValid(entity)||memoryScopeIssue(entity))return false;
 const scope=retrievalPayload(entity,'memory');
 if(scope.purpose&&scope.purpose!==purpose)return false;
 if(scope.scopeKind==='global')return !scope.scopeId;
 if(scope.scopeKind==='project')return !!projectId&&scope.scopeId===projectId&&!!get(projectId,'project');
 if(scope.scopeKind==='thread')return !!threadId&&scope.scopeId===threadId&&!threadUnavailable(threadId)&&!!(threadMetadata(threadId)||db.prepare("SELECT 1 FROM entities WHERE kind='conversation' AND deleted=0 AND (json_extract(data,'$.threadId')=? OR id=?) LIMIT 1").get(threadId,threadId));
 // Preserve old purpose restrictions; unknown/malformed scope never broadens.
 return scope.scopeKind==='legacy'&&!!scope.purpose&&scope.purpose===purpose;
}
export function sourceApplies(entity,kind,options={}){
 if(kind==='memory')return memoryApplies(entity,options);
 if(kind==='libraryFile'&&(entity.status!=='ready'||options.libraryFilters&&!libraryMatches(entity,options.libraryFilters)))return false;
 if(options.projectId&&(!get(options.projectId,'project')||sourceProjectId(entity,kind)!==options.projectId))return false;
 if(options.project&&entity.project!==options.project)return false;
 return true;
}
const match=(key,value)=>({key,match:{value}});
export function retrievalFilter({project='',projectId='',threadId='',purpose='',kind=''}={}){
 const memoryScopes=[{must:[match('scopeKind','global'),match('scopeId','')]}];
 if(projectId)memoryScopes.push({must:[match('scopeKind','project'),match('scopeId',projectId)]});
 if(threadId)memoryScopes.push({must:[match('scopeKind','thread'),match('scopeId',threadId)]});
 if(purpose)memoryScopes.push({must:[match('scopeKind','legacy'),match('purpose',purpose)]});
 const memory={must:[match('kind','memory'),match('status','active'),{should:memoryScopes},
   {should:[match('purpose',''),...(purpose?[match('purpose',purpose)]:[])]}]};
 const ordinary={must_not:[match('kind','memory')],must:[
   ...(project?[match('project',project)]:[]),...(projectId?[match('projectId',projectId)]:[]),
   {should:[{must_not:[match('kind','libraryFile')]},match('status','ready')]}
 ]};
 return {must:[{should:[ordinary,memory]},...(kind?[match('kind',kind)]:[])]};
}
