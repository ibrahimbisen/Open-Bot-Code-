import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import type { CDPSession, Page } from "playwright-core";
import { connectChannelE2e, writeReport } from "./channel-e2e-support";
import { FAKE_CODEX_MODEL } from "./dev-automation/bench-fake-codex";

interface Check {
  name: string;
  passed: boolean;
  detail?: string;
}

interface Edges {
  sendRight: number;
  sendVisible: boolean;
  viewportWidth: number;
  clippedHeaders: string[];
  textboxWidth: number;
}

const checks: Check[] = [];
const SCREENS = resolve(import.meta.dirname, "../.codebot-build/c3/screens");
const WAIT_MS = 60_000;
const RUN = `L${Date.now().toString(36).slice(-4)}`;

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

let overrideSession: CDPSession | undefined;

async function setWindowSize(page: Page, width: number, height: number): Promise<void> {
  await overrideSession?.detach().catch(() => undefined);
  overrideSession = undefined;
  const session = await page.context().newCDPSession(page);
  const target = await session.send("Browser.getWindowForTarget").catch(() => undefined);
  if (target) {
    await session
      .send("Browser.setWindowBounds", { windowId: target.windowId, bounds: { windowState: "normal" } })
      .catch(() => undefined);
    await session
      .send("Browser.setWindowBounds", { windowId: target.windowId, bounds: { width, height } })
      .catch(() => undefined);
  }
  await page.waitForTimeout(800);
  const size = await page.evaluate(() => [window.innerWidth, window.innerHeight]);
  if (Math.abs((size[0] ?? 0) - width) >= 40) {
    await session.send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 0, mobile: false });
    overrideSession = session;
  } else {
    await session.detach();
  }
  await page.waitForTimeout(800);
}

async function clearViewport(page: Page): Promise<void> {
  const session = await page.context().newCDPSession(page);
  await session.send("Emulation.clearDeviceMetricsOverride");
  await session.detach();
}

async function setTheme(page: Page, appearance: "light" | "dark"): Promise<void> {
  await page.evaluate(
    (value) => window.codebot.setAppAppearancePreference({ appearance: value, palette: `codebot-${value}` }),
    appearance,
  );
  await page.waitForFunction((value) => document.documentElement.dataset.codebotColorScheme === value, appearance);
  await page.waitForTimeout(1200);
}

async function shot(page: Page, name: string): Promise<string> {
  await page.evaluate(() => {
    for (const button of document.querySelectorAll<HTMLElement>(".ui-toaster li button[aria-label]")) button.click();
  });
  await page.waitForTimeout(600);
  mkdirSync(SCREENS, { recursive: true });
  const path = join(SCREENS, `${name}.png`);
  await page.screenshot({ path });
  return path;
}

const leftBar = (page: Page) => page.getByRole("navigation", { name: "Project list" });
const column = (page: Page) => page.locator("#project-column");
const chatPanels = (page: Page) => page.locator(".project-chat-panel:visible");

async function measure(page: Page): Promise<Edges> {
  return page.evaluate(() => {
    const send = [...document.querySelectorAll<HTMLElement>(".project-chat-panel button")]
      .filter((button) => button.getBoundingClientRect().width > 0)
      .find((button) => /send message/i.test(button.getAttribute("aria-label") ?? ""));
    const sendBox = send?.getBoundingClientRect();
    const clippedHeaders: string[] = [];
    for (const group of document.querySelectorAll<HTMLElement>(".dv-groupview")) {
      const groupBox = group.getBoundingClientRect();
      if (groupBox.width === 0) continue;
      const actions = group.querySelector<HTMLElement>(".dv-right-actions-container");
      const actionsBox = actions?.getBoundingClientRect();
      const tabs = group.querySelector<HTMLElement>(".dv-tabs-container");
      const tabsBox = tabs?.getBoundingClientRect();
      if (actionsBox && actionsBox.right > groupBox.right + 1) clippedHeaders.push("actions past the group edge");
      if (actionsBox && actionsBox.left < groupBox.left - 1) clippedHeaders.push("actions before the group edge");
      if (actionsBox && tabsBox && tabsBox.right > actionsBox.left + 1) clippedHeaders.push("tabs overlap the actions");
      for (const button of group.querySelectorAll<HTMLElement>(".dv-right-actions-container button")) {
        const box = button.getBoundingClientRect();
        if (box.width > 0 && (box.right > groupBox.right + 1 || box.left < groupBox.left - 1))
          clippedHeaders.push(`button ${button.getAttribute("aria-label") ?? ""} outside the group`);
      }
    }
    const textbox = document
      .querySelector<HTMLElement>(".project-chat-panel .composer-editor-surface")
      ?.getBoundingClientRect();
    return {
      sendRight: sendBox?.right ?? -1,
      sendVisible: sendBox !== undefined && sendBox.right <= window.innerWidth + 0.5 && sendBox.width > 0,
      viewportWidth: window.innerWidth,
      clippedHeaders,
      textboxWidth: textbox?.width ?? 0,
    };
  });
}

