import {z} from 'zod';
import {db,get,save,transaction} from '../../store.mjs';
import {payloadHash} from '../../core/device-auth.mjs';
import {validateTransaction,bad} from './accounting.mjs';
export function saveAccountingTransaction(id,input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw bad('账单格式无效。');
 const {opId,...body}=input;
 if(opId!==undefined&&!z.string().min(8).max(100).safeParse(opId).success)throw bad('账单操作编号无效。');
 const key=opId?'accounting-save:'+opId:null,hash=payloadHash({id:id||null,body});
 return transaction(()=>{
  const receipt=key?db.prepare('SELECT result FROM operations WHERE id=?').get(key):null;
  if(receipt){const prior=JSON.parse(receipt.result);if(prior.hash!==hash)throw bad('此操作编号已用于其他账单内容。',409);if(!get(prior.result.id,'transaction'))throw bad('这次保存的账单已删除，不会再次创建。',410);return prior.result;}
  const old=id?get(id,'transaction'):null;if(id&&!old)throw bad('账单不存在或已删除。',404);
  if(id&&(!Number.isInteger(body.revision)||body.revision<1))throw bad('请携带账单版本后再保存。');
  const result=save('transaction',validateTransaction(body,old||{}),id?body.revision:undefined);
  if(key)db.prepare('INSERT INTO operations(id,result) VALUES(?,?)').run(key,JSON.stringify({hash,result}));
  return result;
 });
}
