import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import type { Page } from "playwright-core";
import { connectChannelE2e, writeReport } from "./channel-e2e-support";
import "./project-dock-hook";

interface Check {
  name: string;
  passed: boolean;
  detail?: string;
}

const checks: Check[] = [];
const SCREENS = resolve(import.meta.dirname, "../.codebot-build/w14/screens");
const WAIT_MS = 60_000;
const RUN = `P${Date.now().toString(36).slice(-4)}`;
const WIDTH_KEY = "codebot:project-preview-width:v1";

async function step(name: string, run: () => Promise<string | undefined>): Promise<void> {
  try {
    const detail = await run();
    checks.push({ name, passed: true, ...(detail ? { detail } : {}) });
    process.stdout.write(`ok   ${name}${detail ? ` (${detail})` : ""}\n`);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    checks.push({ name, passed: false, detail });
    process.stdout.write(`FAIL ${name}: ${detail}\n`);
  }
}

async function until<T>(
  page: Page,
  label: string,
  read: () => Promise<T>,
  ready: (value: T) => boolean,
  timeoutMs = WAIT_MS,
): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const value = await read();
    if (ready(value)) return value;
    if (Date.now() > deadline) throw new Error(`Timed out: ${label}. Last value: ${JSON.stringify(value)}`);
    await page.waitForTimeout(200);
  }
}

async function setTheme(page: Page, appearance: "light" | "dark"): Promise<void> {
  await page.evaluate(
    (value) =>
      window.codebot.setAppAppearancePreference({
        appearance: value,
        palette: value === "light" ? "codebot-light" : "codebot-dark",
      }),
    appearance,
  );
  await until(
    page,
    `color scheme ${appearance}`,
    () => page.evaluate(() => document.documentElement.dataset.codebotColorScheme ?? ""),
    (scheme) => scheme === appearance,
  );
  await page.waitForTimeout(1500);
}

async function shot(page: Page, name: string): Promise<string> {
  mkdirSync(SCREENS, { recursive: true });
  const path = join(SCREENS, `${name}.png`);
  await page.screenshot({ path });
  return path;
}

const leftBar = (page: Page) => page.getByRole("navigation", { name: "Project list" });
const column = (page: Page) => page.locator("#project-column");
const projectButton = (page: Page, name: string) =>
  leftBar(page).getByRole("button", { name: `Open the project ${name}`, exact: true });
const previews = (page: Page) => page.locator(".project-preview-host");
const browsers = (page: Page) => page.locator(".project-browser-panel");
const chatPanels = (page: Page) => page.locator(".project-chat-panel:visible");

async function closeBlockingDialogs(page: Page): Promise<void> {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const dialog = page.locator("[role=dialog], [role=alertdialog]").first();
    if (!(await dialog.isVisible().catch(() => false))) return;
    await page.keyboard.press("Escape");
    await page.waitForTimeout(250);
  }
}

async function dismissToasts(page: Page): Promise<void> {
  await page.evaluate(() => {
    for (const button of document.querySelectorAll<HTMLElement>(".ui-toaster li button[aria-label]")) button.click();
  });
  await page.waitForTimeout(400);
}

async function createProject(page: Page, name: string, folder: string): Promise<void> {
  await page.evaluate((input) => window.codebot.projects.create(input), {
    name,
    mainFolder: folder,
    accessLevel: "open" as const,
    agents: [{ name: "Dev", role: "Developer" }],
  });
  await page.reload();
  await leftBar(page).waitFor({ state: "visible", timeout: WAIT_MS });
  await closeBlockingDialogs(page);
  await dismissToasts(page);
  await projectButton(page, name).waitFor({ state: "visible", timeout: WAIT_MS });
}

interface ChatRef {
  projectId: string;
  agentId: string;
  chatId: string;
  threadId: string;
}

