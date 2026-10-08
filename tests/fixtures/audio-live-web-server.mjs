// Opt-in generation flows; only synthetic/public inputs and an isolated database.
import {DatabaseSync} from 'node:sqlite';
if((process.env.SHIGUANG_E2E_AUDIO_LIVE!=='1'&&process.env.SHIGUANG_E2E_ACCOUNTING_LIVE!=='1')||!process.env.DATA_DIR?.startsWith('/tmp/shiguang-e2e-'))throw new Error('Requires opt-in and isolated data');
const live=new DatabaseSync('.data/shiguang.sqlite',{readOnly:true});
const row=live.prepare('SELECT value FROM settings WHERE key=?').get('provider');const vision=live.prepare('SELECT value FROM settings WHERE key=?').get('visionProvider');live.close();
if(!row)throw new Error('Saved generation provider required');
process.env.SEED_DEMO='false';
if(process.env.SHIGUANG_E2E_ACCOUNTING_LIVE==='1')process.env.FILE_WORKER_ENABLED='false';
const {setSetting,db}=await import('../../server/store.mjs');setSetting('provider',JSON.parse(row.value));if(vision)setSetting('visionProvider',JSON.parse(vision.value));
for(const signal of ['SIGTERM','SIGINT'])process.once(signal,()=>db.prepare("DELETE FROM settings WHERE key IN ('provider','visionProvider')").run());
await import('../../server/index.mjs');
