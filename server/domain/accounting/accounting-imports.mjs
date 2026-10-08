import {createHash,randomUUID} from 'node:crypto';
import {open,readFile,unlink} from 'node:fs/promises';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {z} from 'zod';
import {DATA_DIR,db,get,save,transaction} from '../../store.mjs';
import {parseAccountingWorkbook} from './accounting-import-parser.mjs';
import {bad} from './accounting.mjs';
import {parseAccountingScreenshot} from './accounting-ocr.mjs';
const parseOriginal=(bytes,original)=>original.mime.startsWith('image/')?parseAccountingScreenshot(bytes,original.mime):parseAccountingWorkbook(bytes);

const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const uploadInput=z.strictObject({opId:z.string().min(8).max(100)});
const paging=z.strictObject({offset:z.string().regex(/^\d+$/).optional(),limit:z.string().regex(/^\d+$/).optional()});
function requireBatch(id){const batch=get(id,'accountingImport');if(!batch)throw bad('导入批次不存在或已删除。',404);return batch;}
function originalPath(original){if(!/^accounting-[0-9a-f-]{36}\.(?:xlsx|png|jpg|jpeg|webp)$/.test(original?.key||''))throw bad('账单原件标识无效。',409);return path.join(DATA_DIR,'uploads',original.key);}
function publicOriginal(batch){const {key,...original}=batch.original;return {...original,url:`/api/accounting/imports/${encodeURIComponent(batch.id)}/original`};}
export function accountingImportView(id,{offset=0,limit=100}={}){
 if(!Number.isSafeInteger(offset)||offset<0||!Number.isSafeInteger(limit)||limit<1||limit>200)throw bad('账单行分页参数无效。');
 const batch=requireBatch(id),{rows=[],duplicateGroups=[],...rest}=batch;
 const page=rows.slice(offset,offset+limit),groupIds=new Set(page.flatMap(row=>row.duplicateCandidates.map(candidate=>candidate.groupId)));
 return {...rest,original:publicOriginal(batch),rows:page,duplicateGroups:duplicateGroups.filter(group=>groupIds.has(group.id)),offset,limit,totalRows:rows.length};
}
export function listAccountingImports({offset=0,limit=100}={}){
 if(!Number.isSafeInteger(offset)||offset<0||!Number.isSafeInteger(limit)||limit<1||limit>200)throw bad('批次分页参数无效。');
 // Do not load all raw rows for the batch picker.
 return db.prepare("SELECT id,revision,updated_at,json_remove(data,'$.rows','$.duplicateGroups','$.metadataRows') data FROM entities WHERE kind='accountingImport' AND deleted=0 ORDER BY updated_at DESC,id LIMIT ? OFFSET ?").all(limit,offset).map(row=>{const batch={...JSON.parse(row.data),id:row.id,revision:row.revision,updatedAt:row.updated_at};return {...batch,original:publicOriginal(batch)};});
}
function operationResult(key,signature){const previous=db.prepare('SELECT result FROM operations WHERE id=?').get(key);if(!previous)return null;const receipt=JSON.parse(previous.result);if(receipt.signature!==signature)throw bad('同一上传操作编号对应的文件已变化，请使用新的上传操作。',409);return requireBatch(receipt.batchId);}
export async function createAccountingImport(file,body,{parse=parseOriginal}={}){
 const parsed=uploadInput.safeParse(body);if(!parsed.success)throw bad('缺少有效上传操作编号，或上传字段无效。');
 if(!file||!Buffer.isBuffer(file.buffer)||file.buffer.length<4||file.buffer.length>12*1024*1024)throw bad('请选择不超过12MB的Excel账单或PNG/JPG/WebP截图。');
 const name=path.basename(String(file.originalname||'').replaceAll('\\','/'));
 const extension=path.extname(name).toLowerCase(),mimes={'.xlsx':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp'};
 // Reject control characters in uploaded filenames; the range is intentional.
 // eslint-disable-next-line no-control-regex
 if(!mimes[extension]||name.length>240||/[\x00-\x1f\x7f]/.test(name))throw bad('请选择.xlsx账单或PNG/JPG/WebP截图。');
 const bytes=file.buffer,mime=mimes[extension];
 if(mime.startsWith('image/')){const valid=mime==='image/png'?bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):mime==='image/jpeg'?bytes[0]===255&&bytes[1]===216:bytes.subarray(0,4).toString()==='RIFF'&&bytes.subarray(8,12).toString()==='WEBP';if(!valid)throw bad('截图内容与文件类型不符，请重新选择。');}
 const original={key:`accounting-${randomUUID()}${extension}`,name,mime,size:bytes.length,sha256:digest(bytes)};
 const signature=digest(JSON.stringify({name,size:original.size,sha256:original.sha256})),operationKey='accounting-upload:'+parsed.data.opId;
 const replay=operationResult(operationKey,signature);if(replay)return accountingImportView(replay.id);
 const location=originalPath(original),handle=await open(location,'wx',0o600);
 try{try{await handle.writeFile(file.buffer);await handle.sync();}finally{await handle.close();}}catch(error){await unlink(location).catch(()=>{});throw error;}
 let batch,created=false;
 try{
  batch=transaction(()=>{
   const concurrent=operationResult(operationKey,signature);if(concurrent)return concurrent;
   const value=save('accountingImport',{status:'parsing',parsingStartedAt:Date.now(),original,rows:[],duplicateGroups:[],error:'',notice:'原件已保存，正在逐行解析；尚未确认入账。'});
   db.prepare('INSERT INTO operations(id,result) VALUES(?,?)').run(operationKey,JSON.stringify({signature,batchId:value.id}));created=true;return value;
  });
 }catch(error){await unlink(location).catch(()=>{});throw error;}
 if(!created){await unlink(location).catch(()=>{});return accountingImportView(batch.id);}
 return parseBatch(batch,file.buffer,parse);
}
async function parseBatch(batch,buffer,parse){
 // The original and batch already exist before parsing. Parse failures must
 // not erase the file, raw evidence, or a visible/recoverable error state.
 let result,error;
 try{result=await parse(buffer,batch.original);}catch(caught){error=caught;}
 transaction(()=>{
  const current=requireBatch(batch.id);if(current.revision!==batch.revision)throw bad('导入批次已变化，旧解析结果未覆盖当前内容。',409);
  save('accountingImport',{...current,...(error?{status:'parse_failed',parsingFinishedAt:Date.now(),error:error.status?error.message:'账单解析失败，原件已保留。',notice:'原件已保留，尚未入账。'}:{...result,status:'review',parsingFinishedAt:Date.now(),error:'',notice:'逐行解析已保存，等待人工核对；尚未确认入账。'})},current.revision);
 });
 return accountingImportView(batch.id);
}
export function assertAccountingOriginal(id){
 const batch=requireBatch(id);let bytes;
 try{bytes=readFileSync(originalPath(batch.original));}catch(error){if(error.status)throw error;throw bad('原账单文件暂时不可用，未提交入账。',409);}
 if(bytes.length!==batch.original.size||digest(bytes)!==batch.original.sha256)throw bad('原账单内容已变化，未提交入账。',409);
}
export async function accountingImportOriginal(id){
 const batch=requireBatch(id);let bytes;
 try{bytes=await readFile(originalPath(batch.original));}catch(error){if(error.status)throw error;throw bad('原账单文件暂时不可用，请检查备份或恢复文件。',404);}
 if(bytes.length!==batch.original.size||digest(bytes)!==batch.original.sha256)throw bad('原账单内容与保存时不一致，未返回被改动的文件。',409);
 return {bytes,name:batch.original.name,mime:batch.original.mime};
}
export async function reparseAccountingImport(id,body,{parse=parseOriginal,now=Date.now()}={}){
 const checked=z.strictObject({opId:z.string().min(8).max(100),revision:z.number().int().positive()}).safeParse(body);
 if(!checked.success)throw bad('重试需要有效操作编号和批次版本。');
 const signature=digest(JSON.stringify({id,revision:checked.data.revision})),key='accounting-reparse:'+checked.data.opId;
 const replay=operationResult(key,signature);if(replay)return accountingImportView(replay.id);
 const original=await accountingImportOriginal(id);
 const batch=transaction(()=>{
  const concurrent=operationResult(key,signature);if(concurrent)return {replay:true,id:concurrent.id};
  const current=requireBatch(id);
  if(current.revision!==checked.data.revision)throw bad('批次版本已变化，请刷新后再重试。',409);
  if(current.status!=='parse_failed'&&!(current.status==='parsing'&&now-(current.parsingStartedAt||0)>=60000))throw bad('批次仍在解析或已有待核对结果，不重复解析。',409);
  const result=save('accountingImport',{...current,status:'parsing',parsingStartedAt:now,error:'',notice:'正在重新解析已保存原件，尚未入账。'},current.revision);
  db.prepare('INSERT INTO operations(id,result) VALUES(?,?)').run(key,JSON.stringify({signature,batchId:id}));return result;
 });
 return batch.replay?accountingImportView(batch.id):parseBatch(batch,original.bytes,parse);
}
export function installAccountingImports(app,upload){
 app.get('/api/accounting/imports',(req,res)=>{const parsed=paging.safeParse(req.query);if(!parsed.success)throw bad('批次分页参数无效。');const offset=Number(parsed.data.offset||0),limit=Number(parsed.data.limit||100),imports=listAccountingImports({offset,limit}),total=db.prepare("SELECT count(*) n FROM entities WHERE kind='accountingImport' AND deleted=0").get().n;res.json({imports,total,offset,limit,nextOffset:offset+imports.length<total?offset+imports.length:null});});
 app.post('/api/accounting/imports',upload.single('file'),async(req,res)=>res.status(201).json(await createAccountingImport(req.file,req.body)));
 app.get('/api/accounting/imports/:id',(req,res)=>{const parsed=paging.safeParse(req.query);if(!parsed.success)throw bad('账单行分页参数无效。');res.json(accountingImportView(req.params.id,{offset:Number(parsed.data.offset||0),limit:Number(parsed.data.limit||100)}));});
 app.post('/api/accounting/imports/:id/reparse',async(req,res)=>res.json(await reparseAccountingImport(req.params.id,req.body)));
 app.get('/api/accounting/imports/:id/original',async(req,res)=>{const file=await accountingImportOriginal(req.params.id);res.setHeader('Content-Type',file.mime);res.setHeader('Content-Disposition',`attachment; filename*=UTF-8''${encodeURIComponent(file.name)}`);res.send(file.bytes);});
}