async function sendInChat(page: Page, text: string, panelIndex = 0): Promise<void> {
  const editor = chatPanels(page).nth(panelIndex).getByRole("textbox").first();
  await editor.click();
  await page.keyboard.type(text);
  await page.keyboard.press("Enter");
  await until(
    page,
    "composer is empty after send",
    () => editor.innerText().catch(() => ""),
    (left) => !left.includes(text),
  );
}

async function readChats(page: Page, projectName: string): Promise<ChatRef[]> {
  return page.evaluate(async (wanted) => {
    const projects = (await window.codebot.projects.list()).filter((entry) => entry.name === wanted);
    const result: { projectId: string; agentId: string; chatId: string; threadId: string }[] = [];
    for (const project of projects) {
      const listed = await window.codebot.projects.listChats({ projectId: project.id, limit: 50 });
      for (const chat of listed.chats)
        result.push({ projectId: chat.projectId, agentId: chat.agentId, chatId: chat.taskId, threadId: chat.threadId });
    }
    return result;
  }, projectName);
}

async function openContent(
  page: Page,
  request: {
    kind: "preview" | "browser";
    projectId: string;
    title: string;
    data: Record<string, string>;
    activate: boolean;
    pinned?: boolean;
  },
): Promise<void> {
  await page.evaluate((value) => {
    const hook = window.__codebotProjectDock;
    if (!hook) throw new Error("no dock hook");
    hook.openContent(value);
  }, request);
}

async function savedPinnedPanels(page: Page): Promise<number> {
  return page.evaluate(() => {
    let count = 0;
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (!key?.startsWith("codebot:project-dock:v1:")) continue;
      const layout = JSON.parse(window.localStorage.getItem(key) ?? "null");
      for (const panel of Object.values<{ params?: { pinned?: boolean } }>(layout?.panels ?? {})) {
        if (panel.params?.pinned === true) count += 1;
      }
    }
    return count;
  });
}

async function closeAllTabs(page: Page): Promise<void> {
  await page.evaluate(async () => {
    for (const tab of await window.codebot.browser.listTabs()) await window.codebot.browser.close(tab.id);
  });
}

async function groupWidthRatio(page: Page, selector: string): Promise<number> {
  return page.evaluate((target) => {
    const surface = document.querySelector(".project-dock-surface");
    const panel = document.querySelector(target)?.closest(".dv-groupview");
    if (!surface || !panel) return 0;
    return panel.getBoundingClientRect().width / surface.getBoundingClientRect().width;
  }, selector);
}

