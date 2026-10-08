import {BaseCheckpointSaver,WRITES_IDX_MAP,copyCheckpoint} from '@langchain/langgraph-checkpoint';

function identity(config,{checkpoint=false}={}){
 const {thread_id:thread,checkpoint_ns:namespace='',checkpoint_id:id}=config.configurable||{};
 if(typeof thread!=='string'||!thread||thread.length>255||typeof namespace!=='string'||namespace.length>1000||id!==undefined&&(typeof id!=='string'||!id)||checkpoint&&!id)throw new Error('研究检查点标识无效。');
 return {thread,namespace,id};
}
const configFor=(thread,namespace,id)=>({configurable:{thread_id:thread,checkpoint_ns:namespace,checkpoint_id:id}});
// Uses the same SQLite database as business records. No extra long-term-memory store.
// Instantiate only after deployment backup; no schema changes happen on import.
export class ResearchCheckpointSaver extends BaseCheckpointSaver{
 constructor(db,{assertWritable=()=>{}}={}){
  super();this.db=db;this.assertWritable=assertWritable;
  db.exec(`CREATE TABLE IF NOT EXISTS research_checkpoints (
   thread_id TEXT NOT NULL,namespace TEXT NOT NULL,checkpoint_id TEXT NOT NULL,parent_id TEXT,
   checkpoint_type TEXT NOT NULL,checkpoint BLOB NOT NULL,metadata_type TEXT NOT NULL,metadata BLOB NOT NULL,
   PRIMARY KEY(thread_id,namespace,checkpoint_id));
   CREATE TABLE IF NOT EXISTS research_checkpoint_writes (
   thread_id TEXT NOT NULL,namespace TEXT NOT NULL,checkpoint_id TEXT NOT NULL,task_id TEXT NOT NULL,write_index INTEGER NOT NULL,
   channel TEXT NOT NULL,value_type TEXT NOT NULL,value BLOB NOT NULL,
   PRIMARY KEY(thread_id,namespace,checkpoint_id,task_id,write_index));`);
 }
 atomic(fn,write=false){const outer=write&&!this.db.isTransaction;this.db.exec(outer?'BEGIN IMMEDIATE':'SAVEPOINT research_checkpoint_change');try{const result=fn();this.db.exec(outer?'COMMIT':'RELEASE research_checkpoint_change');return result;}catch(error){this.db.exec(outer?'ROLLBACK':'ROLLBACK TO research_checkpoint_change; RELEASE research_checkpoint_change');throw error;}}
 async getTuple(config){
  const {thread,namespace,id}=identity(config);
  const snapshot=this.atomic(()=>{
   const row=id?this.db.prepare('SELECT * FROM research_checkpoints WHERE thread_id=? AND namespace=? AND checkpoint_id=?').get(thread,namespace,id):this.db.prepare('SELECT * FROM research_checkpoints WHERE thread_id=? AND namespace=? ORDER BY checkpoint_id DESC LIMIT 1').get(thread,namespace);
   if(!row)return null;
   return {row,writes:this.db.prepare('SELECT * FROM research_checkpoint_writes WHERE thread_id=? AND namespace=? AND checkpoint_id=? ORDER BY task_id,write_index').all(thread,namespace,row.checkpoint_id)};
  });
  if(!snapshot)return undefined;const {row,writes}=snapshot;
  const checkpoint=await this.serde.loadsTyped(row.checkpoint_type,row.checkpoint);
  if(checkpoint.v!==4)throw new Error('研究检查点格式版本不兼容，未自动迁移或恢复。');
  return {config:configFor(thread,namespace,row.checkpoint_id),checkpoint,metadata:await this.serde.loadsTyped(row.metadata_type,row.metadata),pendingWrites:await Promise.all(writes.map(async write=>[write.task_id,write.channel,await this.serde.loadsTyped(write.value_type,write.value)])),...(row.parent_id?{parentConfig:configFor(thread,namespace,row.parent_id)}:{})};
 }
 async *list(config,options={}){
  const {thread,namespace,id}=identity(config),before=options.before?.configurable?.checkpoint_id;
  let remaining=options.limit??Infinity;if(remaining!==Infinity&&(!Number.isInteger(remaining)||remaining<0))throw new Error('检查点读取数量无效。');
  const rows=this.db.prepare('SELECT checkpoint_id FROM research_checkpoints WHERE thread_id=? AND namespace=? ORDER BY checkpoint_id DESC').all(thread,namespace);
  for(const row of rows){
   if(!remaining)break;if(id&&row.checkpoint_id!==id||before&&row.checkpoint_id>=before)continue;
   const tuple=await this.getTuple(configFor(thread,namespace,row.checkpoint_id));if(!tuple)continue;
   if(options.filter&&!Object.entries(options.filter).every(([key,value])=>JSON.stringify(tuple.metadata?.[key])===JSON.stringify(value)))continue;
   remaining--;yield tuple;
  }
 }
 async put(config,checkpoint,metadata){
  const {thread,namespace,id}=identity(config);if(checkpoint.v!==4||typeof checkpoint.id!=='string'||!checkpoint.id)throw new Error('研究检查点格式无效。');
  const [[type,bytes],[metaType,meta]]=await Promise.all([this.serde.dumpsTyped(copyCheckpoint(checkpoint)),this.serde.dumpsTyped(metadata)]);
  this.atomic(()=>{this.assertWritable();this.db.prepare(`INSERT INTO research_checkpoints VALUES(?,?,?,?,?,?,?,?)
   ON CONFLICT(thread_id,namespace,checkpoint_id) DO UPDATE SET parent_id=excluded.parent_id,checkpoint_type=excluded.checkpoint_type,checkpoint=excluded.checkpoint,metadata_type=excluded.metadata_type,metadata=excluded.metadata`).run(thread,namespace,checkpoint.id,id||null,type,bytes,metaType,meta);},true);
  return configFor(thread,namespace,checkpoint.id);
 }
 async putWrites(config,writes,taskId){
  const {thread,namespace,id}=identity(config,{checkpoint:true});if(typeof taskId!=='string'||!taskId)throw new Error('检查点步骤标识无效。');
  const values=await Promise.all(writes.map(async([channel,value],index)=>({channel,index:WRITES_IDX_MAP[channel]??index,serialized:await this.serde.dumpsTyped(value)})));
  this.atomic(()=>{this.assertWritable();for(const item of values){
   const conflict=item.index<0?'DO UPDATE SET channel=excluded.channel,value_type=excluded.value_type,value=excluded.value':'DO NOTHING';
   this.db.prepare(`INSERT INTO research_checkpoint_writes VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(thread_id,namespace,checkpoint_id,task_id,write_index) ${conflict}`).run(thread,namespace,id,taskId,item.index,item.channel,...item.serialized);
  }},true);
 }
 async deleteThread(thread){
  identity({configurable:{thread_id:thread}});
  this.atomic(()=>{this.assertWritable();this.db.prepare('DELETE FROM research_checkpoint_writes WHERE thread_id=?').run(thread);this.db.prepare('DELETE FROM research_checkpoints WHERE thread_id=?').run(thread);},true);
 }
}