function assertFits(edges: Edges): string {
  assert.ok(edges.sendVisible, `send button right edge ${edges.sendRight} of ${edges.viewportWidth}`);
  assert.deepEqual(edges.clippedHeaders, [], "panel tab header is cut off");
  assert.ok(edges.textboxWidth >= 120, `composer text box is ${edges.textboxWidth}px wide`);
  return `send right ${Math.round(edges.sendRight)} of ${edges.viewportWidth}, text box ${Math.round(edges.textboxWidth)}px`;
}

async function main(): Promise<void> {
  const session = await connectChannelE2e("project-layout-e2e");
  const { page } = session;
  const root = await mkdtemp(join(tmpdir(), "codebot-project-layout-"));
  const folder = join(root, "project");
  mkdirSync(folder, { recursive: true });
  writeFileSync(join(folder, "readme.md"), "# Plan\n\nThe agent wrote this document.\n");
  const name = `${RUN} Layout`;
  const screens: string[] = [];
  try {
    await clearViewport(page);
    await page.evaluate((model) => {
      window.localStorage.setItem("codebot:language-step-done", "true");
      return window.codebot.saveSetup({ preferredProvider: "codex", preferredModel: model });
    }, FAKE_CODEX_MODEL);
    await setWindowSize(page, 1280, 800);
    await page.evaluate((input) => window.codebot.projects.create(input), {
      name,
      mainFolder: folder,
      accessLevel: "open" as const,
      agents: [{ name: "Dev", role: "Developer" }],
    });
    await page.reload();
    await leftBar(page).waitFor({ state: "visible", timeout: WAIT_MS });
    await leftBar(page)
      .getByRole("button", { name: `Open the project ${name}`, exact: true })
      .click();
    await column(page).getByRole("button", { name: "New chat" }).click();
    await chatPanels(page).first().waitFor({ state: "visible", timeout: WAIT_MS });
    const projectId = await page.evaluate(
      async (wanted) => (await window.codebot.projects.list()).find((entry) => entry.name === wanted)?.id ?? "",
      name,
    );
    await chatPanels(page).first().getByRole("textbox").first().click();
    await page.keyboard.type("First question");
    await page.waitForTimeout(600);
    await page.keyboard.press("Enter");
    await column(page).locator(".project-chat-row").first().waitFor({ state: "visible", timeout: WAIT_MS });
    const chat = await page.evaluate(async (id) => {
      const listed = await window.codebot.projects.listChats({ projectId: id, limit: 5 });
      const first = listed.chats[0];
      return first ? { agentId: first.agentId, chatId: first.taskId } : null;
    }, projectId);

    await setWindowSize(page, 960, 640);
    for (const theme of ["dark", "light"] as const) {
      await setTheme(page, theme);
      await step(`960x640 ${theme}: composer and chat header fit with no dock panel`, async () => {
        await page
          .locator(".project-chat-panel:visible button[aria-label*='Send message' i]")
          .first()
          .waitFor({ state: "visible", timeout: WAIT_MS });
        const detail = assertFits(await measure(page));
        screens.push(await shot(page, `layout-960x640-${theme}-chat`));
        return detail;
      });
      await step(`960x640 ${theme}: composer and tab header fit with a preview panel open`, async () => {
        assert.ok(chat, "no chat");
        await page.evaluate((value) => window.__codebotProjectDock?.openContent(value), {
          kind: "preview" as const,
          projectId,
          title: "readme.md",
          data: {
            origin: "agent",
            source: "workspace",
            path: "readme.md",
            agentId: chat.agentId,
            chatId: chat.chatId,
          },
          activate: false,
        });
        await page.locator(".project-preview-host").waitFor({ state: "visible", timeout: WAIT_MS });
        await page.waitForTimeout(1200);
        screens.push(await shot(page, `layout-960x640-${theme}-preview`));
        const previewWidth = await page
          .locator(".project-preview-host")
          .evaluate((element) => element.getBoundingClientRect().width);
        assert.ok(previewWidth >= 300, `preview is ${Math.round(previewWidth)}px wide`);
        const header = await measure(page);
        assert.deepEqual(header.clippedHeaders, [], "panel tab header is cut off");
        await page.locator(".dv-tab").filter({ hasNotText: "readme.md" }).first().click();
        await page.waitForTimeout(600);
        screens.push(await shot(page, `layout-960x640-${theme}-preview-chat-tab`));
        return `preview ${Math.round(previewWidth)}px; ${assertFits(await measure(page))}`;
      });
      await page.evaluate(() => window.__codebotProjectDock?.closeTransient("project-switch"));
      await page
        .locator(".project-preview-host")
        .waitFor({ state: "detached", timeout: WAIT_MS })
        .catch(() => undefined);
    }
    await setTheme(page, "dark");
    process.stdout.write(`screens: ${screens.join(", ")}\n`);
  } finally {
    await clearViewport(page).catch(() => undefined);
    await session.close();
    const reportPath = writeReport("c3-layout", { passed: checks.every((entry) => entry.passed), checks, screens });
    process.stdout.write(`report: ${reportPath}\n`);
  }
  if (!checks.every((entry) => entry.passed)) process.exitCode = 1;
}

await main();
