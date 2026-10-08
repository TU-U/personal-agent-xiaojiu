import {db,get,transaction} from '../../store.mjs';
import {payloadHash} from '../../core/device-auth.mjs';
export function memoryOperation(action,opId,body){
 const key=opId?'memory-operation:'+opId:null,hash=payloadHash({action,body});
 const load=()=>{
  if(!key)return null;const row=db.prepare('SELECT result FROM operations WHERE id=?').get(key);if(!row)return null;
  const record=JSON.parse(row.result);if(record.hash!==hash)throw Object.assign(new Error('此记忆操作编号已用于其他内容。'),{status:409});
  if(!get(record.result.id||record.result.memory?.id,'memory'))throw Object.assign(new Error('本次操作的记忆已删除，不会重复创建。'),{status:410});
  return record.result;
 };
 const unwrap=result=>{if(result?.conflict)throw Object.assign(new Error('发现记忆冲突，请核对新旧内容后选择。'),{status:409,current:result});return result;};
 return {cached:load(),unwrap,commit:fn=>transaction(()=>{
  const cached=load();if(cached)return cached;
  const result=fn();if(key)db.prepare('INSERT INTO operations(id,result) VALUES(?,?)').run(key,JSON.stringify({hash,result}));return result;
 })};
}
