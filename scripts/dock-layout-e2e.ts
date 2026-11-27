import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import type { Page } from "playwright-core";
import {
  type AppCheck,
  chatPanels,
  closeBlockingDialogs,
  createChecks,
  createProjectWithAgent,
  dismissToasts,
  leftBar,
  phaseOf,
  prepareWindow,
  projectButton,
  sendInPanel,
  shot,
  until,
  waitForChatsIdle,
} from "./app-e2e-support";
import { connectChannelE2e, writeReport } from "./channel-e2e-support";

interface PanelBox {
  marker: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface SavedState {
  projectName: string;
  boxes: PanelBox[];
  checks: AppCheck[];
  screens: string[];
}

const OUT = resolve(import.meta.dirname, "../.codebot-build/dock-layout");
const STATE = join(OUT, "state.json");
const MARKERS = ["Top chat", "Bottom chat", "Right chat"] as const;
const phase = phaseOf(process.argv);
const { checks, step } = createChecks();
const screens: string[] = [];

async function panelBoxes(page: Page): Promise<PanelBox[]> {
  return page.evaluate((markers) => {
    const surface = document.querySelector(".project-dock-surface")?.getBoundingClientRect();
    if (!surface) return [];
    const boxes: { marker: string; x: number; y: number; width: number; height: number }[] = [];
    for (const panel of document.querySelectorAll<HTMLElement>(".project-chat-panel")) {
      const group = panel.closest(".dv-groupview");
      if (!group || panel.offsetParent === null) continue;
      const marker = markers.find((entry) => panel.innerText.includes(entry)) ?? "draft";
      const rect = group.getBoundingClientRect();
      boxes.push({
        marker,
        x: (rect.x - surface.x) / surface.width,
        y: (rect.y - surface.y) / surface.height,
        width: rect.width / surface.width,
        height: rect.height / surface.height,
      });
    }
    return boxes.sort((left, right) => left.marker.localeCompare(right.marker));
  }, MARKERS);
}

function box(boxes: PanelBox[], marker: string): PanelBox {
  const found = boxes.find((entry) => entry.marker === marker);
  assert.ok(found, `no panel for ${marker}: ${JSON.stringify(boxes)}`);
  return found;
}

const groupOf = (page: Page, marker: string) =>
  page.locator(".dv-groupview").filter({ has: page.locator(".project-chat-panel", { hasText: marker }) });

async function savedLayoutMatches(page: Page, projectId: string): Promise<boolean> {
  return page.evaluate((id) => {
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (key?.startsWith("codebot:project-dock:v1:") && key.endsWith(id)) {
        const layout = JSON.parse(window.localStorage.getItem(key) ?? "null");
        return Object.keys(layout?.panels ?? {}).length === 3;
      }
    }
    return false;
  }, projectId);
}

async function sendInActive(page: Page, text: string): Promise<void> {
  const panel = page.locator(".dv-groupview.dv-active-group .project-chat-panel").first();
  await panel.waitFor({ state: "visible", timeout: 30_000 });
  await sendInPanel(page, panel, text);
  await page.locator(".project-chat-panel", { hasText: text }).first().waitFor({ state: "visible", timeout: 30_000 });
}