async function main(): Promise<void> {
  const session = await connectChannelE2e("project-panels-e2e");
  const { page } = session;
  const root = await mkdtemp(join(tmpdir(), "codebot-project-panels-"));
  const folder = join(root, "project");
  const second = join(root, "second");
  mkdirSync(folder, { recursive: true });
  mkdirSync(second, { recursive: true });
  writeFileSync(
    join(folder, "readme.md"),
    "# Plan\n\nThe agent wrote this document.\n\n- first point\n- second point\n",
  );
  const server = createServer((_request, response) => {
    response.setHeader("content-type", "text/html");
    response.end("<!doctype html><title>Panel page</title><h1>Panel test page</h1>");
  });
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
  const address = server.address();
  assert.ok(address && typeof address === "object", "no server address");
  const pageUrl = `http://127.0.0.1:${address.port}/`;
  const screens: string[] = [];
  const name = `${RUN} Panels`;
  let chat: ChatRef | undefined;
  const viewport = await page.context().newCDPSession(page);
  try {
    await viewport.send("Emulation.setDeviceMetricsOverride", {
      width: 1600,
      height: 900,
      deviceScaleFactor: 0,
      mobile: false,
    });
    await page.reload();
    await leftBar(page).waitFor({ state: "visible", timeout: WAIT_MS });
    await closeBlockingDialogs(page);
    await dismissToasts(page);
    await page.evaluate((key) => window.localStorage.removeItem(key), WIDTH_KEY);
    await closeAllTabs(page);

    await step("project with one chat is ready", async () => {
      await createProject(page, name, folder);
      await projectButton(page, name).click();
      await column(page).getByRole("button", { name: "New chat" }).click();
      await chatPanels(page).first().waitFor({ state: "visible", timeout: WAIT_MS });
      await sendInChat(page, "First question");
      await until(
        page,
        "chat row",
        () => column(page).locator(".project-chat-row").count(),
        (count) => count >= 1,
      );
      const chats = await until(
        page,
        "chat ids",
        () => readChats(page, name),
        (list) => list.length >= 1,
      );
      chat = chats[0];
      assert.ok(chat, "no chat");
      await until(
        page,
        "first turn done",
        () => column(page).locator(".project-chat-row").first().innerText(),
        (text) => !/running|queued/i.test(text),
      );
      return `chat ${chat.chatId}`;
    });
    assert.ok(chat, "setup failed");
    const ref = chat;

    await step("preview opens as a dock split at half the main area, with no fixed right panel", async () => {
      await openContent(page, {
        kind: "preview",
        projectId: ref.projectId,
        title: "readme.md",
        data: { origin: "agent", source: "workspace", path: "readme.md", agentId: ref.agentId, chatId: ref.chatId },
        activate: false,
      });
      await previews(page).waitFor({ state: "visible", timeout: WAIT_MS });
      await page.getByText("The agent wrote this document.").waitFor({ state: "visible", timeout: WAIT_MS });
      await page.waitForTimeout(500);
      const ratio = await groupWidthRatio(page, ".project-preview-host");
      const stored = await page.evaluate((key) => window.localStorage.getItem(key), WIDTH_KEY);
      assert.ok(ratio > 0.42 && ratio < 0.58, `width ratio ${ratio.toFixed(2)}, stored ${stored}`);
      assert.equal(
        await page.locator("#side-panel-launcher, #file-preview-panel .right-panel-resizer:visible").count(),
        0,
      );
      const sash = await page.locator(".project-dock-surface .dv-sash").count();
      assert.ok(sash >= 1, "no resize edge");
      return `ratio ${ratio.toFixed(2)}`;
    });

    await step("the pin is saved when it changes, with no other layout change", async () => {
      const group = page.locator(".dv-groupview").filter({ has: previews(page) });
      await group.getByRole("button", { name: "Pin the panel so it stays open" }).dispatchEvent("click");
      await group.getByRole("button", { name: "Unpin the panel" }).waitFor({ state: "attached", timeout: WAIT_MS });
      await until(
        page,
        "the pin is saved",
        () => savedPinnedPanels(page),
        (count) => count === 1,
        3000,
      );
      await group.getByRole("button", { name: "Unpin the panel" }).dispatchEvent("click");
      await group
        .getByRole("button", { name: "Pin the panel so it stays open" })
        .waitFor({ state: "attached", timeout: WAIT_MS });
      await until(
        page,
        "the unpin is saved",
        () => savedPinnedPanels(page),
        (count) => count === 0,
        3000,
      );
    });

    await step("drag resize saves the size and the next preview uses it", async () => {
      const box = await page.locator(".project-dock-surface .dv-sash").first().boundingBox();
      assert.ok(box, "no sash box");
      const y = box.y + box.height / 2;
      const x = box.x + box.width / 2;
      await page.mouse.move(x, y);
      await page.mouse.down();
      await page.mouse.move(x - 160, y, { steps: 8 });
      await page.mouse.up();
      const saved = await until(
        page,
        "saved width",
        () => page.evaluate((key) => Number(window.localStorage.getItem(key) ?? "0.5"), WIDTH_KEY),
        (value) => Math.abs(value - 0.5) > 0.03,
      );
      await page
        .locator(".dv-groupview")
        .filter({ has: previews(page) })
        .getByRole("button", { name: "Close the panel" })
        .dispatchEvent("click");
      await previews(page).waitFor({ state: "detached", timeout: WAIT_MS });
      await openContent(page, {
        kind: "preview",
        projectId: ref.projectId,
        title: "readme.md",
        data: { origin: "agent", source: "workspace", path: "readme.md", agentId: ref.agentId, chatId: ref.chatId },
        activate: false,
      });
      await previews(page).waitFor({ state: "visible", timeout: WAIT_MS });
      await page.waitForTimeout(600);
      const ratio = await groupWidthRatio(page, ".project-preview-host");
      assert.ok(Math.abs(ratio - saved) < 0.05, `reopened ${ratio.toFixed(2)} vs saved ${saved.toFixed(2)}`);
      return `saved ${saved.toFixed(2)}, reopened ${ratio.toFixed(2)}`;
    });

    await step("clicking in the chat input closes an unpinned preview", async () => {
      await chatPanels(page).first().getByRole("textbox").first().click();
      await previews(page).waitFor({ state: "detached", timeout: WAIT_MS });
    });

    await step("pin keeps the preview open when the chat input is clicked", async () => {
      await openContent(page, {
        kind: "preview",
        projectId: ref.projectId,
        title: "readme.md",
        data: { origin: "agent", source: "workspace", path: "readme.md", agentId: ref.agentId, chatId: ref.chatId },
        activate: false,
      });
      await previews(page).waitFor({ state: "visible", timeout: WAIT_MS });
      const group = page.locator(".dv-groupview").filter({ has: previews(page) });
      await group.getByRole("button", { name: "Pin the panel so it stays open" }).dispatchEvent("click");
      await group.getByRole("button", { name: "Unpin the panel" }).waitFor({ state: "attached", timeout: WAIT_MS });
      await chatPanels(page).first().getByRole("textbox").first().click();
      await page.waitForTimeout(800);
      assert.equal(await previews(page).count(), 1, "pinned preview closed");
      await page.waitForTimeout(500);
      screens.push(await shot(page, "preview-pinned-dark"));
    });

    await step("a pinned preview stays after the agent is done and a chat switch", async () => {
      await chatPanels(page).first().getByRole("textbox").first().click();
      await page.keyboard.type("Second question");
      await page.keyboard.press("Enter");
      await until(
        page,
        "second chat row",
        () => column(page).locator(".project-chat-row").count(),
        (count) => count >= 1,
      );
      await until(
        page,
        "second turn running",
        () => column(page).locator(".project-chat-row").first().innerText(),
        (text) => /running|queued/i.test(text),
      );
      await until(
        page,
        "second turn done",
        () => column(page).locator(".project-chat-row").first().innerText(),
        (text) => !/running|queued/i.test(text),
      );
      await page.waitForTimeout(800);
      assert.equal(await previews(page).count(), 1, "pinned preview closed");
    });

    await step("unpin, then the preview closes on the next chat input click", async () => {
      const group = page.locator(".dv-groupview").filter({ has: previews(page) });
      await group.getByRole("button", { name: "Unpin the panel" }).dispatchEvent("click");
      await group
        .getByRole("button", { name: "Pin the panel so it stays open" })
        .waitFor({ state: "attached", timeout: WAIT_MS });
      await chatPanels(page).first().getByRole("textbox").first().click();
      await previews(page).waitFor({ state: "detached", timeout: WAIT_MS });
    });

    await step("preview screenshots in both themes", async () => {
      await openContent(page, {
        kind: "preview",
        projectId: ref.projectId,
        title: "readme.md",
        data: { origin: "user", source: "workspace", path: "readme.md", agentId: ref.agentId, chatId: ref.chatId },
        activate: false,
      });
      await previews(page).waitFor({ state: "visible", timeout: WAIT_MS });
      await page.getByText("The agent wrote this document.").waitFor({ state: "visible", timeout: WAIT_MS });
      await dismissToasts(page);
      for (const theme of ["dark", "light"] as const) {
        await setTheme(page, theme);
        screens.push(await shot(page, `preview-open-${theme}`));
      }
      const group = page.locator(".dv-groupview").filter({ has: previews(page) });
      await group.getByRole("button", { name: "Pin the panel so it stays open" }).dispatchEvent("click");
      await group.getByRole("button", { name: "Unpin the panel" }).waitFor({ state: "attached", timeout: WAIT_MS });
      for (const theme of ["light", "dark"] as const) {
        await setTheme(page, theme);
        screens.push(await shot(page, `preview-pinned-${theme}`));
      }
      await group.getByRole("button", { name: "Unpin the panel" }).dispatchEvent("click");
      await chatPanels(page).first().getByRole("textbox").first().click();
      await previews(page).waitFor({ state: "detached", timeout: WAIT_MS });
    });

    await step("switching to another chat closes an unpinned preview", async () => {
      await column(page).getByRole("button", { name: "New chat" }).click();
      await page.waitForTimeout(800);
      await sendInChat(page, "Third question");
      await until(
        page,
        "two chats",
        () => readChats(page, name),
        (list) => list.length >= 2,
      );
      await page.waitForTimeout(800);
      await openContent(page, {
        kind: "preview",
        projectId: ref.projectId,
        title: "readme.md",
        data: { origin: "user", source: "workspace", path: "readme.md", agentId: ref.agentId },
        activate: false,
      });
      await previews(page).waitFor({ state: "visible", timeout: WAIT_MS });
      await column(page).locator(".project-chat-row").filter({ hasText: "First question" }).first().click();
      await previews(page).waitFor({ state: "detached", timeout: WAIT_MS });
    });

    await step("switching project closes an unpinned preview; a pinned one comes back", async () => {
      await createProject(page, `${name} Two`, second);
      await projectButton(page, name).click();
      await chatPanels(page).first().waitFor({ state: "visible", timeout: WAIT_MS });
      await openContent(page, {
        kind: "preview",
        projectId: ref.projectId,
        title: "readme.md",
        data: { origin: "user", source: "workspace", path: "readme.md", agentId: ref.agentId },
        activate: false,
        pinned: true,
      });
      await previews(page).waitFor({ state: "visible", timeout: WAIT_MS });
      await projectButton(page, `${name} Two`).click();
      await previews(page).waitFor({ state: "detached", timeout: WAIT_MS });
      await projectButton(page, name).click();
      await previews(page).waitFor({ state: "visible", timeout: WAIT_MS });
      const group = page.locator(".dv-groupview").filter({ has: previews(page) });
      await group.getByRole("button", { name: "Unpin the panel" }).dispatchEvent("click");
      await projectButton(page, `${name} Two`).click();
      await projectButton(page, name).click();
      await chatPanels(page).first().waitFor({ state: "visible", timeout: WAIT_MS });
      assert.equal(await previews(page).count(), 0, "unpinned preview came back");
    });

    await step("an agent browser page opens as a dock panel and closes when the agent is done", async () => {
      const known = new Set((await readChats(page, name)).map((entry) => entry.chatId));
      await column(page).getByRole("button", { name: "New chat" }).click();
      await page.waitForTimeout(800);
      await chatPanels(page).first().getByRole("textbox").first().waitFor({ state: "visible", timeout: WAIT_MS });
      await sendInChat(page, "Open the page");
      const fresh = await until(
        page,
        "new chat",
        async () => (await readChats(page, name)).filter((entry) => !known.has(entry.chatId)),
        (list) => list.length >= 1,
      );
      const source = fresh[0];
      assert.ok(source, "no new chat");
      await until(
        page,
        "first turn done",
        () => column(page).locator(".project-chat-row").filter({ hasText: "Open the page" }).first().innerText(),
        (text) => !/running|queued/i.test(text),
      );
      await sendInChat(page, "Second message");
      await until(
        page,
        "second turn running",
        () => column(page).locator(".project-chat-row").filter({ hasText: "Open the page" }).first().innerText(),
        (text) => /running|queued/i.test(text),
      );
      await page.evaluate(
        ({ url, agentId, threadId }) =>
          window.codebot.browser.open({ url, ownerAgentId: agentId, ownerThreadId: threadId, focus: true }),
        { url: pageUrl, agentId: source.agentId, threadId: source.threadId },
      );
      await browsers(page).waitFor({ state: "visible", timeout: WAIT_MS });
      const ratio = await groupWidthRatio(page, ".project-browser-panel");
      assert.ok(ratio > 0.2 && ratio < 0.8, `browser ratio ${ratio.toFixed(2)}`);
      await browsers(page).waitFor({ state: "detached", timeout: WAIT_MS });
    });

    await step("browser panel has address bar, back, forward, reload and the control toggle", async () => {
      await page.getByRole("button", { name: "Add a panel", exact: true }).first().click();
      await page
        .getByRole("menuitem", { name: "Browser", exact: true })
        .waitFor({ state: "visible", timeout: WAIT_MS });
      await page.keyboard.press("Escape");
      await openContent(page, {
        kind: "browser",
        projectId: ref.projectId,
        title: "Browser",
        data: { origin: "user", url: pageUrl, agentId: ref.agentId },
        activate: true,
        pinned: true,
      });
      const panel = browsers(page);
      await panel.waitFor({ state: "visible", timeout: WAIT_MS });
      const address = panel.getByRole("textbox", { name: "Browser address" });
      await address.waitFor({ state: "visible", timeout: WAIT_MS });
      for (const label of ["Go back", "Go forward", "Reload page", "Take control of the page"])
        await panel.getByRole("button", { name: label }).waitFor({ state: "visible", timeout: WAIT_MS });
      await address.fill(pageUrl);
      await address.press("Enter");
      await until(
        page,
        "page loaded",
        () => page.evaluate(() => window.codebot.browser.listTabs()),
        (tabs) => tabs.some((tab) => tab.url.startsWith("http://127.0.0.1") && !tab.loading),
      );
      const toggle = panel.getByRole("button", { name: "Take control of the page" });
      await toggle.click();
      await panel
        .getByRole("button", { name: "Hand control to the agent" })
        .waitFor({ state: "visible", timeout: WAIT_MS });
      const held = await page.evaluate(() => window.codebot.browser.listTabs());
      assert.ok(
        held.some((tab) => tab.userControl === true),
        "tab is not user controlled",
      );
      screens.push(await shot(page, "browser-panel-dark"));
      await setTheme(page, "light");
      screens.push(await shot(page, "browser-panel-light"));
      await setTheme(page, "dark");
      await panel.getByRole("button", { name: "Hand control to the agent" }).click();
      await panel
        .getByRole("button", { name: "Take control of the page" })
        .waitFor({ state: "visible", timeout: WAIT_MS });
      const group2 = page.locator(".dv-groupview").filter({ has: browsers(page) });
      assert.ok(
        (await group2.getByRole("button", { name: "Unpin the panel" }).count()) === 1,
        "browser added by the user is pinned",
      );
    });

    await step("a browser panel closed by the user leaves no stray panel", async () => {
      const group = page.locator(".dv-groupview").filter({ has: browsers(page) });
      await group.getByRole("button", { name: "Close the panel" }).dispatchEvent("click");
      await browsers(page).waitFor({ state: "detached", timeout: WAIT_MS });
    });

    process.stdout.write(`screens: ${screens.join(", ")}\n`);
  } finally {
    await viewport.send("Emulation.clearDeviceMetricsOverride").catch(() => undefined);
    server.close();
    await closeAllTabs(page).catch(() => undefined);
    await page
      .evaluate(() => window.codebot.setAppAppearancePreference({ appearance: "dark", palette: "codebot-dark" }))
      .catch(() => undefined);
    await session.close();
    const reportPath = writeReport("w14", { passed: checks.every((entry) => entry.passed), checks, screens });
    process.stdout.write(`report: ${reportPath}\n`);
  }
  if (!checks.every((entry) => entry.passed)) process.exitCode = 1;
}

await main();
