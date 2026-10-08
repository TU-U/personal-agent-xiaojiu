import {aiContext} from './ai-context.mjs';
import { mkdirSync, appendFileSync, existsSync, openSync, readSync, closeSync, statSync } from 'node:fs';
import path from 'node:path';
import { DATA_DIR, getSetting } from '../store.mjs';

export const AI_LOG_FILE = path.join(DATA_DIR, 'logs', 'ai-interactions.jsonl');
const runtimeSecrets = new Set();
export function registerAiSecret(value) { if (typeof value === 'string' && value) runtimeSecrets.add(value); }
function redact(value) {
  const secrets = new Set([...runtimeSecrets, getSetting('provider', {})?.apiKey,
    getSetting('braveSearchKey', ''), process.env.LLM_API_KEY, process.env.EMBEDDING_API_KEY,
    process.env.BRAVE_SEARCH_API_KEY].filter(value => typeof value === 'string' && value));
  const scrub = (item, field = '') => {
    if (/^(authorization|api[_-]?key|access[_-]?token|secret|password)$/i.test(field)) return '[REDACTED_KEY]';
    if (typeof item === 'string') {
      let result = item;
      for (const secret of secrets) result = result.split(secret).join('[REDACTED_KEY]');
      return result.replace(/data:[^\s"']*;base64,[a-z0-9+/=]+/gi, '[OMITTED_BINARY]')
        .replace(/sk-[A-Za-z0-9_-]{12,}/g, '[REDACTED_KEY]')
        .replace(/Bearer\s+[^\s"']+/gi, 'Bearer [REDACTED_KEY]');
    }
    if (Array.isArray(item)) return item.map(value => scrub(value));
    if (item && typeof item === 'object') return Object.fromEntries(Object.entries(item).map(([key, value]) => [key, scrub(value, key)]));
    return item;
  };
  return JSON.stringify(scrub(value));
}

export function logAiEvent(event) {
  const safe = JSON.parse(redact({ at: new Date().toISOString(), ...event, context: aiContext() }));
  console.log(`[AI ${safe.stage || 'event'}] ${JSON.stringify(safe, null, 2)}`);
  try {
    mkdirSync(path.dirname(AI_LOG_FILE), { recursive: true });
    appendFileSync(AI_LOG_FILE, `${JSON.stringify(safe)}\n`, { mode: 0o600 });
  } catch (error) {
    console.error('[AI log] 无法写入日志文件：', error.message);
  }
  return safe;
}

export function recentAiEvents(limit = 60) {
  if (!existsSync(AI_LOG_FILE)) return [];
  const size = statSync(AI_LOG_FILE).size;
  const length = Math.min(size, 2 * 1024 * 1024);
  if (!length) return [];
  const buffer = Buffer.alloc(length);
  const fd = openSync(AI_LOG_FILE, 'r');
  try { readSync(fd, buffer, 0, length, size - length); }
  finally { closeSync(fd); }
  const lines = buffer.toString('utf8').split('\n');
  if (size > length) lines.shift();
  return lines.filter(Boolean).slice(-Math.max(1, Math.min(limit, 200))).reverse().flatMap(line => {
    try { return [JSON.parse(line)]; } catch { return []; }
  });
}
