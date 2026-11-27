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
const SCREENS = resolve(import.meta.dirname, "../.codebot-build/w15/screens");
const WAIT_MS = 60_000;
const RUN = `SC${Date.now().toString(36).slice(-4)}`;
const MOD = process.platform === "darwin" ? "Meta" : "Control";
const STORAGE_KEY = "codebot:keyboard-shortcuts";

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

async function shot(page: Page, name: string): Promise<string> {
  mkdirSync(SCREENS, { recursive: true });
  const path = join(SCREENS, `${name}.png`);
  await page.screenshot({ path });
  return path;
}

const leftBar = (page: Page) => page.getByRole("navigation", { name: "Project list" });
const projectButton = (page: Page, name: string) =>
  leftBar(page).getByRole("button", { name: `Open the project ${name}`, exact: true });
const panels = (page: Page) => page.locator(".project-chat-panel");
const panelCount = (page: Page) => panels(page).count();

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
  await page.waitForTimeout(300);
}

async function createProject(page: Page, name: string, folder: string): Promise<void> {
  await page.getByRole("button", { name: "New project", exact: true }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Main folder").fill(folder);
  await dialog.getByLabel("Name", { exact: true }).fill(name);
  await dialog.getByText("Normal", { exact: true }).click();
  await dialog.getByRole("button", { name: "Create project" }).click();
  await projectButton(page, name).waitFor({ state: "visible", timeout: WAIT_MS });
}

async function activeProjectName(page: Page): Promise<string> {
  return page.evaluate(() => {
    const row = document.querySelector<HTMLElement>("nav[aria-label='Project list'] .project-row[data-active]");
    return row?.textContent?.trim() ?? "";
  });
}

async function storedShortcuts(page: Page): Promise<string> {
  return page.evaluate((key) => window.localStorage.getItem(key) ?? "", STORAGE_KEY);
}

async function openKeyboardSettings(page: Page): Promise<void> {
  await page.keyboard.press(`${MOD}+/`);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Change the shortcut for New chat", exact: true })
    .waitFor({ state: "attached", timeout: WAIT_MS });
}

async function main(): Promise<void> {
  const session = await connectChannelE2e("shortcuts-e2e");
  const { page } = session;
  const root = await mkdtemp(join(tmpdir(), "codebot-shortcuts-"));
  const names = [`${RUN} Alpha`, `${RUN} Beta`];
  const screens: string[] = [];
  try {
    await page.evaluate((key) => window.localStorage.removeItem(key), STORAGE_KEY);
    await page.reload();
    await leftBar(page).waitFor({ state: "visible", timeout: WAIT_MS });
    await closeBlockingDialogs(page);
    await dismissToasts(page);

    await step("create two projects", async () => {
      for (const [index, name] of names.entries()) await createProject(page, name, join(root, `project-${index + 1}`));
      await projectButton(page, names[0] ?? "").click();
      return names.join(", ");
    });

    await step("keyboard settings list the five new commands", async () => {
      await openKeyboardSettings(page);
      const dialog = page.getByRole("dialog");
      for (const title of [
        "New chat",
        "Switch to the next project",
        "Split the panel",
        "Close the panel",
        "Open the command menu",
      ]) {
        const button = dialog.getByRole("button", { name: `Change the shortcut for ${title}`, exact: true });
        await button.scrollIntoViewIfNeeded();
        assert.ok(await button.isVisible(), `row missing: ${title}`);
      }
      await page.waitForTimeout(500);
      screens.push(await shot(page, "keyboard-settings-defaults"));
      await closeBlockingDialogs(page);
      return "5 rows";
    });

    await step("default shortcut new chat opens a chat panel", async () => {
      const before = await panelCount(page);
      await page.keyboard.press(`${MOD}+Shift+N`);
      await until(
        page,
        "chat panel",
        () => panelCount(page),
        (count) => count > before,
      );
      return `${before} -> ${await panelCount(page)}`;
    });

    await step("default shortcut split panel adds a panel", async () => {
      const before = await panelCount(page);
      await page.keyboard.press(`${MOD}+Shift+D`);
      await until(
        page,
        "split panel",
        () => panelCount(page),
        (count) => count === before + 1,
      );
      return `${before} -> ${before + 1}`;
    });

    await step("default shortcut close panel removes the active panel", async () => {
      const before = await panelCount(page);
      await page.keyboard.press(`${MOD}+Shift+X`);
      await until(
        page,
        "close panel",
        () => panelCount(page),
        (count) => count === before - 1,
      );
      return `${before} -> ${before - 1}`;
    });

    await step("default shortcut switch project selects the next project", async () => {
      const before = await activeProjectName(page);
      await page.keyboard.press(`${MOD}+Shift+J`);
      const after = await until(
        page,
        "project switch",
        () => activeProjectName(page),
        (name) => name !== before,
      );
      return `${before} -> ${after}`;
    });

    await step("default shortcut command menu opens the menu", async () => {
      await page.keyboard.press(`${MOD}+Shift+P`);
      await page.getByRole("dialog").waitFor({ state: "visible", timeout: WAIT_MS });
      await page.waitForTimeout(500);
      screens.push(await shot(page, "command-menu-open"));
      await closeBlockingDialogs(page);
      await page.getByRole("dialog").waitFor({ state: "hidden", timeout: WAIT_MS });
      return undefined;
    });

    await step("shortcuts do not type into the chat box", async () => {
      const editor = panels(page).first().getByRole("textbox").first();
      await editor.click();
      await page.keyboard.type("abc");
      await page.keyboard.press(`${MOD}+Shift+J`);
      const text = await editor.innerText().catch(() => "");
      assert.ok(!/j/iu.test(text), `a shortcut typed into the chat box: ${text}`);
      return undefined;
    });

    await step("changing split panel to a new key stores it", async () => {
      await closeBlockingDialogs(page);
      await openKeyboardSettings(page);
      const dialog = page.getByRole("dialog");
      const button = dialog.getByRole("button", { name: "Change the shortcut for Split the panel", exact: true });
      await button.scrollIntoViewIfNeeded();
      await button.click();
      await page.keyboard.press(`${MOD}+Shift+Y`);
      const stored = await until(
        page,
        "stored override",
        () => storedShortcuts(page),
        (value) => value.includes("KeyY"),
      );
      assert.ok(stored.includes("splitPanel"), `unexpected storage ${stored}`);
      await button.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
      screens.push(await shot(page, "keyboard-settings-changed"));
      await closeBlockingDialogs(page);
      return stored;
    });

    await step("the new split key works and the old one does not", async () => {
      await panels(page).first().waitFor({ state: "visible", timeout: WAIT_MS });
      const before = await panelCount(page);
      await page.keyboard.press(`${MOD}+Shift+D`);
      await page.waitForTimeout(1200);
      assert.equal(await panelCount(page), before, "the old shortcut still splits the panel");
      await page.keyboard.press(`${MOD}+Shift+Y`);
      await until(
        page,
        "split with new key",
        () => panelCount(page),
        (count) => count === before + 1,
      );
      return `${before} -> ${before + 1}`;
    });

    await step("the new key survives a reload", async () => {
      await page.reload();
      await leftBar(page).waitFor({ state: "visible", timeout: WAIT_MS });
      assert.ok((await storedShortcuts(page)).includes("KeyY"));
      return undefined;
    });

    await step("reset all restores the default", async () => {
      await closeBlockingDialogs(page);
      await openKeyboardSettings(page);
      await page.getByRole("dialog").getByRole("button", { name: "Reset all", exact: true }).click();
      await until(
        page,
        "storage cleared",
        () => storedShortcuts(page),
        (value) => value === "",
      );
      await closeBlockingDialogs(page);
      return undefined;
    });

    process.stdout.write(`screens: ${screens.join(", ")}\n`);
  } finally {
    await page.evaluate((key) => window.localStorage.removeItem(key), STORAGE_KEY).catch(() => undefined);
    await session.close();
    const reportPath = writeReport("w15", { passed: checks.every((entry) => entry.passed), checks, screens });
    process.stdout.write(`report: ${reportPath}\n`);
  }
  if (!checks.every((entry) => entry.passed)) process.exitCode = 1;
}

await main();
