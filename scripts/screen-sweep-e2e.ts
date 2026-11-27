import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { join, relative, resolve } from "node:path";
import type { AppThemePalette } from "@codebot/contracts/app-appearance";
import { BUILT_IN_THEME_PALETTES } from "@codebot/contracts/app-theme-defaults";
import { translateFor } from "@codebot/i18n";
import type { Locator, Page } from "playwright-core";
import { PROJECT_COLORS } from "../src/renderer/src/features/projects/project-colors";
import { connectChannelE2e, writeReport } from "./channel-e2e-support";
import { FAKE_CODEX_MODEL } from "./dev-automation/bench-fake-codex";
import "./project-dock-hook";

interface Check {
  name: string;
  passed: boolean;
  detail?: string;
}

interface Screen {
  theme: string;
  size: string;
  name: string;
  file: string;
}

interface Variant {
  palette: AppThemePalette;
  theme: string;
  width: number;
  height: number;
}

const NAME = "screen-sweep";
const ROOT = resolve(import.meta.dirname, "..");
const OUT = resolve(ROOT, ".codebot-build/screens");
const WORKSPACE = resolve(ROOT, ".codebot-build/screen-sweep/workspace");
const SECOND_FOLDER = resolve(ROOT, ".codebot-build/screen-sweep/backend");
const WAIT_MS = 60_000;
const TURN_MS = 120_000;
const SETTINGS_PARTS_LIMIT = 8;
const english = translateFor("en");
const PROJECT = "Website";
const SECOND_PROJECT = "Backend";
const THIRD_PROJECT = "Docs";
const FIRST_CHAT = "Explain the server";
const LANGUAGE_STEP_KEY = "codebot:language-step-done";
const PREVIEW_WIDTH_KEY = "codebot:project-preview-width:v1";
const RAIL_FIXED = new Set([english("app.rail.more"), english("app.rail.settings"), "Projects", "Help"]);

const SERVER_SOURCE = `import { createServer } from "node:http";

interface Route {
  path: string;
  handler: (request: Request) => Response;
}

const routes: Route[] = [
  { path: "/health", handler: () => new Response("ok") },
  { path: "/count", handler: () => Response.json({ count: 42, ratio: 0.5 }) },
];

export function start(port = 3000): void {
  const pattern = /^\\/api\\/(\\w+)$/;
  createServer((req, res) => {
    const match = pattern.exec(req.url ?? "");
    res.end(match ? \`route \${match[1]}\` : "not found");
  }).listen(port);
  console.log(\`listening on \${port}\`, routes.length);
}
`;

const checks: Check[] = [];
const screens: Screen[] = [];
const numbers = new Map<string, number>();
const pageErrors: string[] = [];

function shortTheme(palette: AppThemePalette): string {
  return palette.id.replace(/^codebot-(?=dark-|light-|high-)/, "");
}

const ONLY = process.argv.find((value) => value.startsWith("--only="))?.slice("--only=".length) ?? null;
const SKIP_FRESH = process.argv.includes("--skip-fresh");

const ALL_VARIANTS: Variant[] = [
  ...BUILT_IN_THEME_PALETTES.map((palette) => ({ palette, theme: shortTheme(palette), width: 1280, height: 800 })),
  ...BUILT_IN_THEME_PALETTES.filter((palette) => palette.id === "codebot-dark" || palette.id === "codebot-light").map(
    (palette) => ({ palette, theme: shortTheme(palette), width: 960, height: 640 }),
  ),
];
const VARIANTS = ALL_VARIANTS.filter(
  (variant) => ONLY === null || `${variant.theme}/${variant.width}x${variant.height}` === ONLY,
);

function slug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

function numberOf(name: string): string {
  if (!numbers.has(name)) numbers.set(name, numbers.size + 1);
  return String(numbers.get(name)).padStart(2, "0");
}

const session = await connectChannelE2e(NAME);
const page: Page = session.page;
page.on("pageerror", (error) => pageErrors.push(error.message));
const viewport = await page.context().newCDPSession(page);
let current: Variant | undefined;
let projectId = "";
let pageUrl = "";

async function settle(): Promise<void> {
  await page
    .waitForFunction(
      () =>
        !document
          .getAnimations()
          .some(
            (animation) =>
              animation.playState === "running" &&
              animation.effect instanceof KeyframeEffect &&
              animation.effect.getComputedTiming().iterations !== Number.POSITIVE_INFINITY,
          ),
      undefined,
      { timeout: 10_000 },
    )
    .catch(() => undefined);
  await page.waitForTimeout(250);
}

