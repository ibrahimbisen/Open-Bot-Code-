import { mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import type { Page } from "playwright-core";

export interface AppCheck {
  name: string;
  passed: boolean;
  detail?: string;
}

export const APP_WAIT_MS = 60_000;
export const F2_SCREENS = resolve(import.meta.dirname, "../.codebot-build/f2/screens");

export function createChecks(failurePage?: () => Page | undefined): {
  checks: AppCheck[];
  step: (name: string, run: () => Promise<unknown>) => Promise<boolean>;
} {
  const checks: AppCheck[] = [];
  const step = async (name: string, run: () => Promise<unknown>): Promise<boolean> => {
    try {
      const result = await run();
      const detail = typeof result === "string" ? result : undefined;
      checks.push({ name, passed: true, ...(detail ? { detail } : {}) });
      process.stdout.write(`ok   ${name}${detail ? ` (${detail})` : ""}\n`);
      return true;
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      checks.push({ name, passed: false, detail });
      const page = failurePage?.();
      if (page) {
        const folder = resolve(F2_SCREENS, "../failures");
        mkdirSync(folder, { recursive: true });
        await page.screenshot({ path: join(folder, `${checks.length}-${Date.now()}.png`) }).catch(() => undefined);
      }
      process.stdout.write(`FAIL ${name}: ${detail}\n`);
      return false;
    }
  };
  return { checks, step };
}

export async function until<T>(
  page: Page,
  label: string,
  read: () => Promise<T>,
  ready: (value: T) => boolean,
  timeoutMs = APP_WAIT_MS,
): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const value = await read();
    if (ready(value)) return value;
    if (Date.now() > deadline) throw new Error(`Timed out: ${label}. Last value: ${JSON.stringify(value)}`);
    await page.waitForTimeout(200);
  }
}

export async function shot(page: Page, name: string, folder = F2_SCREENS): Promise<string> {
  mkdirSync(folder, { recursive: true });
  const path = join(folder, `${name}.png`);
  await page.screenshot({ path });
  return path;
}

export const leftBar = (page: Page) => page.getByRole("navigation", { name: "Project list" });
export const projectColumn = (page: Page) => page.locator("#project-column");
export const chatPanels = (page: Page) => page.locator(".project-chat-panel:visible");
export const projectButton = (page: Page, name: string) =>
  leftBar(page).getByRole("button", { name: `Open the project ${name}`, exact: true });

export async function closeBlockingDialogs(page: Page): Promise<void> {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const dialog = page.locator("[role=dialog], [role=alertdialog]").first();
    if (!(await dialog.isVisible().catch(() => false))) return;
    await page.keyboard.press("Escape");
    await page.waitForTimeout(250);
  }
}

export async function dismissToasts(page: Page): Promise<void> {
  await page.evaluate(() => {
    for (const button of document.querySelectorAll<HTMLElement>(".ui-toaster li button[aria-label]")) button.click();
  });
  await page.waitForTimeout(400);
}

export async function prepareWindow(page: Page, width = 1600, height = 900): Promise<() => Promise<void>> {
  const viewport = await page.context().newCDPSession(page);
  await viewport.send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 0, mobile: false });
  await page.reload();
  await leftBar(page).waitFor({ state: "visible", timeout: APP_WAIT_MS });
  await closeBlockingDialogs(page);
  await dismissToasts(page);
  return async () => {
    await viewport.send("Emulation.clearDeviceMetricsOverride").catch(() => undefined);
  };
}

export async function createProjectWithAgent(page: Page, name: string, folder: string): Promise<string> {
  const detail = await page.evaluate((input) => window.codebot.projects.create(input), {
    name,
    mainFolder: folder,
    accessLevel: "open" as const,
    agents: [{ name: "Dev", role: "Developer" }],
  });
  await page.reload();
  await leftBar(page).waitFor({ state: "visible", timeout: APP_WAIT_MS });
  await closeBlockingDialogs(page);
  await dismissToasts(page);
  await projectButton(page, name).waitFor({ state: "visible", timeout: APP_WAIT_MS });
  return detail.project.id;
}

export async function sendInPanel(page: Page, panel: ReturnType<typeof chatPanels>, text: string): Promise<void> {
  const editor = panel.getByRole("textbox").first();
  await editor.click();
  await page.keyboard.type(text);
  await page.waitForTimeout(400);
  for (let attempt = 0; attempt < 5; attempt += 1) {
    await page.keyboard.press("Enter");
    await page.waitForTimeout(1200);
    const left = await editor.innerText().catch(() => "");
    if (!left.includes(text)) return;
  }
}

export async function waitForChatsIdle(page: Page, projectName: string, count: number): Promise<void> {
  await until(
    page,
    `${count} idle chats`,
    () =>
      page.evaluate(async (wanted) => {
        const project = (await window.codebot.projects.list()).find((entry) => entry.name === wanted);
        if (!project) return [];
        const listed = await window.codebot.projects.listChats({ projectId: project.id, limit: 50 });
        return listed.chats.map((chat) => chat.state);
      }, projectName),
    (states) => states.length >= count && states.every((state) => state === "idle"),
  );
}

export function phaseOf(argv: readonly string[]): "first" | "second" | null {
  const flag = argv.find((value) => value.startsWith("--phase="));
  if (flag === "--phase=first") return "first";
  if (flag === "--phase=second") return "second";
  return null;
}
