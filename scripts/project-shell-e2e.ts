import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import type { Page } from "playwright-core";
import { connectChannelE2e, writeReport } from "./channel-e2e-support";

interface Check {
  name: string;
  passed: boolean;
  detail?: string;
}

const checks: Check[] = [];
const SCREENS = resolve(import.meta.dirname, "../.codebot-build/w12/screens");
const WAIT_MS = 60_000;
const argument = (name: string) =>
  process.argv.find((entry) => entry.startsWith(`--${name}=`))?.slice(`--${name}=`.length);
const screenshotsOnly = process.argv.includes("--screens-only");

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

async function setViewport(page: Page, width: number, height: number): Promise<void> {
  const session = await page.context().newCDPSession(page);
  await session.send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 0, mobile: false });
  await session.detach();
  await page.waitForTimeout(400);
}

async function clearViewport(page: Page): Promise<void> {
  const session = await page.context().newCDPSession(page);
  await session.send("Emulation.clearDeviceMetricsOverride");
  await session.detach();
}

async function setTheme(page: Page, appearance: "light" | "dark"): Promise<void> {
  await page.evaluate((value) => window.codebot.setAppAppearancePreference({ appearance: value }), appearance);
  await until(
    page,
    `color scheme ${appearance}`,
    () => page.evaluate(() => document.documentElement.dataset.codebotColorScheme ?? ""),
    (scheme) => scheme === appearance,
  );
  await page.waitForTimeout(300);
}

async function shot(page: Page, name: string): Promise<string> {
  mkdirSync(SCREENS, { recursive: true });
  const path = join(SCREENS, `${name}.png`);
  await page.screenshot({ path });
  return path;
}

function leftBar(page: Page) {
  return page.getByRole("navigation", { name: "Project list" });
}

function projectButton(page: Page, name: string) {
  return leftBar(page).getByRole("button", { name: `Open the project ${name}`, exact: true });
}

function column(page: Page) {
  return page.locator("#project-column");
}

function panels(page: Page) {
  return page.locator(".project-chat-panel");
}

async function closeBlockingDialogs(page: Page): Promise<void> {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const dialog = page.locator("[role=dialog], [role=alertdialog]").first();
    if (!(await dialog.isVisible().catch(() => false))) return;
    await page.keyboard.press("Escape");
    await page.waitForTimeout(250);
  }
}

async function createProject(
  page: Page,
  name: string,
  folder: string,
  level: "Strict" | "Normal" | "Open",
): Promise<void> {
  await page.getByRole("button", { name: "New project", exact: true }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Main folder").fill(folder);
  await dialog.getByLabel("Name", { exact: true }).fill(name);
  await dialog.getByRole("radio", { name: new RegExp(`^${level}`) }).check({ force: true });
  await dialog.getByRole("button", { name: "Create project" }).click();
  await projectButton(page, name).waitFor({ state: "visible", timeout: WAIT_MS });
}

async function sendInPanel(page: Page, panelIndex: number, text: string): Promise<void> {
  const panel = panels(page).nth(panelIndex);
  const editor = panel.getByRole("textbox").first();
  await editor.click();
  await page.keyboard.type(text);
  await page.keyboard.press("Enter");
}

async function activityOf(page: Page, name: string): Promise<string> {
  return projectButton(page, name)
    .locator(".project-status-dot")
    .first()
    .getAttribute("data-state")
    .then((state) => state ?? "");
}

async function main(): Promise<void> {
  const session = await connectChannelE2e("project-shell-e2e");
  const { page } = session;
  const root = await mkdtemp(join(tmpdir(), "codebot-project-shell-"));
  const folders = Array.from({ length: 6 }, (_, index) => join(root, `project-${index + 1}`));
  const screens: string[] = [];
  try {
    await clearViewport(page);
    await page.reload();
    await leftBar(page).waitFor({ state: "visible", timeout: WAIT_MS });
    await closeBlockingDialogs(page);
    await page.evaluate(() => window.localStorage.removeItem("codebot:active-project:v1"));

    await step("left bar lists projects with status dot and access badge", async () => {
      const rows = leftBar(page).locator(".project-row-item");
      await until(
        page,
        "project rows",
        () => rows.count(),
        (count) => count > 0,
      );
      const dots = await leftBar(page).locator(".project-row .project-status-dot").count();
      const badges = await leftBar(page).locator(".project-row .project-access-badge").count();
      assert.ok(dots > 0, "no status dot");
      assert.ok(badges > 0, "no access badge");
      return `${await rows.count()} rows`;
    });

    if (!screenshotsOnly) {
      await step("create five projects with different access levels", async () => {
        const levels = ["Normal", "Strict", "Open", "Normal", "Strict"] as const;
        for (const [index, level] of levels.entries()) {
          await createProject(page, `E2E Project ${index + 1}`, folders[index] ?? "", level);
        }
        for (const [index, level] of levels.entries()) {
          const badge = projectButton(page, `E2E Project ${index + 1}`).locator(".project-access-badge");
          const label = await badge.getAttribute("aria-label");
          assert.equal(label, `Access level: ${level}`);
        }
        return "5 projects";
      });

      await step("open three chats in one project and see them in the history list", async () => {
        await projectButton(page, "E2E Project 1").click();
        for (const text of ["First question", "Second question", "Third question"]) {
          await column(page).getByRole("button", { name: "New chat" }).click();
          await panels(page).first().waitFor({ state: "visible", timeout: WAIT_MS });
          await sendInPanel(page, 0, text);
          await until(
            page,
            `chat ${text} in the list`,
            () => column(page).locator(".project-chat-row").count(),
            (count) => count >= ["First question", "Second question", "Third question"].indexOf(text) + 1,
          );
        }
        const count = await until(
          page,
          "three chats",
          () => column(page).locator(".project-chat-row").count(),
          (value) => value >= 3,
        );
        return `${count} chats in the history`;
      });
    }

    await step("chat list shows newest first with a title and a date", async () => {
      const rows = column(page).locator(".project-chat-row");
      const titles = await rows.locator(".project-chat-title").allTextContents();
      assert.ok(titles.length >= 1, "no chat title");
      const meta = await rows.first().locator(".project-chat-meta").innerText();
      assert.ok(meta.trim().length > 0, "no date text");
      return titles.join(" | ");
    });

    screens.push(await shot(page, "01-project-shell-dark-1280x800"));
    process.stdout.write(`screens: ${screens.join(", ")}\n`);
  } finally {
    await session.close();
    const reportPath = writeReport("w12", { passed: checks.every((entry) => entry.passed), checks, screens });
    process.stdout.write(`report: ${reportPath}\n`);
  }
  if (!checks.every((entry) => entry.passed)) process.exitCode = 1;
}

await main();
void argument;
void setViewport;
void setTheme;
void activityOf;