async function shot(name: string, options: { settle?: boolean; keepMouse?: boolean } = {}): Promise<void> {
  assert.ok(current, "no variant");
  if (options.settle !== false) {
    if (options.keepMouse !== true) await page.mouse.move(1, Math.round(current.height * 0.6));
    await settle();
  }
  const size = `${current.width}x${current.height}`;
  const folder = join(OUT, current.theme, size);
  mkdirSync(folder, { recursive: true });
  const file = join(folder, `${numberOf(name)}-${name}.png`);
  await page.screenshot({ path: file });
  screens.push({ theme: current.theme, size, name, file: relative(OUT, file).replaceAll("\\", "/") });
}

async function step(name: string, run: () => Promise<void>): Promise<void> {
  const label = current ? `${current.theme} ${current.width}x${current.height}: ${name}` : name;
  try {
    await run();
    checks.push({ name: label, passed: true });
    process.stdout.write(`ok   ${label}\n`);
  } catch (error) {
    const detail = error instanceof Error ? (error.message.split("\n")[0] ?? error.message) : String(error);
    checks.push({ name: label, passed: false, detail });
    process.stdout.write(`FAIL ${label}: ${detail}\n`);
    await escapeAll();
  }
}

async function until<T>(label: string, read: () => Promise<T>, ready: (value: T) => boolean, timeoutMs = WAIT_MS) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const value = await read();
    if (ready(value)) return value;
    if (Date.now() > deadline) throw new Error(`Timed out: ${label}. Last value: ${JSON.stringify(value)}`);
    await page.waitForTimeout(200);
  }
}

const rail = () => page.getByRole("navigation", { name: english("app.rail.label") });
const projectList = () => page.getByRole("navigation", { name: english("project.list.label") });
const projectButton = (name: string) =>
  projectList().getByRole("button", { name: english("project.row.open", { name }), exact: true });
const column = () => page.locator("#project-column");
const chatPanels = () => page.locator(".project-chat-panel:visible");
const settingsTitle = () => page.getByRole("heading", { level: 1, name: english("app.settingsPage.title") });
const settingsContent = () => page.locator(".settings-modal-content");
const openMenu = () => page.locator("[role=menu]").first();
const anyDialog = () => page.locator("[role=dialog], [role=alertdialog]").first();

async function visible(locator: Locator): Promise<boolean> {
  return locator.isVisible().catch(() => false);
}

async function dismissToasts(): Promise<void> {
  await page.evaluate(() => {
    for (const button of document.querySelectorAll<HTMLElement>(".ui-toaster li button[aria-label]")) button.click();
  });
  await page
    .locator(".ui-toaster li")
    .first()
    .waitFor({ state: "detached", timeout: 5_000 })
    .catch(() => undefined);
}

async function escapeAll(): Promise<void> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const menu = await visible(openMenu());
    const dialog = await visible(anyDialog());
    const settings = await visible(page.locator(".settings-modal-content"));
    if (!menu && !dialog && !settings) return;
    if (dialog) {
      const fields = anyDialog().locator("input:not([type=hidden]), textarea");
      const target = (await fields.count()) > 0 ? fields.first() : anyDialog();
      await target.focus().catch(() => undefined);
    }
    if (settings && !menu && !dialog) {
      await page
        .locator(".settings-modal-content h1, .settings-modal h1, h1")
        .first()
        .focus()
        .catch(() => undefined);
    }
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
  }
}

