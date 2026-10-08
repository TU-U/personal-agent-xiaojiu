import {contractPost} from './api';
import {API_BASE} from './api';
import StorageStatus from './StorageStatus';
import {useState} from 'react';
import {Download,Database,ShieldCheck} from 'lucide-react';

import {ErrorBanner,Spinner} from './components';

type Backup = {id:string;files:number;bytes:number;createdAt:string;downloadUrl:string};
export default function BackupPanel(){
 const [backup,setBackup]=useState<Backup|null>(null),[busy,setBusy]=useState(''),[error,setError]=useState(''),[verified,setVerified]=useState('');
 async function create(){setBusy('create');setError('');setVerified('');try{setBackup(await contractPost('postBackups','/backups',{}));}catch(e){setError((e as Error).message);}finally{setBusy('');}}
 async function verify(){if(!backup)return;setBusy('verify');setError('');setVerified('');try{const result=await contractPost('postBackupsByIdVerifyRestore',`/backups/${backup.id}/verify-restore`,{});setVerified(result.message);}catch(e){setError((e as Error).message);}finally{setBusy('');}}
 return <section className="settings-panel" aria-busy={!!busy}>
  <h2><Database size={20}/>你的数据，随时带走</h2>
  <p className="panel-description">完整备份包含记录、记忆、要事、资料副本和原始附件；不含接口密钥和登录凭据。恢复后需要重新配置密钥。</p>
  <StorageStatus/>
  <ErrorBanner message={error}/>
  <div className="button-row"><button className="btn primary" onClick={()=>void create()} disabled={!!busy}>{busy==='create'?<Spinner label="正在创建并校验备份…"/>:<><Database size={16}/>创建完整备份</>}</button><a className="btn secondary" href={API_BASE + "/export"} download><Download size={16}/>仅导出 JSON</a></div>
  <p className="field-help">JSON 只包含结构数据，不含原始文件，不能替代完整备份。</p>
  {backup&&<div className="subtle-notice"><p role="status">备份已创建：{backup.files} 个文件，约 {(backup.bytes/1024/1024).toFixed(1)} MB。</p><div className="button-row"><a className="btn secondary" href={backup.downloadUrl} download><Download size={16}/>下载完整备份</a><button className="btn secondary" onClick={()=>void verify()} disabled={!!busy}>{busy==='verify'?<Spinner label="正在隔离恢复并核验…"/>:<><ShieldCheck size={16}/>验证能否恢复</>}</button></div><p className="field-help">验证会使用临时目录，不替换当前空间的数据。</p></div>}
  {verified&&<p className="success-banner" role="status">{verified}</p>}
 </section>;
}
