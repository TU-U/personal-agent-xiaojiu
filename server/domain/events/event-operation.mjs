import {db,get,transaction} from '../../store.mjs';
import {payloadHash} from '../../core/device-auth.mjs';
export function eventOperation(action,opId,body){
 const key=opId?'event-operation:'+opId:null,hash=payloadHash({action,body});
 const load=()=>{if(!key)return null;const row=db.prepare('SELECT result FROM operations WHERE id=?').get(key);if(!row)return null;const record=JSON.parse(row.result);if(record.hash!==hash)throw Object.assign(new Error('此要事操作编号已用于不同内容。'),{status:409});if(!get(record.result.id,'event'))throw Object.assign(new Error('该要事已删除，原操作不会重新执行。'),{status:410});return record.result;};
 return {cached:load(),commit:fn=>transaction(()=>{const prior=load();if(prior)return prior;const result=fn();if(key)db.prepare('INSERT INTO operations(id,result) VALUES(?,?)').run(key,JSON.stringify({hash,result}));return result;})};
}
