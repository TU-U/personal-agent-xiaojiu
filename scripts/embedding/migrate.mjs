// Administrative CLI only: do not seed or change unrelated running task states.
const output=console.log.bind(console);console.log=(...args)=>console.error(...args);
process.env.WORKER_MODE='true';process.env.SEED_DEMO='false';
const {createQwenMigration,migrationStatus,retryIndexMigration}=await import('../../server/retrieval/index/index-migration.mjs');
const {verifyIndexMigration}=await import('../../server/retrieval/index/index-verification.mjs');
const {activateIndex,rollbackIndex}=await import('../../server/retrieval/index/index-switch.mjs');
const [action,id]=process.argv.slice(2);
try{
 if(action==='create')output(JSON.stringify(createQwenMigration(),null,2));
 else if(action==='status'&&id)output(JSON.stringify(migrationStatus(id),null,2));
 else if(action==='activate'&&id)output(JSON.stringify(await activateIndex(id),null,2));
 else if(action==='rollback'&&id)output(JSON.stringify(await rollbackIndex(id),null,2));
 else if(action==='verify'&&id)output(JSON.stringify(await verifyIndexMigration(id),null,2));
 else if(action==='retry'&&id)output(JSON.stringify(retryIndexMigration(id),null,2));
 else throw new Error('Usage: node scripts/embedding/migrate.mjs create | status <id> | retry <id> | verify <id> | activate <id> | rollback <switch-id>');
}catch(error){console.error(error.message);process.exitCode=1;}
