import { createHash, randomBytes, randomUUID } from "node:crypto";
import { db, getSetting, setSetting, verifyCode } from "./store.mjs";

db.exec(`CREATE TABLE IF NOT EXISTS device_sessions (
 token_hash TEXT PRIMARY KEY, device_id TEXT NOT NULL, device_name TEXT NOT NULL, expires INTEGER NOT NULL
); CREATE TABLE IF NOT EXISTS operation_payloads (id TEXT PRIMARY KEY, hash TEXT NOT NULL);`);
if (!getSetting("workspaceId")) setSetting("workspaceId", randomUUID());
const digest = (value) => createHash("sha256").update(value).digest("hex");
export function deviceSession(req) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  return db
    .prepare("SELECT * FROM device_sessions WHERE token_hash=? AND expires>?")
    .get(digest(header.slice(7)), Date.now());
}
export function revokeDevices(exceptHash = "") {
  db.prepare("DELETE FROM device_sessions WHERE token_hash!=?").run(exceptHash);
}
export function installDeviceLogin(app, attempts, fail) {
  app.get("/api/mobile/v1/capabilities", (_req, res) =>
    res.json({
      protocolVersion: 1,
      deviceAuth: true,
      sync: false,
      idempotentImport: false,
      asyncTasks: false,
      maxUploadBytes: 26214400,
    }),
  );
  app.post("/api/mobile/v1/session", (req, res) => {
    const { code, deviceId, deviceName } = req.body;
    if (
      typeof deviceId !== "string" ||
      !/^[\w-]{8,100}$/.test(deviceId) ||
      typeof deviceName !== "string" ||
      deviceName.length > 100
    )
      throw fail("设备信息无效。");
    const a = attempts.get(req.ip);
    if (a && a.count >= 12 && a.until > Date.now())
      throw fail("尝试次数过多，请 5 分钟后再试。", 429);
    if (typeof code !== "string" || code.length > 200 || !verifyCode(code)) {
      attempts.set(req.ip, {
        count: (a && a.until > Date.now() ? a.count : 0) + 1,
        until: Date.now() + 300000,
      });
      throw fail("访问口令不正确，请重新输入。", 401);
    }
    attempts.delete(req.ip);
    const token = randomBytes(32).toString("hex"),
      expiresAt = Date.now() + 30 * 86400000;
    db.prepare("DELETE FROM device_sessions WHERE expires<?").run(Date.now());
    db.prepare("INSERT INTO device_sessions VALUES(?,?,?,?)").run(
      digest(token),
      deviceId,
      deviceName,
      expiresAt,
    );
    res.json({ token, expiresAt, workspaceId: getSetting("workspaceId") });
  });
}
export function installDeviceLogout(app, fail) {
  app.delete("/api/mobile/v1/session", (req, res) => {
    const session = deviceSession(req);
    if (!session) throw fail("设备登录已过期。", 401);
    db.prepare("DELETE FROM device_sessions WHERE token_hash=?").run(
      session.token_hash,
    );
    res.json({ ok: true });
  });
}
// Canonical JSON rejects reuse of a create key with different content, including object key reordering.
export function payloadHash(value) {
  const canonical = (v) =>
    Array.isArray(v)
      ? v.map(canonical)
      : v && typeof v === "object"
        ? Object.fromEntries(
            Object.keys(v)
              .sort()
              .filter((k) => k !== "opId")
              .map((k) => [k, canonical(v[k])]),
          )
        : v;
  return digest(JSON.stringify(canonical(value)));
}