async function firstPhase(page: Page): Promise<void> {
  const root = await mkdtemp(join(tmpdir(), "codebot-dock-layout-"));
  const folder = join(root, "project");
  mkdirSync(folder, { recursive: true });
  const projectName = `D${Date.now().toString(36).slice(-4)} Layout`;
  const projectId = await createProjectWithAgent(page, projectName, folder);
  await projectButton(page, projectName).click();
  await chatPanels(page).first().waitFor({ state: "visible", timeout: 60_000 });
  await sendInPanel(page, chatPanels(page).first(), MARKERS[0]);
  await waitForChatsIdle(page, projectName, 1);

  await step("6.5 Split down puts a second chat panel below the first one", async () => {
    await groupOf(page, MARKERS[0]).getByRole("button", { name: "Split down" }).first().click();
    await until(
      page,
      "two panels",
      () => chatPanels(page).count(),
      (count) => count === 2,
    );
    await sendInActive(page, MARKERS[1]);
    await waitForChatsIdle(page, projectName, 2);
    const boxes = await panelBoxes(page);
    const top = box(boxes, MARKERS[0]);
    const bottom = box(boxes, MARKERS[1]);
    assert.ok(bottom.y >= top.y + top.height - 0.02, `not below: ${JSON.stringify(boxes)}`);
    assert.ok(Math.abs(top.x - bottom.x) < 0.02 && Math.abs(top.width - bottom.width) < 0.02, "not one column");
    screens.push(await shot(page, "dock-split-down-dark"));
    return `top ${top.height.toFixed(2)}, bottom ${bottom.height.toFixed(2)}`;
  });

  await step("6.5 Split right puts a third chat panel right of the bottom one", async () => {
    await groupOf(page, MARKERS[1]).getByRole("button", { name: "Split right" }).first().click();
    await until(
      page,
      "three panels",
      () => chatPanels(page).count(),
      (count) => count === 3,
    );
    await sendInActive(page, MARKERS[2]);
    await waitForChatsIdle(page, projectName, 3);
    const boxes = await panelBoxes(page);
    const bottom = box(boxes, MARKERS[1]);
    const right = box(boxes, MARKERS[2]);
    assert.ok(right.x >= bottom.x + bottom.width - 0.02, `not right: ${JSON.stringify(boxes)}`);
    assert.ok(Math.abs(right.y - bottom.y) < 0.02, "not in one row");
    screens.push(await shot(page, "dock-split-right-dark"));
    return `bottom width ${bottom.width.toFixed(2)}, right width ${right.width.toFixed(2)}`;
  });

  await step("6.8 dragging the edge between the top and bottom panels resizes them", async () => {
    const before = await panelBoxes(page);
    const top = box(before, MARKERS[0]);
    const surface = await page.locator(".project-dock-surface").boundingBox();
    assert.ok(surface, "no dock surface");
    const sashes = page.locator(".project-dock-surface .dv-sash");
    let edge: { x: number; y: number } | null = null;
    for (let index = 0; index < (await sashes.count()); index += 1) {
      const rect = await sashes.nth(index).boundingBox();
      if (!rect || rect.width < rect.height) continue;
      const y = (rect.y + rect.height / 2 - surface.y) / surface.height;
      if (Math.abs(y - (top.y + top.height)) < 0.05) edge = { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
    }
    assert.ok(edge, "no edge between the top and bottom panels");
    await page.mouse.move(edge.x, edge.y);
    await page.mouse.down();
    await page.mouse.move(edge.x, edge.y + 120, { steps: 10 });
    await page.mouse.up();
    const after = await until(
      page,
      "top panel grows",
      () => panelBoxes(page),
      (boxes) => box(boxes, MARKERS[0]).height > top.height + 0.05,
    );
    return `top height ${top.height.toFixed(2)} -> ${box(after, MARKERS[0]).height.toFixed(2)}`;
  });

  await step("6.8 dragging a panel tab onto the right edge of another panel moves it there", async () => {
    const tab = groupOf(page, MARKERS[0]).locator(".dv-tab").first();
    const target = groupOf(page, MARKERS[2]).locator(".dv-content-container").first();
    const rect = await target.boundingBox();
    assert.ok(rect, "no target panel");
    await tab.dragTo(target, { targetPosition: { x: rect.width - 12, y: rect.height / 2 } });
    const moved = await until(
      page,
      "the top panel moves right of the right panel",
      () => panelBoxes(page),
      (boxes) => {
        const first = boxes.find((entry) => entry.marker === MARKERS[0]);
        const right = boxes.find((entry) => entry.marker === MARKERS[2]);
        return first !== undefined && right !== undefined && first.x >= right.x + right.width - 0.02;
      },
    );
    assert.equal(moved.length, 3, "a panel was lost");
    screens.push(await shot(page, "dock-panel-moved-dark"));
    return JSON.stringify(moved.map((entry) => `${entry.marker} x=${entry.x.toFixed(2)} y=${entry.y.toFixed(2)}`));
  });

  await step("6.9 the layout is saved for the project", async () => {
    await until(
      page,
      "saved layout",
      () => savedLayoutMatches(page, projectId),
      (ok) => ok,
    );
  });

  const state: SavedState = { projectName, boxes: await panelBoxes(page), checks, screens };
  mkdirSync(OUT, { recursive: true });
  writeFileSync(STATE, `${JSON.stringify(state, null, 2)}\n`);
  quitRequested = checks.every((entry) => entry.passed);
}

let quitRequested = false;

async function quitApp(page: Page): Promise<void> {
  const browser = page.context().browser();
  if (!browser) return;
  const cdp = await browser.newBrowserCDPSession();
  const disconnected = new Promise<void>((done) => browser.once("disconnected", () => done()));
  void cdp.send("Browser.close").catch(() => undefined);
  await Promise.race([disconnected, new Promise((done) => setTimeout(done, 30_000))]);
}

async function secondPhase(page: Page): Promise<void> {
  assert.ok(existsSync(STATE), "the first phase left no state");
  const state: SavedState = JSON.parse(readFileSync(STATE, "utf8"));
  checks.push(...state.checks);
  screens.push(...state.screens);
  await step("6.9 after an app restart the project opens with the same panels at the same places", async () => {
    await leftBar(page).waitFor({ state: "visible", timeout: 60_000 });
    await closeBlockingDialogs(page);
    await dismissToasts(page);
    await projectButton(page, state.projectName).click();
    const restored = await until(
      page,
      "three restored panels",
      () => panelBoxes(page),
      (boxes) => boxes.length === state.boxes.length && boxes.every((entry) => entry.marker !== "draft"),
    );
    for (const saved of state.boxes) {
      const now = box(restored, saved.marker);
      for (const key of ["x", "y", "width", "height"] as const)
        assert.ok(Math.abs(now[key] - saved[key]) < 0.03, `${saved.marker} ${key}: ${now[key]} vs ${saved[key]}`);
    }
    await until(
      page,
      "restored chats show their titles and replies",
      () => page.locator(".project-dock-surface").innerText(),
      (text) => MARKERS.every((marker) => text.includes(marker)) && (text.match(/The each server/g) ?? []).length >= 3,
    );
    screens.push(await shot(page, "dock-restored-after-restart-dark"));
    return `${restored.length} panels`;
  });
}

const session = await connectChannelE2e("dock-layout-e2e");
const { page } = session;
const pageErrors: string[] = [];
page.on("pageerror", (error) => pageErrors.push(error.message));
const restore = await prepareWindow(page);
try {
  if (phase === "second") await secondPhase(page);
  else await firstPhase(page);
} catch (error) {
  checks.push({
    name: "the scenario finished",
    passed: false,
    detail: error instanceof Error ? error.message : String(error),
  });
} finally {
  await restore();
  if (quitRequested) await quitApp(page).catch(() => undefined);
  else await session.close().catch(() => undefined);
}
const passed = checks.length > 0 && checks.every((entry) => entry.passed);
if (phase !== "first" || !passed) {
  const reportPath = writeReport("dock-layout", {
    passed: passed && phase === "second",
    checks,
    screens,
    pageErrors,
  });
  process.stdout.write(`report: ${reportPath}\n`);
}
process.exit(passed ? 0 : 1);
