// Explicit opt-in: real configured text model, synthetic data, isolated DATA_DIR.
import {DatabaseSync} from 'node:sqlite';
import path from 'node:path';
if(process.env.SHIGUANG_E2E_CHAT_LIVE!=='1'||!process.env.DATA_DIR||!path.resolve(process.env.DATA_DIR).startsWith('/tmp/shiguang-e2e-'))throw new Error('Requires opt-in and isolated E2E directory');
const source=new DatabaseSync('.data/shiguang.sqlite',{readOnly:true});const row=source.prepare('SELECT value FROM settings WHERE key=?').get('provider');source.close();
if(!row)throw new Error('No saved text provider');
process.env.FILE_WORKER_ENABLED='false';process.env.WORKER_MODE='true';process.env.SEED_DEMO='false';
const {setSetting,save,db}=await import('../../server/store.mjs');setSetting('provider',JSON.parse(row.value));
const yesterday=new Date(Date.now()-86400000).toISOString();
for(const [title,body] of [['篝火旅程',('公开的示例背景，尚未涉及预算与审批。\n').repeat(250)+'篝火旅程最终约束：预算上限137元，周五晚上八点由我确认，未确认不得订票。'],['书架改造','书架改造预算上限286元，周六上午十点由我确认，未确认不得购买。']]){
 const note=save('note',{title,content:body,tags:[],project:'',type:'text',status:'ready'});
 const thread=save('thread',{title,status:'active'});
 save('conversation',{threadId:thread.id,threadTitle:title,query:'这次讨论的是'+title+'，具体约束按引用笔记。',body:'好的，等待你继续讨论。',mode:'human',sources:[],references:[{id:note.id,kind:'note',title,revision:note.revision}],createdAt:yesterday});
}
process.once('SIGTERM',()=>db.prepare('DELETE FROM settings WHERE key=?').run('provider'));
process.once('SIGINT',()=>db.prepare('DELETE FROM settings WHERE key=?').run('provider'));
await import('../../server/index.mjs');
