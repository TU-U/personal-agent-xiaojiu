import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { randomUUID, scryptSync, timingSafeEqual, randomBytes } from 'node:crypto';

export const DATA_DIR = path.resolve(process.env.DATA_DIR || '.data');
mkdirSync(DATA_DIR, { recursive: true });
mkdirSync(path.join(DATA_DIR, 'uploads'), { recursive: true });
export const db = new DatabaseSync(path.join(DATA_DIR, 'shiguang.sqlite'));
db.exec(`PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000; PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS entities (id TEXT PRIMARY KEY, kind TEXT NOT NULL, data TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 1, deleted INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS entity_kind ON entities(kind, deleted);
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, expires INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS operations (id TEXT PRIMARY KEY, result TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS changes (seq INTEGER PRIMARY KEY AUTOINCREMENT, entity_id TEXT NOT NULL, kind TEXT NOT NULL, revision INTEGER NOT NULL, deleted INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS search_outbox (entity_id TEXT PRIMARY KEY, kind TEXT NOT NULL, revision INTEGER NOT NULL, updated_at TEXT NOT NULL);
`);
export const now = () => new Date().toISOString();
export function getSetting(key, fallback = null) { const r = db.prepare('SELECT value FROM settings WHERE key=?').get(key); return r ? JSON.parse(r.value) : fallback; }
export function setSetting(key, value) { db.prepare('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(key, JSON.stringify(value)); }
export function all(kind) { return db.prepare('SELECT * FROM entities WHERE kind=? AND deleted=0 ORDER BY updated_at DESC,id').all(kind).map(decode); }
function decode(r) { return r ? { ...JSON.parse(r.data), id: r.id, revision: r.revision, updatedAt: r.updated_at } : null; }
export function get(id, kind) { const r = db.prepare('SELECT * FROM entities WHERE id=? AND deleted=0').get(id); return r && (!kind || r.kind === kind) ? decode(r) : null; }
export function transaction(fn) { db.exec('BEGIN IMMEDIATE'); try { const result = fn(); db.exec('COMMIT'); return result; } catch (e) { db.exec('ROLLBACK'); throw e; } }
export function save(kind, data, expectedRevision) {
 const previous = db.prepare('SELECT * FROM entities WHERE id=?').get(data.id || '') ?? null;
 if (previous?.deleted) throw Object.assign(new Error('这条内容已被删除，请另存为新记录。'), { status: 410 });
 if (previous && (previous.kind !== kind || expectedRevision !== previous.revision)) throw Object.assign(new Error('另一台设备已更新这条内容。你的修改已保留，请对比后再保存。'), { status: 409, current: decode(previous) });
 const id = data.id || randomUUID(), revision = (previous?.revision || 0) + 1, updatedAt = now();
 const stored = { ...data, id, revision, updatedAt, createdAt: data.createdAt || updatedAt };
 db.prepare('INSERT INTO entities(id,kind,data,revision,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data,revision=excluded.revision,updated_at=excluded.updated_at').run(id, kind, JSON.stringify(stored), revision, updatedAt);
 db.prepare('INSERT INTO changes(entity_id,kind,revision,deleted) VALUES(?,?,?,0)').run(id, kind, revision);
 if (['note','memory','event','libraryFile'].includes(kind)) db.prepare('INSERT INTO search_outbox(entity_id,kind,revision,updated_at) VALUES(?,?,?,?) ON CONFLICT(entity_id) DO UPDATE SET revision=excluded.revision,updated_at=excluded.updated_at').run(id,kind,revision,updatedAt);
 return stored;
}
export function remove(id, kind, revision) {
 const old = get(id, kind); if (!old) throw Object.assign(new Error('内容不存在或已删除。'), { status: 404 });
 if (revision !== old.revision) throw Object.assign(new Error('这条内容已更新，请刷新后再删除。'), { status: 409, current: old });
 db.prepare('UPDATE entities SET deleted=1,revision=revision+1,updated_at=?,data=? WHERE id=?').run(now(), JSON.stringify({id,deletedAt:now()}), id);
 db.prepare('INSERT INTO changes(entity_id,kind,revision,deleted) VALUES(?,?,?,1)').run(id, kind, old.revision + 1);
 if (['note','memory','event','libraryFile'].includes(kind)) db.prepare('INSERT INTO search_outbox(entity_id,kind,revision,updated_at) VALUES(?,?,?,?) ON CONFLICT(entity_id) DO UPDATE SET revision=excluded.revision,updated_at=excluded.updated_at').run(id,kind,old.revision+1,now());
 db.prepare("UPDATE operations SET result=json_object('id',?) WHERE json_extract(result,'$.id')=?").run(id,id);
 return old;
}
export function hashCode(code, salt = randomBytes(16).toString('hex')) { return { salt, hash: scryptSync(code, salt, 32).toString('hex') }; }
export function verifyCode(code) { const stored = getSetting('access'); const candidate = scryptSync(String(code), stored.salt, 32); return timingSafeEqual(candidate, Buffer.from(stored.hash, 'hex')); }
if (!getSetting('access')) { setSetting('access', hashCode(process.env.DEMO_ACCESS_CODE || 'shiguang-demo')); setSetting('demoAccess', !process.env.DEMO_ACCESS_CODE); }
export function seed() {
 if (getSetting('seeded')) return;
 const today = new Date();
 const day = (n) => { const d = new Date(today); d.setDate(d.getDate() - n); d.setHours(10, 30, 0, 0); return d.toISOString(); };
 const notes = [
  { title: '把零散的想法，慢慢变成自己的作品', content: '今天想清楚了一件事：记录不是终点。真正有价值的是，在需要的时候把过去的想法重新连接起来。\n\n想做一个自己的记忆空间：手机上随手记，电脑上慢慢整理。AI 帮我找到关联，但最后的判断由我自己做。\n\n先把记录、检索和写作这一个小闭环做好。', tags: ['产品思考','灵感'], project: '拾光', pinned: true, days: 0 },
  { title: '拾光 · 第一轮产品讨论', content: '项目定位：面向个人的跨设备记忆助手。\n\n已确定：\n1. 正式手机端优先 Android，Demo 先做网页版。\n2. 手机侧重快速记录，电脑侧重整理和创作。\n3. 第一版支持文字与文件导入、资料检索、引用问答和周报草稿。\n\n待解决：网页录音的兼容性、中文检索效果、断网后草稿保留。\n下一步：跑通手机浏览器与电脑浏览器之间的数据同步。', tags: ['项目进展','产品设计'], project: '拾光', days: 0 },
  { title: '读书摘记：让记录成为第二次思考', content: '读书时不必把所有句子都留下。记下真正改变自己看法的内容，以及它为什么重要。\n\n一个值得尝试的方法：每条摘记加一句自己的理解，再写一个可以实际行动的小步骤。下次回顾时，看到的不只是别人的结论，还有自己思考的轨迹。\n\n这是一条用于体验的模拟读书笔记，不是任何书籍的原文引述。', tags: ['阅读','方法'], project: '个人成长', days: 1 },
  { title: '本周工作：完成资料导入方案', content: '完成了文字和 Markdown 的资料导入设计，保留原始文件与可编辑正文。\n\n确定文件解析失败时不应丢弃原件，应该允许用户补充文字。完成重复提交的幂等方案讨论，避免网络重试创建两份记录。\n\n风险：扫描版 PDF 没有文字层，需要 OCR；第一轮先明确提示，不能显示为空白成功。\n下周计划：验证 DOCX 解析和手机上传体验。', tags: ['工作记录','技术'], project: '拾光', days: 2 },
  { title: '散步时想到的三个小问题', content: '如果每天只记一件事，我会记什么？\n什么样的提醒会让我觉得被照顾，而不是被打扰？\n哪些长期保存的东西，其实可以放心忘掉？\n\n也许好的工具应该知道什么时候安静。', tags: ['生活','灵感'], project: '', days: 2 },
  { title: '喜欢的表达方式', content: '我希望工作周报先写结论，再写进展和风险。\n尽量用短句和具体事实，不要堆砌形容词。\n这一偏好仅用于工作周报，读书笔记可以更自由一些。', tags: ['写作','偏好'], project: '个人成长', days: 3 },
  { title: '竞品观察：轻量记录的意义', content: '观察 Memos 的思路：让用户先记录，再通过时间线、标签和搜索回看。\n\n对自己的启发：不强制每条笔记填写标题、分类或文件夹。输入足够简单，用户才会愿意坚持。\n\n值得保留的设计：常驻记录入口；清晰的时间；全文可检索；明确的保存反馈。', tags: ['产品思考','调研'], project: '拾光', days: 4 },
 ];
 transaction(() => { for (const n of notes) { const { days, ...rest } = n; save('note', { ...rest, type:'text', status:'ready', sample:true, createdAt: day(days), eventDate: day(days).slice(0,10), summary: rest.content.split('\n')[0], attachments:[] }); }
 const pref = all('note').find(n => n.title === '喜欢的表达方式');
 save('memory', { title:'周报先写结论，再写进展和风险', content:'工作周报使用短句和具体事实，先写结论，再列进展、风险和下一步。', scope:'周报', status:'candidate', sourceId:pref.id, sample:true });
 setSetting('seeded', true); });
}
if (process.env.SEED_DEMO !== 'false') seed();
// An interrupted process must never leave tasks spinning forever.
if(process.env.WORKER_MODE!=='true') for (const task of all('task').filter(t => t.status === 'running')) save('task', { ...task, status:'failed', error:'服务重启中断了任务，请重新生成。' }, task.revision);
