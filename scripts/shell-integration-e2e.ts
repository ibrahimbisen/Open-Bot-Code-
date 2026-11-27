import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import type { Locator, Page } from "playwright-core";
import { connectChannelE2e, writeReport } from "./channel-e2e-support";

interface Check {
  name: string;
  passed: boolean;
  detail?: string;
}

const checks: Check[] = [];
const SCREENS = resolve(import.meta.dirname, "../.codebot-build/w12b/screens");
const WAIT_MS = 60_000;
const RUN = `S${Date.now().toString(36).slice(-4)}`;

let recover: (() => Promise<void>) | undefined;

async function step(name: string, run: () => Promise<string | undefined>): Promise<void> {
  try {
    const detail = await run();
    checks.push({ name, passed: true, ...(detail ? { detail } : {}) });
    process.stdout.write(`ok   ${name}${detail ? ` (${detail})` : ""}\n`);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    checks.push({ name, passed: false, detail });
    process.stdout.write(`FAIL ${name}: ${detail}\n`);
    await recover?.();
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
    (value) => window.codebot.setAppAppearancePreference({ appearance: value, palette: null }),
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

const rail = (page: Page) => page.getByRole("navigation", { name: "Pages" });
const leftBar = (page: Page) => page.getByRole("navigation", { name: "Project list" });
const column = (page: Page) => page.locator("#project-column");
const panels = (page: Page) => page.locator(".project-chat-panel:visible");
const projectButton = (page: Page, name: string) =>
  leftBar(page).getByRole("button", { name: `Open the project ${name}`, exact: true });

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

async function showProjects(page: Page): Promise<void> {
  if (
    !(await leftBar(page)
      .isVisible()
      .catch(() => false))
  ) {
    await rail(page).getByRole("button", { name: "Projects", exact: true }).click();
  }
  await leftBar(page).waitFor({ state: "visible", timeout: WAIT_MS });
}

async function createProject(page: Page, name: string, folder: string): Promise<void> {
  await page.getByRole("button", { name: "New project", exact: true }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Main folder").fill(folder);
  await dialog.getByLabel("Name", { exact: true }).fill(name);
  await dialog.getByText("Open", { exact: true }).click();
  await dialog.getByRole("button", { name: "Create project" }).click();
  await projectButton(page, name).waitFor({ state: "visible", timeout: WAIT_MS });
}

function sampleFolder(root: string, name: string, files: Record<string, string>): string {
  const folder = join(root, name);
  for (const [relative, content] of Object.entries(files)) {
    const path = join(folder, ...relative.split("/"));
    mkdirSync(join(path, ".."), { recursive: true });
    writeFileSync(path, content);
  }
  return folder;
}

async function treeText(scope: Locator): Promise<string> {
  const tree = scope.locator(".explorer-tree").first();
  return (await tree.innerText().catch(() => "")).replaceAll("\n", " ");
}

async function main(): Promise<void> {
  const session = await connectChannelE2e("shell-integration-e2e");
  const { page } = session;
  const root = await mkdtemp(join(tmpdir(), "codebot-shell-integration-"));
  const alphaName = `${RUN} Alpha`;
  const betaName = `${RUN} Beta`;
  const alpha = sampleFolder(root, "alpha", {
    "alpha-readme.md": "# Alpha\n",
    "src/alpha-main.ts": "export const alpha = 1;\n",
    "docs/alpha-guide.md": "guide\n",
  });
  const beta = sampleFolder(root, "beta", {
    "beta-notes.txt": "notes\n",
    "tests/beta-check.ts": "export const beta = 2;\n",
    "backend/beta-server.ts": "export const server = 3;\n",
  });
  const screens: string[] = [];
  recover = async () => {
    await closeBlockingDialogs(page).catch(() => undefined);
    await showProjects(page).catch(() => undefined);
  };
  try {
    await clearViewport(page);
    await page.reload();
    await leftBar(page).waitFor({ state: "visible", timeout: WAIT_MS });
    await closeBlockingDialogs(page);
    await dismissToasts(page);

    await step("icon rail is back with Projects as main entry", async () => {
      await rail(page).waitFor({ state: "visible", timeout: WAIT_MS });
      const projects = rail(page).getByRole("button", { name: "Projects", exact: true });
      await projects.waitFor({ state: "visible", timeout: WAIT_MS });
      for (const name of ["Settings", "Help"]) {
        assert.ok(await rail(page).getByRole("button", { name, exact: true }).isVisible(), `${name} missing`);
      }
    });

    await step("Settings opens from the rail and Projects returns", async () => {
      await rail(page).getByRole("button", { name: "Settings", exact: true }).click();
      await page
        .getByText("Advanced features", { exact: true })
        .first()
        .waitFor({ state: "visible", timeout: WAIT_MS });
      await closeBlockingDialogs(page);
      await showProjects(page);
    });

    await step("a feature turned on in Advanced features appears in the rail", async () => {
      await page.evaluate(() =>
        window.codebot.hostAdmin.setAdvancedFeature({ feature: "routines", enabled: false }, "local"),
      );
      await page.reload();
      await leftBar(page).waitFor({ state: "visible", timeout: WAIT_MS });
      await closeBlockingDialogs(page);
      await dismissToasts(page);
      const inMenu = async () => {
        await rail(page).getByRole("button", { name: "More", exact: true }).click();
        await page.waitForTimeout(400);
        const found = (await page.getByRole("menu").getByText("Schedule", { exact: true }).count()) > 0;
        await page.keyboard.press("Escape");
        await page.waitForTimeout(300);
        return found;
      };
      const openAdvanced = async () => {
        await rail(page).getByRole("button", { name: "Settings", exact: true }).click();
        await page.getByRole("tab", { name: "Advanced features", exact: true }).click();
      };
      assert.equal(await inMenu(), false, "Schedule is shown while Routines is off");
      await openAdvanced();
      await page.getByRole("switch", { name: "Routines" }).click({ force: true });
      await closeBlockingDialogs(page);
      await showProjects(page);
      await until(page, "Schedule in the rail", inMenu, (found) => found);
      await openAdvanced();
      await page.getByRole("switch", { name: "Routines" }).click({ force: true });
      await closeBlockingDialogs(page);
      await showProjects(page);
      await until(page, "Schedule leaves the rail", inMenu, (found) => !found);
    });

    await step("left bar bottom shows account and server status", async () => {
      const account = page.getByRole("button", { name: /^Account: / });
      const server = page.getByRole("button", { name: /^Server .*: (Online|Connecting|Offline|Error|Incompatible)$/ });
      await account.waitFor({ state: "visible", timeout: WAIT_MS });
      await server.waitFor({ state: "visible", timeout: WAIT_MS });
      assert.ok(
        await page.locator(".project-left-bar-footer .project-status-entries").isVisible(),
        "no status entries in the footer",
      );
      return `${await account.getAttribute("aria-label")} | ${await server.getAttribute("aria-label")}`;
    });

    await step("create two projects with their own folders", async () => {
      await createProject(page, alphaName, alpha);
      await createProject(page, betaName, beta);
    });

    await step("file tree of the left column follows the active project", async () => {
      await projectButton(page, alphaName).click();
      await until(
        page,
        "alpha files",
        () => treeText(column(page)),
        (text) => text.includes("alpha-readme.md"),
      );
      const alphaTree = await treeText(column(page));
      assert.ok(alphaTree.includes("src"), "folder src missing");
      assert.ok(!alphaTree.includes("beta-notes.txt"), "beta file in alpha tree");
      screens.push(await shot(page, "tree-alpha-dark"));
      await projectButton(page, betaName).click();
      await until(
        page,
        "beta files",
        () => treeText(column(page)),
        (text) => text.includes("beta-notes.txt"),
      );
      const betaTree = await treeText(column(page));
      assert.ok(!betaTree.includes("alpha-readme.md"), "alpha file in beta tree");
      assert.ok(betaTree.includes("backend") && betaTree.includes("tests"), "beta folders missing");
    });

    await step("two chats from two projects show side by side with their own file trees", async () => {
      await projectButton(page, alphaName).click();
      await panels(page).first().waitFor({ state: "visible", timeout: WAIT_MS });
      await page.getByRole("button", { name: "Add a panel", exact: true }).first().click();
      await page.getByRole("menuitem", { name: "Chat from another project" }).click();
      const dialog = page.getByRole("dialog");
      await dialog.getByLabel("Project").selectOption({ label: betaName });
      await dialog.getByRole("button", { name: "New chat" }).click();
      await until(
        page,
        "two panels",
        () => panels(page).count(),
        (count) => count === 2,
      );
      await dismissToasts(page);
      const names = await panels(page).locator(".project-panel-project-name").allTextContents();
      assert.deepEqual([...names].sort(), [alphaName, betaName].sort());
      const first = await panels(page).nth(0).boundingBox();
      const second = await panels(page).nth(1).boundingBox();
      assert.ok(first && second, "no panel boxes");
      assert.ok(Math.abs(first.y - second.y) < 4, "panels are not side by side");
      assert.ok(Math.abs(first.x - second.x) > 50, "panels share a column");
      for (const index of [0, 1]) {
        const panel = panels(page).nth(index);
        const own = names[index] === alphaName ? "alpha-readme.md" : "beta-notes.txt";
        const foreign = names[index] === alphaName ? "beta-notes.txt" : "alpha-readme.md";
        await panel.getByRole("button", { name: "Files of the project" }).click();
        await until(
          page,
          `tree of panel ${index}`,
          () => treeText(panel),
          (text) => text.includes(own),
        );
        assert.ok(!(await treeText(panel)).includes(foreign), `panel ${index} shows the other project`);
      }
      screens.push(await shot(page, "two-projects-side-by-side-dark"));
      return names.join(" + ");
    });

    await step("a file opens in a panel from the tree", async () => {
      const panel = panels(page).first();
      await panel
        .locator(".explorer-tree")
        .getByText(/readme\.md|notes\.txt/)
        .first()
        .dblclick();
      await until(
        page,
        "file panel",
        () => page.locator(".project-explorer-file").count(),
        (count) => count > 0,
      );
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
          screens.push(await shot(page, `main-${theme}-${width}x${height}`));
        }
      }
      await clearViewport(page);
      await setTheme(page, "dark");
      return `${screens.length} screenshots`;
    });

    await step("status entries screenshot", async () => {
      await dismissToasts(page);
      mkdirSync(SCREENS, { recursive: true });
      const path = join(SCREENS, "status-entries-dark.png");
      await page.locator(".project-left-bar-footer").screenshot({ path });
      screens.push(path);
    });

    process.stdout.write(`screens: ${screens.join(", ")}\n`);
  } finally {
    await session.close();
    const reportPath = writeReport("w12b", { passed: checks.every((entry) => entry.passed), checks, screens });
    process.stdout.write(`report: ${reportPath}\n`);
  }
  if (!checks.every((entry) => entry.passed)) process.exitCode = 1;
}

await main();
