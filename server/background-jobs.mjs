import { randomUUID, createHash } from 'node:crypto';
import { Queue, Worker } from 'bullmq';
import { z } from 'zod';
import { validate } from './validation.mjs';

const jobInput = z.strictObject({
  key: z.string().min(1).max(500),
  kind: z.string().min(1).max(80),
  entityId: z.string().min(1).max(100),
  revision: z.number().int().nonnegative(),
  payload: z.record(z.string(), z.unknown()).default({}),
  dueAt: z.number().int().nonnegative().default(0),
});

// Accept the application's SQLite connection. No second business database.
export function createJobRepository(db, clock = Date.now) {
  db.exec(`CREATE TABLE IF NOT EXISTS background_jobs (
    id TEXT PRIMARY KEY, operation_key TEXT NOT NULL UNIQUE, kind TEXT NOT NULL,
    entity_id TEXT NOT NULL, revision INTEGER NOT NULL, payload TEXT NOT NULL,
    state TEXT NOT NULL, due_at INTEGER NOT NULL, result TEXT, error TEXT,
    attempts INTEGER NOT NULL DEFAULT 0, lease_token TEXT, lease_until INTEGER,
    updated_at INTEGER NOT NULL
  ); CREATE INDEX IF NOT EXISTS background_jobs_pending ON background_jobs(state,due_at);`);
  const decode = row => row ? { ...row, payload: JSON.parse(row.payload), result: row.result ? JSON.parse(row.result) : null } : null;
  const get = id => decode(db.prepare('SELECT * FROM background_jobs WHERE id=?').get(id));
  function atomic(fn) {
    // Savepoints compose with the transaction that saves the source entity.
    db.exec('SAVEPOINT background_job_change');
    try { const result = fn(); db.exec('RELEASE background_job_change'); return result; }
    catch (error) { db.exec('ROLLBACK TO background_job_change; RELEASE background_job_change'); throw error; }
  }
  return {
    get,
    enqueue(input) {
      const value = validate(jobInput, input);
      const id = createHash('sha256').update(value.key).digest('hex');
      return atomic(() => {
        const old = get(id);
        if (old) {
          if (old.kind !== value.kind || old.entity_id !== value.entityId || old.revision !== value.revision ||
              JSON.stringify(old.payload) !== JSON.stringify(value.payload) || old.due_at !== value.dueAt)
            throw Object.assign(new Error('同一后台操作标识不能用于不同输入。'), { status: 409 });
          return old;
        }
        db.prepare(`INSERT INTO background_jobs(id,operation_key,kind,entity_id,revision,payload,state,due_at,updated_at)
          VALUES(?,?,?,?,?,?,'pending',?,?)`).run(id,value.key,value.kind,value.entityId,value.revision,JSON.stringify(value.payload),value.dueAt,clock());
        return get(id);
      });
    },
    pending() {
      return db.prepare(`SELECT * FROM background_jobs WHERE state='pending' OR (state='running' AND lease_until<?)
        ORDER BY due_at,updated_at LIMIT 100`).all(clock()).map(decode);
    },
    claim(id, token, leaseMs) {
      const at = clock();
      const changed = db.prepare(`UPDATE background_jobs SET state='running',lease_token=?,lease_until=?,attempts=attempts+1,updated_at=?
        WHERE id=? AND due_at<=? AND (state='pending' OR (state='running' AND lease_until<?))`)
        .run(token,at+leaseMs,at,id,at,at).changes;
      return changed ? get(id) : null;
    },
    heartbeat(id,token,leaseMs) {
      return db.prepare("UPDATE background_jobs SET lease_until=? WHERE id=? AND lease_token=? AND state='running' AND lease_until>=?")
        .run(clock()+leaseMs,id,token,clock()).changes === 1;
    },
    progress(id,token,value) {
      return db.prepare("UPDATE background_jobs SET result=?,updated_at=? WHERE id=? AND lease_token=? AND state='running' AND lease_until>=?")
        .run(JSON.stringify({progress:value}),clock(),id,token,clock()).changes===1;
    },
    finish(id,token,result,commit) {
      return atomic(() => {
        const current = get(id);
        if (current?.state !== 'running' || current.lease_token !== token || current.lease_until < clock()) return false;
        // Source version checks and business writes execute in the SAME transaction.
        const committed = commit?.(current,result);
        if (committed && typeof committed.then === 'function') throw new Error('后台结果提交必须同步事务执行。');
        db.prepare("UPDATE background_jobs SET state='completed',result=?,error=NULL,lease_token=NULL,lease_until=NULL,updated_at=? WHERE id=?")
          .run(JSON.stringify(result ?? null),clock(),id);
        return true;
      });
    },
    fail(id,token,error) {
      db.prepare("UPDATE background_jobs SET state='failed',error=?,lease_token=NULL,lease_until=NULL,updated_at=? WHERE id=? AND lease_token=? AND state='running' AND lease_until>=?")
        .run(String(error).slice(0,1000),clock(),id,token,clock());
    },
    cancel(id) {
      return db.prepare("UPDATE background_jobs SET state='cancelled',lease_token=NULL,lease_until=NULL,updated_at=? WHERE id=? AND state IN ('pending','running','failed')")
        .run(clock(),id).changes === 1;
    },
    retry(id) {
      return db.prepare("UPDATE background_jobs SET state='pending',error=NULL,updated_at=? WHERE id=? AND state='failed'").run(clock(),id).changes === 1;
    },
  };
}

export function createBackgroundQueue({ repository, handlers, connection, name = 'shiguang-background', leaseMs = 60000, concurrency = 2, lockDuration = 30000, stalledInterval = 30000, onError = () => {} }) {
  const queue = new Queue(name, { connection, defaultJobOptions: { attempts: 1, removeOnComplete: 100, removeOnFail: 100 } });
  queue.on('error', onError);
  const worker = new Worker(name, async job => {
    const token = randomUUID();
    const record = repository.claim(job.id,token,leaseMs);
    if (!record) return;
    let heartbeat;
    try {
      const handler = handlers[record.kind];
      if (!handler) throw new Error(`后台任务类型尚未接入：${record.kind}`);
      heartbeat = setInterval(() => { try { repository.heartbeat(record.id,token,leaseMs); } catch (error) { onError(error); } }, Math.max(100, Math.floor(leaseMs/3)));
      heartbeat.unref();
      const result = await handler.run(record);
      repository.finish(record.id,token,result,handler.commit);
    } catch (error) {
      repository.fail(record.id,token,error.message);
      throw error;
    } finally { if (heartbeat) clearInterval(heartbeat); }
  }, { connection, concurrency, lockDuration, stalledInterval });
  worker.on('error', onError);
  let dispatching = false;
  return {
    queue, worker,
    async dispatch() {
      if (dispatching) return;
      dispatching = true;
      try {
        for (const row of repository.pending()) {
          const existing = await queue.getJob(row.id);
          if (existing) {
            const state = await existing.getState();
            if (['completed','failed'].includes(state)) await existing.remove();
            else continue;
          }
          // SQLite remains the durable outbox until the worker commits completion.
          await queue.add(row.kind,{id:row.id},{jobId:row.id,delay:Math.max(0,row.due_at-Date.now())});
        }
      } finally { dispatching = false; }
    },
    async close() { await worker.close(); await queue.close(); },
  };
}
