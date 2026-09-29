import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
const port = 4433,
  base = `http://127.0.0.1:${port}/api`;
let server, dir, token, cookie;
const req = async (
  url,
  method = "GET",
  body,
  auth = token ? { Authorization: `Bearer ${token}` } : {},
) => {
  const r = await fetch(base + url, {
    method,
    headers: {
      ...auth,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: r.status, data: await r.json(), headers: r.headers };
};
const login = () =>
  req(
    "/mobile/v1/session",
    "POST",
    {
      code: "shiguang-demo",
      deviceId: "device-test-android",
      deviceName: "Android test",
    },
    {},
  );
before(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), "shiguang-mobile-"));
  server = spawn(process.execPath, ["server/index.mjs"], {
    env: {
      ...process.env,
      PORT: String(port),
      DATA_DIR: dir,
      SEED_DEMO: "false",
    },
    stdio: "pipe",
  });
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(base + "/health")).ok) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  const web = await req("/login", "POST", { code: "shiguang-demo" }, {});
  cookie = web.headers.get("set-cookie").split(";")[0];
});
after(async () => {
  server?.kill();
  await new Promise((r) => setTimeout(r, 300));
  await rm(dir, { recursive: true, force: true });
});
test("capabilities are truthful; device login returns stable workspace and stores only token hash", async () => {
  const cap = await req("/mobile/v1/capabilities");
  assert.equal(cap.data.deviceAuth, true);
  assert.equal(cap.data.sync, false);
  assert.equal(
    (
      await req(
        "/mobile/v1/session",
        "POST",
        { code: "wrong", deviceId: "device-test", deviceName: "test" },
        {},
      )
    ).status,
    401,
  );
  const one = await login(),
    two = await login();
  token = one.data.token;
  assert.equal(one.data.workspaceId, two.data.workspaceId);
  assert.notEqual(one.data.token, two.data.token);
  const db = new DatabaseSync(path.join(dir, "shiguang.sqlite"), {
    readOnly: true,
  });
  const rows = db.prepare("SELECT * FROM device_sessions").all();
  assert.ok(rows.length >= 2);
  assert.ok(!JSON.stringify(rows).includes(token));
  db.close();
  assert.equal(
    (
      await req("/bootstrap", "GET", undefined, {
        Authorization: "Bearer invalid",
      })
    ).status,
    401,
  );
});
test("phone create → computer edit → phone refresh, stale edits conflict and deletes propagate", async () => {
  const body = {
    title: "手机互通测试",
    content: "从 Android 记录的真实接口内容",
    project: "互通",
    opId: "mobile-test-operation",
  };
  const created = await req("/notes", "POST", body);
  assert.equal(created.status, 201);
  const n = created.data;
  assert.equal((await req("/notes", "POST", body)).data.id, n.id);
  assert.equal(
    (await req("/notes", "POST", { ...body, content: "不同内容" })).status,
    409,
  );
  const web = await req("/bootstrap", "GET", undefined, { cookie });
  assert.equal(web.data.notes.find((v) => v.id === n.id).content, body.content);
  const updated = await req(
    `/notes/${n.id}`,
    "PATCH",
    { revision: 1, content: "电脑端已修改" },
    { cookie },
  );
  assert.equal(updated.status, 200);
  const mobile = await req("/bootstrap");
  assert.equal(
    mobile.data.notes.find((v) => v.id === n.id).content,
    "电脑端已修改",
  );
  assert.equal(
    (
      await req(`/notes/${n.id}`, "PATCH", {
        revision: 1,
        content: "旧手机输入",
      })
    ).status,
    409,
  );
  await req(`/notes/${n.id}`, "DELETE", { revision: 2 }, { cookie });
  assert.equal(
    (await req("/bootstrap")).data.notes.some((v) => v.id === n.id),
    false,
  );
  assert.equal((await req("/notes", "POST", body)).status, 410);
});
test("Bearer attachment upload and authenticated download use shared desktop records", async () => {
  const form = new FormData();
  form.append("originalName", "手机资料.txt");
  form.append("file", new Blob(["手机附件测试正文"]), encodeURIComponent("手机资料.txt"));
  const r = await fetch(base + "/import", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  assert.equal(r.status, 201);
  const n = await r.json();
  assert.equal(n.title, "手机资料.txt");
  assert.equal(n.attachments[0].name, "手机资料.txt");
  const url = base + `/notes/${n.id}/file/${n.attachments[0].id}`;
  assert.equal((await fetch(url)).status, 401);
  assert.equal(
    await (
      await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    ).text(),
    "手机附件测试正文",
  );
  assert.equal(
    await (await fetch(url, { headers: { cookie } })).text(),
    "手机附件测试正文",
  );
});
test("device logout revokes only its token; desktop password rotation revokes mobile sessions", async () => {
  const revoked = (await login()).data.token;
  await req("/mobile/v1/session", "DELETE", undefined, {
    Authorization: `Bearer ${revoked}`,
  });
  assert.equal(
    (
      await req("/bootstrap", "GET", undefined, {
        Authorization: `Bearer ${revoked}`,
      })
    ).status,
    401,
  );
  assert.equal((await req("/bootstrap")).status, 200);
  await req(
    "/settings",
    "PATCH",
    { accessCode: "rotated-test-password" },
    { cookie },
  );
  assert.equal((await req("/bootstrap")).status, 401);
  assert.equal(
    (await req("/bootstrap", "GET", undefined, { cookie })).status,
    200,
  );
});

test("mobile password rotation keeps this device and revokes other device and Web sessions", async () => {
  const credentials = {
    code: "rotated-test-password",
    deviceId: "mobile-owner-device",
    deviceName: "phone",
  };
  token = (await req("/mobile/v1/session", "POST", credentials, {})).data.token;
  const other = (
    await req(
      "/mobile/v1/session",
      "POST",
      { ...credentials, deviceId: "mobile-other-device" },
      {},
    )
  ).data.token;
  const web = await req("/login", "POST", { code: credentials.code }, {});
  const webCookie = web.headers.get("set-cookie").split(";")[0];
  assert.equal(
    (await req("/settings", "PATCH", { accessCode: "mobile-rotated-password" }))
      .status,
    200,
  );
  assert.equal((await req("/bootstrap")).status, 200);
  assert.equal(
    (
      await req("/bootstrap", "GET", undefined, {
        Authorization: `Bearer ${other}`,
      })
    ).status,
    401,
  );
  assert.equal(
    (await req("/bootstrap", "GET", undefined, { cookie: webCookie })).status,
    401,
  );
});

test("device token and workspace identity survive a server restart", async () => {
  const beforeDb = new DatabaseSync(path.join(dir, "shiguang.sqlite"), {
    readOnly: true,
  });
  const workspace = beforeDb
    .prepare("SELECT value FROM settings WHERE key='workspaceId'")
    .get().value;
  beforeDb.close();
  await new Promise((resolve) => {
    server.once("exit", resolve);
    server.kill();
  });
  server = spawn(process.execPath, ["server/index.mjs"], {
    env: {
      ...process.env,
      PORT: String(port),
      DATA_DIR: dir,
      SEED_DEMO: "false",
    },
    stdio: "pipe",
  });
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(base + "/health")).ok) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  assert.equal((await req("/bootstrap")).status, 200);
  const afterDb = new DatabaseSync(path.join(dir, "shiguang.sqlite"), {
    readOnly: true,
  });
  assert.equal(
    afterDb.prepare("SELECT value FROM settings WHERE key='workspaceId'").get()
      .value,
    workspace,
  );
  afterDb.close();
});
