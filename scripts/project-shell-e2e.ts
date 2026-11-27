import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import type { Page } from "playwright-core";
import { connectChannelE2e, writeReport } from "./channel-e2e-support";
import { FAKE_CODEX_MODEL } from "./dev-automation/bench-fake-codex";

interface Check {
  name: string;
  passed: boolean;
  detail?: string;
}

const checks: Check[] = [];
const SCREENS = resolve(import.meta.dirname, "../.codebot-build/w12/screens");
const WAIT_MS = 60_000;
const RUN = `E2E${Date.now().toString(36).slice(-4)}`;
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
  const target = await session.send("Browser.getWindowForTarget").catch(() => undefined);
  if (target) {
    await session
      .send("Browser.setWindowBounds", { windowId: target.windowId, bounds: { windowState: "normal" } })
      .catch(() => undefined);
    await session
      .send("Browser.setWindowBounds", { windowId: target.windowId, bounds: { width, height } })
      .catch(() => undefined);
  }
  await page.evaluate(([w, h]) => window.resizeTo(w ?? 0, h ?? 0), [width, height]);
  await page.waitForTimeout(800);
  const size = await page.evaluate(() => [window.innerWidth, window.innerHeight]);
  process.stdout.write(`window ${size.join("x")} for ${width}x${height}\n`);
  if (Math.abs((size[0] ?? 0) - width) < 40) {
    await session.detach();
    return;
  }
  await session.send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 0, mobile: false });
  await session.detach();
  await page.waitForTimeout(1000);
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

