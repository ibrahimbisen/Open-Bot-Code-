import assert from "node:assert/strict";
import { createServer } from "node:http";
import type { Page } from "playwright-core";
import { closeBlockingDialogs, createChecks, prepareWindow, shot, until } from "./app-e2e-support";
import { connectChannelE2e, writeReport } from "./channel-e2e-support";

const KEY = "local-e2e-key-5d1f0c3a";
const MACHINE = "Desk GPU";
const MODEL = "desk-coder-7b";
let activePage: Page | undefined;
const { checks, step } = createChecks(() => activePage);
const screens: string[] = [];
const requests: { path: string; authorized: boolean }[] = [];

const server = createServer((request, response) => {
  const path = new URL(request.url ?? "/", "http://127.0.0.1").pathname;
  const authorized = request.headers.authorization === `Bearer ${KEY}`;
  requests.push({ path, authorized });
  if (!authorized) {
    response.writeHead(401, { "content-type": "application/json" });
    response.end(JSON.stringify({ error: "unauthorized" }));
    return;
  }
  if (path === "/v1/models") {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ object: "list", data: [{ id: MODEL, object: "model", owned_by: "owner" }] }));
    return;
  }
  response.writeHead(404, { "content-type": "application/json" });
  response.end(JSON.stringify({ error: "not found" }));
});

async function openLocalServers(page: Page): Promise<Page> {
  await page
    .getByRole("button", { name: /^Open server menu for/ })
    .first()
    .click();
  await page.getByRole("menuitem", { name: "Server settings" }).click();
  const entry = page
    .getByRole("tab", { name: "Local servers" })
    .or(page.getByRole("button", { name: "Local servers" }));
  await entry.first().click();
  await page.getByRole("button", { name: "Add machine" }).waitFor({ state: "visible", timeout: 30_000 });
  return page;
}

async function removeMachine(page: Page): Promise<void> {
  const remove = page.getByRole("button", { name: `Remove ${MACHINE}` });
  while ((await remove.count()) > 0) {
    await remove.first().click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Remove" }).click();
    await page.getByRole("alertdialog").waitFor({ state: "detached", timeout: 30_000 });
    await page.waitForTimeout(300);
  }
}

async function main(): Promise<void> {
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
  const address = server.address();
  assert.ok(address && typeof address === "object", "no server address");
  const baseUrl = `http://127.0.0.1:${address.port}/v1`;
  const session = await connectChannelE2e("local-server-settings-e2e");
  const { page } = session;
  activePage = page;
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  const restore = await prepareWindow(page);
  try {
    await step("17.3 Phase 1 works with no local server: the list is empty", async () => {
      const dialog = await openLocalServers(page);
      await removeMachine(page);
      assert.equal(await dialog.getByRole("button", { name: `Edit ${MACHINE}` }).count(), 0);
      screens.push(await shot(page, "local-servers-empty-dark"));
      await closeBlockingDialogs(page);
    });

    await step("17.3 the Local servers entry saves an address and an optional key", async () => {
      const dialog = await openLocalServers(page);
      await dialog.getByRole("button", { name: "Add machine" }).click();
      const form = page.getByRole("dialog", { name: "Add a local machine" });
      await form.waitFor({ state: "visible", timeout: 30_000 });
      await form.getByLabel(/^Name/).fill(MACHINE);
      await form.getByLabel(/^Server address/).fill(baseUrl);
      await form.getByLabel(/^API key/).fill(KEY);
      await form.getByRole("button", { name: "Test" }).click();
      await form.getByText(/online[.] 1 model found/i).waitFor({ state: "visible", timeout: 30_000 });
      screens.push(await shot(page, "local-server-add-tested-dark"));
      await form.getByRole("button", { name: "Save" }).click();
      await form.waitFor({ state: "detached", timeout: 30_000 });
      await dialog.getByRole("button", { name: `Edit ${MACHINE}` }).waitFor({ state: "visible", timeout: 30_000 });
      screens.push(await shot(page, "local-server-saved-dark"));
      const saved = await page.evaluate(() => window.codebot.localModelServers.list());
      const entry = saved.find((item) => item.name === "Desk GPU");
      assert.ok(entry, "the machine is not saved");
      assert.equal(entry.baseUrl.replace(/\/$/, ""), baseUrl);
      assert.equal(entry.hasApiKey, true, "the key is not saved");
      assert.equal(JSON.stringify(saved).includes(KEY), false, "the key is sent back to the screen");
      await closeBlockingDialogs(page);
      return `${saved.length} machine`;
    });

    await step("17.3 the saved address and key are used: the app reaches the server with the key", async () => {
      const before = requests.filter((entry) => entry.authorized).length;
      await page.reload();
      await page
        .getByRole("button", { name: /^Open status details/ })
        .first()
        .waitFor({ timeout: 60_000 });
      await until(
        page,
        "an authorized request after the reload",
        async () => requests.filter((entry) => entry.authorized).length,
        (count) => count > before,
        120_000,
      );
      await page
        .getByRole("button", { name: /^Open status details/ })
        .first()
        .click();
      const status = page.getByRole("dialog", { name: "Status" });
      await status.getByText(MACHINE).first().waitFor({ state: "visible", timeout: 30_000 });
      await status.getByText("Online").first().waitFor({ state: "visible", timeout: 60_000 });
      screens.push(await shot(page, "local-server-status-online-dark"));
      await closeBlockingDialogs(page);
      assert.ok(
        requests.every((entry) => entry.authorized || entry.path !== "/v1/models"),
        "a model list request came without the key",
      );
      return `${requests.length} requests, all with the key`;
    });

    await step("17.3 removing the machine leaves the app with no local server", async () => {
      await openLocalServers(page);
      await removeMachine(page);
      assert.equal(await page.getByRole("button", { name: `Edit ${MACHINE}` }).count(), 0);
      await closeBlockingDialogs(page);
    });
  } finally {
    await restore();
    await session.close();
    server.close();
  }
  const passed = checks.length > 0 && checks.every((entry) => entry.passed);
  const reportPath = writeReport("local-server-settings", { passed, checks, screens, pageErrors, requests });
  process.stdout.write(`report: ${reportPath}\n`);
  process.exitCode = passed ? 0 : 1;
}

await main();
