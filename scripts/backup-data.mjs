import path from 'node:path';
import { createBackup, verifyBackup, restoreBackup } from '../server/core/backups/backups.mjs';
const [command, source, destination, ...flags] = process.argv.slice(2);
if (!['create','verify','restore'].includes(command) || !source || (command !== 'verify' && !destination) || flags.some(flag=>flag!=='--include-secrets')) {
 console.error('用法：node scripts/backup-data.mjs create <数据目录> <新备份目录> [--include-secrets]\n      node scripts/backup-data.mjs verify <备份目录>\n      node scripts/backup-data.mjs restore <备份目录> <不存在的新目录>');
 process.exitCode=1;
} else {
 try {
  const result=command==='create'?await createBackup({dataDir:source,destination,includeSecrets:flags.includes('--include-secrets')}):command==='verify'?await verifyBackup(source):await restoreBackup({directory:source,destination});
  console.log(JSON.stringify({ok:true,command,directory:result.directory||path.resolve(source),files:result.manifest?.files.length,entities:result.entities,includesCredentials:result.manifest?.includeSecrets},null,2));
 }catch(error){console.error('备份操作失败：'+error.message);process.exitCode=1;}
}