async function applyVariant(variant: Variant): Promise<void> {
  current = variant;
  await viewport.send("Emulation.setDeviceMetricsOverride", {
    width: variant.width,
    height: variant.height,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await page.evaluate(
    (palette) => window.codebot.setAppAppearancePreference({ appearance: palette.scheme, palette: palette.id }),
    variant.palette,
  );
  await page.waitForFunction(
    ([scheme, canvas]) => {
      const root = document.documentElement;
      return (
        root.dataset.codebotColorScheme === scheme &&
        getComputedStyle(root).getPropertyValue("--codebot-editor-bg").trim().toLowerCase() === canvas.toLowerCase()
      );
    },
    [variant.palette.scheme, variant.palette.colors.canvas] as const,
    { timeout: WAIT_MS },
  );
}

async function reloadApp(): Promise<void> {
  await page.reload();
  await page.waitForFunction(() => document.readyState === "complete", undefined, { timeout: WAIT_MS });
  await until(
    "the app shows a screen",
    () =>
      page.evaluate(
        () =>
          document.querySelector(".language-wheel-continue") !== null ||
          document.querySelector("nav[aria-label]") !== null,
      ),
    (ready) => ready,
  );
  await page.waitForTimeout(800);
}

function writeWorkspace(): void {
  rmSync(resolve(ROOT, ".codebot-build/screen-sweep"), { recursive: true, force: true });
  for (const folder of ["src", "docs", "tests", ".claude/commands"])
    mkdirSync(join(WORKSPACE, folder), { recursive: true });
  mkdirSync(SECOND_FOLDER, { recursive: true });
  writeFileSync(
    join(WORKSPACE, "README.md"),
    "# Website\n\nA small project for the screen sweep.\n\n- Run `bun dev`\n",
  );
  writeFileSync(join(WORKSPACE, "src", "server.ts"), SERVER_SOURCE);
  writeFileSync(
    join(WORKSPACE, "src", "routes.json"),
    `${JSON.stringify({ routes: ["/health", "/count"] }, null, 2)}\n`,
  );
  writeFileSync(join(WORKSPACE, "docs", "guide.md"), "# Guide\n\nStart the server with `bun dev`.\n");
  writeFileSync(join(WORKSPACE, "tests", "server.test.ts"), 'import { start } from "../src/server";\n\nstart(0);\n');
  writeFileSync(join(WORKSPACE, "package.json"), `${JSON.stringify({ name: "website", private: true }, null, 2)}\n`);
  writeFileSync(join(WORKSPACE, ".claude", "commands", "release.md"), "Write the release notes.\n");
  writeFileSync(join(SECOND_FOLDER, "main.go"), "package main\n\nfunc main() {}\n");
  const git = (...args: string[]) =>
    execFileSync("git", ["-c", "user.name=Sweep", "-c", "user.email=sweep@example.invalid", ...args], {
      cwd: WORKSPACE,
      stdio: "ignore",
    });
  try {
    git("init", "-q");
    git("add", "-A");
    git("commit", "-q", "-m", "Start");
    writeFileSync(
      join(WORKSPACE, "README.md"),
      "# Website\n\nA small project for the screen sweep.\n\n- Run `bun dev`\n- Open the page\n",
    );
    writeFileSync(
      join(WORKSPACE, "src", "total.ts"),
      "export const total = (values: number[]) => values.reduce((a, b) => a + b, 0);\n",
    );
  } catch {}
}

async function waitTurnsDone(): Promise<void> {
  await until(
    "the chat turns end",
    () => column().locator(".project-chat-row").allInnerTexts(),
    (rows) => rows.length > 0 && rows.every((text) => !/running|queued/i.test(text)),
    TURN_MS,
  );
}

async function send(text: string): Promise<void> {
  const editor = chatPanels().first().getByRole("textbox").first();
  await editor.click();
  await page.keyboard.type(text);
  await page.keyboard.press("Enter");
  await until(
    "the composer is empty after send",
    () => editor.innerText().catch(() => ""),
    (left) => !left.includes(text),
  );
  await page.waitForTimeout(800);
  await waitTurnsDone();
}

async function openProject(name: string): Promise<void> {
  if (!(await visible(projectList()))) await rail().getByRole("button", { name: "Projects", exact: true }).click();
  await projectButton(name).click();
  await column().waitFor({ state: "visible", timeout: WAIT_MS });
}

async function home(options: { resetDock?: boolean } = {}): Promise<void> {
  await escapeAll();
  if (options.resetDock) {
    await closeBrowserTabs();
    await openProject(PROJECT);
    await page.evaluate((widthKey) => {
      window.localStorage.removeItem(widthKey);
      const dock = window.__codebotProjectDock;
      for (let attempt = 0; dock && attempt < 60 && dock.panelCount() > 0; attempt += 1) dock.closeActive();
    }, PREVIEW_WIDTH_KEY);
    await until(
      "one dock panel",
      () => page.evaluate(() => window.__codebotProjectDock?.panelCount() ?? 0),
      (count) => count === 1,
    );
    await page.waitForTimeout(500);
    await page.evaluate((widthKey) => window.localStorage.removeItem(widthKey), PREVIEW_WIDTH_KEY);
  }
  await escapeAll();
  await openProject(PROJECT);
  await column().locator(".project-chat-row").filter({ hasText: FIRST_CHAT }).first().click();
  await chatPanels().first().waitFor({ state: "visible", timeout: WAIT_MS });
  await page
    .locator(".project-chat-panel:visible .message-entry-agent")
    .first()
    .waitFor({ state: "visible", timeout: WAIT_MS });
  await dismissToasts();
}

async function closeBrowserTabs(): Promise<void> {
  await page.evaluate(async () => {
    for (const tab of await window.codebot.browser.listTabs()) await window.codebot.browser.close(tab.id);
  });
}

async function groupActions(index: number): Promise<Locator> {
  const group = page.locator(".project-dock .dv-groupview").nth(index);
  await group.waitFor({ state: "visible", timeout: WAIT_MS });
  return group;
}

async function firstAgentId(): Promise<string> {
  return page.evaluate(async (id) => {
    const project = (await window.codebot.projects.list()).find((entry) => entry.id === id);
    return project?.agentIds[0] ?? "";
  }, projectId);
}

const settingsNav = () => page.locator(".settings-modal-nav");

function treeItem(path: string): Locator {
  const parts = path.split("/");
  const cssBackslash = "\\\\";
  const posix = `[role=treeitem][data-row-key$="/${parts.join("/")}"]`;
  const windows = `[role=treeitem][data-row-key$="${cssBackslash}${parts.join(cssBackslash)}"]`;
  return column().locator(`${posix}, ${windows}`).first();
}

async function settingsTabs(): Promise<string[]> {
  return settingsNav()
    .locator("[role=tab]")
    .evaluateAll((tabs) => tabs.map((tab) => (tab.textContent ?? "").trim()).filter(Boolean));
}

async function shootSettingsTab(prefix: string, tab: string): Promise<void> {
  await settingsNav().getByRole("tab", { name: tab, exact: true }).click();
  await settingsContent().waitFor({ state: "visible", timeout: WAIT_MS });
  await page.waitForTimeout(500);
  await settingsContent().evaluate((element) => {
    element.scrollTop = 0;
  });
  await shot(`${prefix}-${slug(tab)}`);
  for (let part = 2; part <= SETTINGS_PARTS_LIMIT; part += 1) {
    const moved = await settingsContent().evaluate((element) => {
      const before = element.scrollTop;
      element.scrollTop = before + Math.round(element.clientHeight * 0.85);
      return element.scrollTop > before + 80;
    });
    if (!moved) break;
    await shot(`${prefix}-${slug(tab)}-${part}`);
  }
}

async function openSettings(): Promise<void> {
  await escapeAll();
  await rail()
    .getByRole("button", { name: english("app.rail.settings"), exact: true })
    .click();
  await settingsTitle().waitFor({ state: "visible", timeout: WAIT_MS });
}

async function enableAdvancedFeatures(): Promise<void> {
  await openSettings();
  await page.getByRole("tab", { name: "Advanced features", exact: true }).click();
  const switches = settingsContent().getByRole("switch");
  await switches.first().waitFor({ state: "attached", timeout: WAIT_MS });
  const count = await switches.count();
  for (let index = 0; index < count; index += 1) {
    const toggle = switches.nth(index);
    if ((await toggle.getAttribute("aria-checked")) === "true") continue;
    await toggle.locator("xpath=..").click();
    await until(
      `advanced feature ${index} is on`,
      () => toggle.getAttribute("aria-checked"),
      (value) => value === "true",
    );
  }
  await escapeAll();
}

async function setup(): Promise<void> {
  const reused = await page.evaluate(
    async (name) => (await window.codebot.projects.list()).find((entry) => entry.name === name)?.id ?? null,
    PROJECT,
  );
  if (reused !== null && SKIP_FRESH) {
    projectId = reused;
    return;
  }
  writeWorkspace();
  await page.evaluate((model) => {
    window.localStorage.setItem("codebot:language-step-done", "true");
    return window.codebot.saveSetup({ preferredProvider: "codex", preferredModel: model });
  }, FAKE_CODEX_MODEL);
  projectId = await page.evaluate(
    async ({ name, folder, second, third, secondName, thirdName, blue, red }) => {
      const existing = (await window.codebot.projects.list()).find((entry) => entry.name === name);
      if (existing) return existing.id;
      const project = await window.codebot.projects.create({
        name,
        mainFolder: folder,
        accessLevel: "normal",
        color: blue,
        defaultRuntime: { provider: "codex", model: "gpt-5.5", reasoningEffort: "low" },
        agents: [{ name: "Dev", role: "Developer" }],
      });
      await window.codebot.projects.create({
        name: secondName,
        mainFolder: second,
        accessLevel: "strict",
        color: red,
        agents: [{ name: "Go", role: "Backend developer" }],
      });
      await window.codebot.projects.create({
        name: thirdName,
        mainFolder: third,
        accessLevel: "open",
        agents: [{ name: "Writer", role: "Writer" }],
      });
      return project.project.id;
    },
    {
      name: PROJECT,
      folder: WORKSPACE,
      second: SECOND_FOLDER,
      third: join(WORKSPACE, "docs"),
      secondName: SECOND_PROJECT,
      thirdName: THIRD_PROJECT,
      blue: PROJECT_COLORS[6] ?? null,
      red: PROJECT_COLORS[0] ?? null,
    },
  );
  await reloadApp();
  await dismissToasts();
  await openProject(PROJECT);
  for (const [index, text] of ["Plan the tests", "Fix the build", FIRST_CHAT].entries()) {
    await column()
      .getByRole("button", { name: english("project.chat.new"), exact: true })
      .first()
      .click();
    await page.waitForTimeout(600);
    await send(text);
    if (index === 2) await send("Add a total helper");
  }
  await enableAdvancedFeatures();
}

async function phaseFresh(variant: Variant): Promise<void> {
  await applyVariant(variant);
  await step("first-run language step", async () => {
    await page.evaluate((key) => window.localStorage.removeItem(key), LANGUAGE_STEP_KEY);
    await reloadApp();
    await applyVariant(variant);
    const next = page.locator(".language-wheel-continue");
    await next.waitFor({ state: "visible", timeout: WAIT_MS });
    await shot("first-run-language");
    await next.click();
    await next.waitFor({ state: "hidden", timeout: WAIT_MS });
  });
  await step("first-run empty projects screen", async () => {
    await page.getByText("Create your first project").waitFor({ state: "visible", timeout: WAIT_MS });
    await shot("first-run-projects-empty");
  });
  await step("first-run new project dialog", async () => {
    await page.getByRole("button", { name: "Create a project", exact: true }).click();
    await page.locator(".project-dialog").waitFor({ state: "visible", timeout: WAIT_MS });
    await shot("first-run-new-project");
    await escapeAll();
  });
}

async function scrollDialog(selector: string): Promise<void> {
  await page.locator(selector).evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
}

async function phaseMain(variant: Variant): Promise<void> {
  await applyVariant(variant);
  await step("projects screen with projects", async () => {
    await home({ resetDock: true });
    await shot("projects-chat");
  });
  await step("chat reply with code block", async () => {
    const code = page.locator(".project-chat-panel:visible .message-code-block").first();
    await code.waitFor({ state: "visible", timeout: WAIT_MS });
    await code.scrollIntoViewIfNeeded();
    await shot("chat-code-block");
  });
  await step("chat details steps", async () => {
    const panel = chatPanels().first();
    const show = panel.getByRole("button", { name: new RegExp(`${english("reply.details.show")}$`) }).last();
    await show.scrollIntoViewIfNeeded();
    await show.click();
    const hide = panel.getByRole("button", { name: new RegExp(`${english("reply.details.hide")}$`) }).last();
    await hide.waitFor({ state: "visible", timeout: WAIT_MS });
    await hide.scrollIntoViewIfNeeded();
    await shot("chat-details");
    await hide.dispatchEvent("click");
    await show.waitFor({ state: "visible", timeout: WAIT_MS });
  });
  await step("slash command list", async () => {
    const editor = chatPanels().first().getByRole("textbox").first();
    await editor.click();
    await page.keyboard.type("/");
    await page
      .getByRole("listbox", { name: english("slash.picker.label") })
      .getByRole("option")
      .first()
      .waitFor({ state: "visible", timeout: WAIT_MS });
    await shot("chat-slash-commands");
    await page.keyboard.press("Escape");
    await editor.click();
    await page.keyboard.press("Control+A");
    await page.keyboard.press("Backspace");
  });
  await step("chat model picker", async () => {
    const picker = chatPanels()
      .first()
      .getByRole("button", { name: /^Model of this chat/ });
    await picker.click();
    await until(
      "the model picker opens",
      () => picker.getAttribute("aria-expanded"),
      (value) => value === "true",
    );
    await page.waitForTimeout(400);
    await shot("chat-model-picker");
    await escapeAll();
    await page.keyboard.press("Escape");
  });
  await step("chat row menu", async () => {
    await column()
      .getByRole("button", { name: english("project.chat.actions", { title: FIRST_CHAT }) })
      .first()
      .click();
    await openMenu().waitFor({ state: "visible", timeout: WAIT_MS });
    await shot("chat-row-menu");
    await escapeAll();
  });
  await step("project row menu", async () => {
    await projectList()
      .getByRole("button", { name: english("project.row.actions", { name: PROJECT }) })
      .click();
    await openMenu().waitFor({ state: "visible", timeout: WAIT_MS });
    await shot("project-row-menu");
    await escapeAll();
  });
  await step("project row expanded with recent chats", async () => {
    const toggle = projectList().getByRole("button", { name: `Show the recent chats of ${PROJECT}` });
    await toggle.click();
    await page.waitForTimeout(400);
    await shot("project-row-recent-chats");
    await projectList()
      .getByRole("button", { name: /recent chats of Website/ })
      .first()
      .click();
  });
  await step("new project dialog", async () => {
    await page
      .getByRole("button", { name: english("project.new"), exact: true })
      .first()
      .click();
    await page.locator(".project-dialog").waitFor({ state: "visible", timeout: WAIT_MS });
    await shot("new-project-dialog");
    await scrollDialog(".project-dialog");
    await shot("new-project-dialog-end");
    await escapeAll();
  });
  await step("project settings dialog", async () => {
    await column().getByRole("button", { name: "Project settings", exact: true }).click();
    const dialog = page.locator(".project-dialog");
    await dialog.waitFor({ state: "visible", timeout: WAIT_MS });
    const tabs = await dialog
      .locator("[role=tab]")
      .evaluateAll((list) => list.map((tab) => (tab.textContent ?? "").trim()));
    assert.ok(tabs.length > 0, "no project settings tabs");
    for (const tab of tabs) {
      await dialog.getByRole("tab", { name: tab, exact: true }).click();
      await page.waitForTimeout(400);
      await shot(`project-settings-${slug(tab)}`);
      const scrolls = await dialog.evaluate((element) => element.scrollHeight > element.clientHeight + 4);
      if (scrolls) {
        await scrollDialog(".project-dialog");
        await shot(`project-settings-${slug(tab)}-end`);
        await dialog.evaluate((element) => {
          element.scrollTop = 0;
        });
      }
    }
    await escapeAll();
  });
  await step("add panel menu", async () => {
    await (await groupActions(0)).getByRole("button", { name: english("panel.add"), exact: true }).click();
    await openMenu().waitFor({ state: "visible", timeout: WAIT_MS });
    await shot("dock-add-panel-menu");
    await escapeAll();
  });
  await step("file tree", async () => {
    await column().getByRole("tree").first().waitFor({ state: "visible", timeout: WAIT_MS });
    for (const folder of ["src", "docs"]) {
      const item = treeItem(folder);
      await item.waitFor({ state: "visible", timeout: WAIT_MS });
      if ((await item.getAttribute("aria-expanded")) !== "true") await item.click();
    }
    await treeItem("src/server.ts").waitFor({ state: "visible", timeout: WAIT_MS });
    await shot("file-tree");
  });
  await step("file open in Monaco", async () => {
    await treeItem("src/server.ts").click();
    await page.locator(".monaco-editor").first().waitFor({ state: "visible", timeout: WAIT_MS });
    await page.locator(".monaco-editor .view-line").first().waitFor({ state: "visible", timeout: WAIT_MS });
    await shot("file-monaco");
  });
  await step("markdown preview", async () => {
    await treeItem("README.md").click();
    await page
      .getByText("A small project for the screen sweep.")
      .first()
      .waitFor({ state: "visible", timeout: WAIT_MS });
    await shot("file-markdown-preview");
  });
  await step("git panel", async () => {
    await column().getByRole("tab", { name: "Git", exact: true }).click();
    await page.waitForTimeout(1200);
    await shot("git-panel");
    await column().getByRole("tab", { name: "Files", exact: true }).click();
  });
  await step("dock with two panels", async () => {
    await home({ resetDock: true });
    await (await groupActions(0)).getByRole("button", { name: english("panel.split.right"), exact: true }).click();
    await until(
      "two chat panels",
      () => chatPanels().count(),
      (count) => count === 2,
    );
    await shot("dock-two-panels");
  });
  await step("dock with three panels", async () => {
    await (await groupActions(1)).getByRole("button", { name: english("panel.split.down"), exact: true }).click();
    await until(
      "three chat panels",
      () => chatPanels().count(),
      (count) => count === 3,
    );
    await shot("dock-three-panels");
  });
  await step("pinned preview", async () => {
    await home({ resetDock: true });
    const agentId = await firstAgentId();
    await page.evaluate(
      ([id, agent]) =>
        window.__codebotProjectDock?.openContent({
          kind: "preview",
          projectId: id,
          title: "README.md",
          data: { origin: "agent", source: "workspace", path: "README.md", agentId: agent },
          activate: false,
          pinned: true,
        }),
      [projectId, agentId] as const,
    );
    await page.locator(".project-preview-host").waitFor({ state: "visible", timeout: WAIT_MS });
    await page
      .getByText("A small project for the screen sweep.")
      .first()
      .waitFor({ state: "visible", timeout: WAIT_MS });
    await shot("dock-pinned-preview");
  });
  await step("browser panel", async () => {
    await home({ resetDock: true });
    const agentId = await firstAgentId();
    await page.evaluate(
      ([id, agent, url]) =>
        window.__codebotProjectDock?.openContent({
          kind: "browser",
          projectId: id,
          title: "Browser",
          data: { origin: "user", url, agentId: agent },
          activate: true,
          pinned: true,
        }),
      [projectId, agentId, pageUrl] as const,
    );
    await page.locator(".project-browser-panel").waitFor({ state: "visible", timeout: WAIT_MS });
    await until(
      "the local page loads",
      () => page.evaluate(() => window.codebot.browser.listTabs()),
      (tabs) => tabs.some((tab) => tab.url.startsWith("http://127.0.0.1") && !tab.loading),
    );
    await shot("dock-browser-panel");
  });
  await step("add panel menu over the browser closes cleanly", async () => {
    const group = page.locator(".project-dock .dv-groupview").filter({ has: page.locator(".project-browser-panel") });
    await group.getByRole("button", { name: english("panel.add"), exact: true }).click();
    await openMenu().waitFor({ state: "visible", timeout: WAIT_MS });
    await shot("dock-add-menu-over-browser");
    await page.keyboard.press("Escape");
    await openMenu().waitFor({ state: "detached", timeout: WAIT_MS });
    await shot("dock-browser-after-menu");
    const tooltips = await page.locator(".ui-tooltip").allInnerTexts();
    assert.equal(tooltips.length, 0, `text stays over the browser panel: ${tooltips.join(", ")}`);
  });
  await step("browser next to a file panel", async () => {
    await home({ resetDock: true });
    const agentId = await firstAgentId();
    await page.evaluate(
      ([id, agent, file]) =>
        window.__codebotProjectDock?.openSlot({
          kind: "file",
          projectId: id,
          title: "server.ts",
          data: { path: file, name: "server.ts", agentId: agent },
          placement: "right",
        }),
      [projectId, agentId, join(WORKSPACE, "src", "server.ts")] as const,
    );
    await page.locator(".monaco-editor").first().waitFor({ state: "visible", timeout: WAIT_MS });
    await page.evaluate(
      ([id, agent, url]) =>
        window.__codebotProjectDock?.openContent({
          kind: "browser",
          projectId: id,
          title: "Browser",
          data: { origin: "user", url, agentId: agent },
          activate: true,
          pinned: true,
        }),
      [projectId, agentId, pageUrl] as const,
    );
    await page.locator(".project-browser-panel").waitFor({ state: "visible", timeout: WAIT_MS });
    await page.waitForTimeout(600);
    const widths = await page
      .locator(".project-dock .dv-groupview")
      .evaluateAll((groups) => groups.map((group) => Math.round(group.getBoundingClientRect().width)));
    await shot("dock-browser-next-to-file");
    const narrowest = Math.min(...widths);
    const total = widths.reduce((sum, width) => sum + width, 0);
    assert.ok(narrowest >= total * 0.2, `a dock panel is only ${narrowest} of ${total} px wide (${widths.join(", ")})`);
    await closeBrowserTabs();
  });
  await step("account entry", async () => {
    await home({ resetDock: true });
    await page.getByRole("button", { name: /^Account: / }).click();
    await page.waitForTimeout(800);
    await shot("status-account");
    await escapeAll();
  });
  await step("server status entry", async () => {
    await page.getByRole("button", { name: /^Server Local/ }).click();
    await page.waitForTimeout(800);
    await shot("status-server");
    await escapeAll();
  });
  await step("server menu", async () => {
    await rail()
      .getByRole("button", { name: english("server.menu.open", { name: "Local" }) })
      .click();
    await openMenu().waitFor({ state: "visible", timeout: WAIT_MS });
    await shot("server-menu");
    const layout = openMenu().getByRole("menuitem", { name: /Server layout/ });
    if (await visible(layout)) {
      await layout.hover();
      await page.waitForTimeout(500);
      await shot("server-menu-layout", { keepMouse: true });
    }
    await escapeAll();
  });
  await step("help menu", async () => {
    await rail().getByRole("button", { name: "Help", exact: true }).click();
    await openMenu().waitFor({ state: "visible", timeout: WAIT_MS });
    await shot("rail-help-menu");
    await escapeAll();
  });
  await step("more menu", async () => {
    await rail()
      .getByRole("button", { name: english("app.rail.more"), exact: true })
      .click();
    await openMenu().waitFor({ state: "visible", timeout: WAIT_MS });
    await shot("rail-more-menu");
    await escapeAll();
  });
  const railNames = await rail()
    .getByRole("button")
    .evaluateAll((buttons) => buttons.map((button) => button.getAttribute("aria-label") ?? "").filter(Boolean))
    .catch((): string[] => []);
  for (const label of railNames) {
    if (RAIL_FIXED.has(label) || label.startsWith("Open server menu")) continue;
    await step(`rail page ${label}`, async () => {
      await escapeAll();
      await rail().getByRole("button", { name: label, exact: true }).click();
      await page.mouse.move(current?.width ?? 0, (current?.height ?? 0) / 2);
      await page.waitForTimeout(1500);
      await shot(`rail-${slug(label)}`);
    });
  }
  await step("more menu pages", async () => {
    await escapeAll();
    await rail()
      .getByRole("button", { name: english("app.rail.more"), exact: true })
      .click();
    await openMenu().waitFor({ state: "visible", timeout: WAIT_MS });
    const items = await openMenu()
      .getByRole("menuitem")
      .evaluateAll((list) => list.map((item) => (item.textContent ?? "").trim()).filter(Boolean));
    await escapeAll();
    for (const item of items) {
      if (railNames.includes(item)) continue;
      await rail()
        .getByRole("button", { name: english("app.rail.more"), exact: true })
        .click();
      await openMenu().getByRole("menuitem", { name: item, exact: true }).click();
      await page.waitForTimeout(1500);
      await shot(`more-${slug(item)}`);
      await escapeAll();
    }
  });
  await step("toast", async () => {
    await openSettings();
    await page.getByRole("tab", { name: "General", exact: true }).click();
    const rule = settingsContent().locator("textarea").first();
    await rule.waitFor({ state: "visible", timeout: WAIT_MS });
    const text = await rule.inputValue();
    const marker = " Use lists for steps.";
    await rule.fill(text.endsWith(marker) ? text.slice(0, -marker.length) : `${text}${marker}`);
    await settingsContent().getByRole("button", { name: "Save rule" }).click();
    await page.locator(".ui-toaster li").first().waitFor({ state: "visible", timeout: WAIT_MS });
    await page.waitForTimeout(500);
    await shot("toast", { settle: false });
    await dismissToasts();
  });
  await step("your settings tabs", async () => {
    await openSettings();
    const tabs = await settingsTabs();
    assert.ok(tabs.length > 5, `settings tabs: ${tabs.join(", ")}`);
    for (const tab of tabs) await shootSettingsTab("settings", tab);
  });
  await step("server settings tabs", async () => {
    await page.getByText("Local server settings", { exact: true }).click();
    await page.getByRole("tab", { name: "Providers", exact: true }).waitFor({ state: "visible", timeout: WAIT_MS });
    const tabs = await settingsTabs();
    for (const tab of tabs) await shootSettingsTab("server-settings", tab);
    await escapeAll();
  });
}

async function main(): Promise<void> {
  if (ONLY === null) rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });
  const server = createServer((_request, response) => {
    response.setHeader("content-type", "text/html");
    response.end(
      "<!doctype html><title>Sweep page</title><body style='font-family:sans-serif'><h1>Sweep test page</h1><p>A local page for the browser panel.</p></body>",
    );
  });
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
  const address = server.address();
  assert.ok(address && typeof address === "object", "no server address");
  pageUrl = `http://127.0.0.1:${address.port}/`;
  try {
    await reloadApp();
    if (!SKIP_FRESH) for (const variant of VARIANTS) await phaseFresh(variant);
    await step("setup projects, chats and advanced features", setup);
    if (checks.at(-1)?.passed === true) for (const variant of VARIANTS) await phaseMain(variant);
  } finally {
    server.close();
    await closeBrowserTabs().catch(() => undefined);
    await viewport.send("Emulation.clearDeviceMetricsOverride").catch(() => undefined);
    await page
      .evaluate(() => window.codebot.setAppAppearancePreference({ appearance: "dark", palette: "codebot-dark" }))
      .catch(() => undefined);
    await session.close();
    const counts: Record<string, number> = {};
    for (const entry of screens)
      counts[`${entry.theme}/${entry.size}`] = (counts[`${entry.theme}/${entry.size}`] ?? 0) + 1;
    writeFileSync(
      join(OUT, "index.json"),
      `${JSON.stringify({ generatedAt: new Date().toISOString(), counts, screens }, null, 2)}\n`,
    );
    const passed = checks.length > 0 && checks.every((entry) => entry.passed);
    const reportPath = writeReport(NAME, { passed, checks, counts, pageErrors, screens: screens.length });
    process.stdout.write(`screens: ${screens.length} in ${OUT}\nreport: ${reportPath}\n`);
    if (!passed) process.exitCode = 1;
  }
}

await main();
