import { z } from 'zod';

// Do not coerce booleans/numbers: e.g. clearKey="false" must never clear a key.
const text = (max) => z.string().max(max);
const endpoint = text(500).trim().refine(value => {
  if (!value) return true;
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password && !url.search && !url.hash;
  } catch { return false; }
}, '接口需要 http(s) 地址，不含账号、查询参数或片段。');
const secretChange = {
  apiKey: text(1000).optional(),
  clearKey: z.boolean().optional(),
};
export const providerSchema = z.strictObject({ baseUrl: endpoint, model: text(100).trim(), ...secretChange });
export const settingsPatchSchema = z.strictObject({
  name: text(30).trim().min(1).optional(),
  provider: providerSchema.optional(),
  visionProvider: providerSchema.nullable().optional(),
  retrieval: z.strictObject({ qdrant: endpoint, embedding: endpoint, model: text(100).trim(), ...secretChange }).optional(),
  webSearch: z.strictObject(secretChange).optional(),
  accessCode: text(100).min(8).optional(),
});

export function validate(schema, input, { status = 400, label = '提交内容' } = {}) {
  const result = schema.safeParse(input);
  if (result.success) return result.data;
  // Never return Zod raw values/messages with potentially sensitive input or keys.
  const allowed = new Set(['name', 'provider', 'baseUrl', 'model', 'apiKey', 'clearKey', 'webSearch', 'accessCode', 'visionProvider', 'retrieval', 'qdrant', 'embedding']);
  const fields = [...new Set(result.error.issues.map(issue =>
    issue.path.map(part => allowed.has(String(part)) ? String(part) : '字段').join('.') || '请求'
  ))];
  throw Object.assign(new Error(`${label}格式无效，请检查：${fields.join('、')}。`), { status, fields });
}