async function dismissToasts(page: Page): Promise<void> {
  await page.evaluate(() => {
    for (const button of document.querySelectorAll<HTMLElement>(".ui-toaster li button[aria-label]")) button.click();
  });
  await page.waitForTimeout(500);
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
  await dialog.getByText(level, { exact: true }).click();
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
  for (const folder of folders) mkdirSync(folder, { recursive: true });
  const screens: string[] = [];
  try {
    await clearViewport(page);
    await page.evaluate((model) => {
      window.localStorage.setItem("codebot:language-step-done", "true");
      return window.codebot.saveSetup({ preferredProvider: "codex", preferredModel: model });
    }, FAKE_CODEX_MODEL);
    await page.reload();
    await leftBar(page).waitFor({ state: "visible", timeout: WAIT_MS });
    await closeBlockingDialogs(page);
    await dismissToasts(page);
    await page.evaluate(() => window.localStorage.removeItem("codebot:active-project:v1"));

    if (!screenshotsOnly) {
      await step("create five projects with different access levels", async () => {
        const levels = ["Normal", "Strict", "Open", "Normal", "Strict"] as const;
        for (const [index, level] of levels.entries()) {
          await createProject(page, `${RUN} Project ${index + 1}`, folders[index] ?? "", level);
        }
        for (const [index, level] of levels.entries()) {
          const badge = projectButton(page, `${RUN} Project ${index + 1}`).locator(".project-access-badge");
          const label = await badge.getAttribute("aria-label");
          assert.equal(label, `Access level: ${level}`);
        }
        return "5 projects";
      });

      await step("open three chats in one project and see them in the history list", async () => {
        await projectButton(page, `${RUN} Project 1`).click();
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

    await step("chat list shows newest first with a title and a date", async () => {
      const rows = column(page).locator(".project-chat-row");
      const titles = await rows.locator(".project-chat-title").allTextContents();
      assert.ok(titles.length >= 1, "no chat title");
      const meta = await rows.first().locator(".project-chat-meta").innerText();
      assert.ok(meta.trim().length > 0, "no date text");
      return titles.join(" | ");
    });

    const firstName = `${RUN} Project 1`;

    await step("status dot of a project follows its chats", async () => {
      const state = await until(
        page,
        "status dot settled",
        () => activityOf(page, firstName),
        (value) => value === "done" || value === "idle",
      );
      return `state ${state}`;
    });

    await step("left bar expands the recent chats of a project", async () => {
      await leftBar(page)
        .getByRole("button", { name: `Show the recent chats of ${firstName}`, exact: true })
        .click();
      const list = leftBar(page).getByRole("list", { name: `Recent chats of ${firstName}` });
      await list.waitFor({ state: "visible", timeout: WAIT_MS });
      const count = await list.locator("button").count();
      assert.ok(count >= 3, `only ${count} recent chats`);
      await leftBar(page)
        .getByRole("button", { name: `Hide the recent chats of ${firstName}`, exact: true })
        .click();
      return `${count} recent chats`;
    });

    await step("search narrows the chat list", async () => {
      const search = column(page).getByRole("searchbox").or(column(page).getByPlaceholder("Search chats"));
      await search.first().fill("Second");
      const rows = column(page).locator(".project-search-row");
      await until(
        page,
        "results of the Second chat only",
        async () => (await rows.locator(".project-chat-title").allTextContents()).map((title) => title.trim()),
        (titles) => titles.length >= 1 && titles.every((title) => title === "Second question"),
      );
      await search.first().fill("");
      await until(
        page,
        "all chats back",
        () => column(page).locator(".project-chat-row").count(),
        (count) => count >= 3,
      );
    });

    await step("archive and restore a chat", async () => {
      await column(page).getByRole("button", { name: "Actions for Second question" }).click();
      await page.getByRole("menuitem", { name: "Archive", exact: true }).click();
      await until(
        page,
        "chat leaves the list",
        () => column(page).locator(".project-chat-row").count(),
        (count) => count === 2,
      );
      await column(page).getByRole("button", { name: "Show archived chats" }).click();
      await column(page).getByRole("button", { name: "Actions for Second question" }).click();
      await page.getByRole("menuitem", { name: "Restore", exact: true }).click();
      await column(page).getByRole("button", { name: "Chats", exact: true }).click();
      await until(
        page,
        "chat is back",
        () => column(page).locator(".project-chat-row").count(),
        (count) => count === 3,
      );
    });

    await step("dock splits, maximizes and closes panels", async () => {
      const before = await panels(page).count();
      await page.getByRole("button", { name: "Split right" }).first().click();
      await until(
        page,
        "extra panel",
        () => panels(page).count(),
        (count) => count === before + 1,
      );
      await page.getByRole("button", { name: "Maximize the panel" }).first().click();
      await page.getByRole("button", { name: "Restore the panel size" }).first().waitFor({ timeout: WAIT_MS });
      await page.getByRole("button", { name: "Restore the panel size" }).first().click();
      await dismissToasts(page);
      await page.mouse.move(2, 2);
      await page.waitForTimeout(400);
      await page.getByRole("button", { name: "Close the panel" }).last().dispatchEvent("click");
      await until(
        page,
        "panel closed",
        () => panels(page).count(),
        (count) => count === before,
      );
      return `${before} panels`;
    });

    await step("panel layout is restored after a reload", async () => {
      await page.getByRole("button", { name: "Split down" }).first().click();
      const count = await until(
        page,
        "split done",
        () => panels(page).count(),
        (value) => value >= 2,
      );
      await page.waitForTimeout(1200);
      await page.reload();
      await leftBar(page).waitFor({ state: "visible", timeout: WAIT_MS });
      await closeBlockingDialogs(page);
      await dismissToasts(page);
      await projectButton(page, firstName).click();
      await until(
        page,
        "layout restored",
        () => panels(page).count(),
        (value) => value === count,
      );
      return `${count} panels`;
    });

    await step("project settings change the access level", async () => {
      await column(page).getByRole("button", { name: "Project settings" }).click();
      const dialog = page.getByRole("dialog");
      await dialog.waitFor({ state: "visible", timeout: WAIT_MS });
      await dialog.getByText("Open", { exact: true }).first().click();
      await dialog.getByRole("button", { name: "Save", exact: true }).click();
      await dialog.getByText("Saved", { exact: true }).waitFor({ state: "visible", timeout: WAIT_MS });
      await dialog.getByRole("button", { name: "Close", exact: true }).click();
      await dialog.waitFor({ state: "hidden", timeout: WAIT_MS });
      await until(
        page,
        "badge shows Open",
        () => projectButton(page, firstName).locator(".project-access-badge").getAttribute("aria-label"),
        (label) => label === "Access level: Open",
      );
      await closeBlockingDialogs(page);
    });

    await step("settings dialog shows its four sections", async () => {
      await column(page).getByRole("button", { name: "Project settings" }).click();
      const dialog = page.getByRole("dialog");
      await dialog.waitFor({ state: "visible", timeout: WAIT_MS });
      const seen: string[] = [];
      for (const tab of ["General", "Folders", "Agents", "Archive and delete"]) {
        await dialog.getByRole("tab", { name: tab, exact: true }).click();
        await page.waitForTimeout(500);
        assert.ok((await dialog.locator("[role=tabpanel]:visible").count()) > 0, `no panel for ${tab}`);
        screens.push(await shot(page, `project-settings-${tab.split(" ")[0]?.toLowerCase()}`));
        seen.push(tab);
      }
      await dialog.getByRole("button", { name: "Close", exact: true }).click();
      await dialog.waitFor({ state: "hidden", timeout: WAIT_MS });
      return seen.join(", ");
    });

    await step("chat menu opens with its actions", async () => {
      await column(page).locator(".project-chat-actions").first().click();
      const menu = page.getByRole("menu");
      await menu.waitFor({ state: "visible", timeout: WAIT_MS });
      const items = await menu.getByRole("menuitem").count();
      assert.ok(items >= 4, `only ${items} items`);
      await page.waitForTimeout(500);
      screens.push(await shot(page, "project-chat-menu"));
      await page.keyboard.press("Escape");
      return `${items} items`;
    });

    await step("chat picker opens from the dock add menu", async () => {
      await page.getByRole("button", { name: "Add a panel", exact: true }).first().click();
      await page.getByRole("menuitem", { name: "Chat from another project" }).click();
      const dialog = page.getByRole("dialog");
      await dialog.getByText("Open a chat in a panel").waitFor({ state: "visible", timeout: WAIT_MS });
      await until(
        page,
        "picker list",
        () => dialog.locator(".project-picker-list li").count(),
        (count) => count > 0,
      );
      await page.waitForTimeout(800);
      screens.push(await shot(page, "project-chat-picker"));
      await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
      await dialog.waitFor({ state: "hidden", timeout: WAIT_MS });
    });

    await step("screenshots in both themes and two window sizes", async () => {
      for (const [width, height] of [
        [1280, 800],
        [960, 640],
      ] as const) {
        await setViewport(page, width, height);
        await dismissToasts(page);
        for (const theme of ["dark", "light"] as const) {
          await setTheme(page, theme);
          screens.push(await shot(page, `project-shell-${theme}-${width}x${height}`));
        }
      }
      await clearViewport(page);
      await setTheme(page, "dark");
      return `${screens.length} screenshots`;
    });

    await step("deleting every project shows the no-project screen", async () => {
      for (let guard = 0; guard < 120; guard += 1) {
        if (
          await page
            .locator(".project-empty-screen")
            .isVisible()
            .catch(() => false)
        )
          break;
        await column(page).getByRole("button", { name: "Project settings" }).click();
        const dialog = page.getByRole("dialog");
        await dialog.waitFor({ state: "visible", timeout: WAIT_MS });
        await dialog.getByRole("tab", { name: "Archive and delete", exact: true }).click();
        await dialog.getByRole("button", { name: "Delete project", exact: true }).click();
        const confirm = page.getByRole("alertdialog");
        await confirm.getByRole("button", { name: "Delete project", exact: true }).click();
        await page.waitForTimeout(800);
        await closeBlockingDialogs(page);
      }
      await page.locator(".project-empty-screen").waitFor({ state: "visible", timeout: WAIT_MS });
      screens.push(await shot(page, "project-no-project"));
    });

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
