import {db,get,transaction} from '../store.mjs';
import {payloadHash} from '../core/device-auth.mjs';
const pending=new Map();
const fail=(message,status)=>Object.assign(new Error(message),{status});
// Completed request ID and conversation commit together. Concurrent callers in this
// API process share one generation; a restart reuses any committed conversation.
export async function conversationRequest(body,work){
 if(!body||typeof body!=='object'||Array.isArray(body))throw fail('发送内容格式无效。',400);
 const op=body.opId;if(op===undefined)return work(fn=>transaction(fn));
 if(typeof op!=='string'||op.length<8||op.length>100)throw fail('发送操作标识无效。',400);
 const key='conversation-send:'+op,hash=payloadHash(body);
 const cached=()=>{const row=db.prepare('SELECT result FROM operations WHERE id=?').get(key);if(!row)return null;const stored=JSON.parse(row.result);const turn=get(stored.id,'conversation');if(!turn)throw fail('本次发送的对话已删除，不会重复创建。',410);if(stored.hash!==hash)throw fail('同一发送标识不能用于不同问题、话题或引用。',409);return turn;};
 const old=cached();if(old)return old;
 const running=pending.get(key);if(running){if(running.hash!==hash)throw fail('发送中的请求与本次内容不同。',409);return running.promise;}
 const promise=Promise.resolve().then(()=>work(fn=>transaction(()=>{const existing=cached();if(existing)return existing;const turn=fn();db.prepare('INSERT INTO operations(id,result) VALUES(?,?)').run(key,JSON.stringify({hash,id:turn.id}));return turn;})));
 pending.set(key,{hash,promise});try{return await promise;}finally{if(pending.get(key)?.promise===promise)pending.delete(key);}
}
