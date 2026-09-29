import { test, expect } from "@playwright/test";

test("device Bearer writes reach the live Web UI, and Web edits return to the same device record", async ({
  page,
  request,
}, info) => {
  await page.goto("/");
  await page.getByRole("button", { name: "进入演示空间" }).click();
  await expect(page.locator(".app-shell")).toBeVisible();
  const marker = `设备桥接 ${Date.now()} ${info.project.name}`;
  const session = await request.post("/api/mobile/v1/session", {
    data: {
      code: "shiguang-demo",
      deviceId: `bridge-${Date.now()}`,
      deviceName: "native protocol test",
    },
  });
  expect(session.ok()).toBeTruthy();
  const headers = { Authorization: `Bearer ${(await session.json()).token}` };
  const created = await request.post("/api/notes", {
    headers,
    data: {
      title: marker,
      content: "手机端创建，等待电脑处理。",
      opId: `bridge-note-${Date.now()}`,
    },
  });
  const note = await created.json();
  expect(created.status()).toBe(201);
  // No reload: this verifies that the desktop's existing change polling observes a device write.
  await page.getByLabel("搜索记录").fill(marker);
  await expect(
    page.locator(".note-card").filter({ hasText: marker }),
  ).toHaveCount(1);
  await page
    .locator(".note-card")
    .filter({ hasText: marker })
    .locator(".note-card-body")
    .click();
  await page.getByRole("button", { name: "编辑", exact: true }).click();
  await page
    .getByLabel("记录内容")
    .fill("电脑端已补充内容，手机读取同一个 ID 的新版本。");
  await page.getByRole("button", { name: "保存记录", exact: true }).click();
  const shared = await (
    await request.get("/api/bootstrap", { headers })
  ).json();
  const updated = shared.notes.find((n) => n.id === note.id);
  expect(updated.revision).toBe(note.revision + 1);
  expect(updated.content).toContain("手机读取同一个 ID");
  const conflict = await request.patch(`/api/notes/${note.id}`, {
    headers,
    data: { revision: note.revision, content: "手机上的旧输入" },
  });
  expect(conflict.status()).toBe(409);
  expect((await conflict.json()).current.content).toBe(updated.content);
  if (info.project.name === "desktop")
    await page.screenshot({
      path: "artifacts/mobile/desktop-device-bridge.png",
      fullPage: true,
    });
  await page.getByLabel("关闭窗口").click();
  expect(
    (
      await request.delete(`/api/notes/${note.id}`, {
        headers,
        data: { revision: updated.revision },
      })
    ).ok(),
  ).toBeTruthy();
  await expect(
    page.locator(".note-card").filter({ hasText: marker }),
  ).toHaveCount(0);
  await request.delete("/api/mobile/v1/session", { headers });
});
