import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { translateFor } from "@codebot/i18n";
import { connectChannelE2e, waitFor, writeReport } from "./channel-e2e-support";

const NAME = "server-mode-ui";
const SCREENS = resolve(import.meta.dirname, "../.codebot-build/c1/screens");
mkdirSync(SCREENS, { recursive: true });
const english = translateFor("en");
const THEME: "light" | "dark" = process.env.C1_THEME === "light" ? "light" : "dark";
const UI_WAIT_MS = 60_000;
const SERVER_WAIT_MS = 240_000;

interface Check {
  name: string;
  passed: boolean;
  detail?: unknown;
}

const report: { passed: boolean; checks: Check[]; screenshots: string[]; pageErrors: string[]; unverified: string[] } =
  {
    passed: false,
    checks: [],
    screenshots: [],
    pageErrors: [],
    unverified: [
      "A server on another computer. The home server of this check is a second engine process on this computer, made with the local server feature.",
    ],
  };

const session = await connectChannelE2e(NAME);
const { page } = session;
page.on("pageerror", (error) => report.pageErrors.push(error.stack ?? error.message));

function pass(name: string, condition: boolean, detail?: unknown): void {
  report.checks.push({ name, passed: condition, ...(detail === undefined ? {} : { detail }) });
  assert.ok(condition, `${name}: ${JSON.stringify(detail)}`);
}

async function shot(label: string): Promise<void> {
  await page.mouse.move(900, 300);
  await page.waitForTimeout(1200);
  const path = resolve(SCREENS, `${label}-${THEME}.png`);
  await page.screenshot({ path });
  report.screenshots.push(path);
}

const railButton = () => page.locator(".window-rail-server");
const menu = () => page.getByRole("menu", { name: english("server.menu.label") });
const menuRow = (name: string) => page.locator(".server-menu-row", { hasText: name });
async function openMenu(): Promise<void> {
  if (!(await menu().isVisible())) await railButton().click();
  await menu().waitFor({ state: "visible", timeout: UI_WAIT_MS });
}
async function chooseServer(name: string): Promise<void> {
  await openMenu();
  await menuRow(name).first().click();
  await menu().waitFor({ state: "hidden", timeout: UI_WAIT_MS });
}
const activeServer = () =>
  page.evaluate(async () => {
    const found = (await window.codebot.servers.list()).find((server) => server.active);
    return found ? { id: found.id, kind: found.kind, name: found.name, state: found.state } : null;
  });

let homeServerId: string | null = null;
try {
  await page.setViewportSize({ width: 1440, height: 900 }).catch(() => undefined);
  await page.waitForFunction(() => window.codebot !== undefined, undefined, { timeout: UI_WAIT_MS });
  await page.evaluate(
    (appearance: "light" | "dark") =>
      window.codebot.setAppAppearancePreference({
        appearance,
        palette: appearance === "light" ? "codebot-light" : "codebot-dark",
      }),
    THEME,
  );
  const continueButton = page.getByRole("button", { name: "Continue" });
  if (await continueButton.isVisible().catch(() => false)) {
    await continueButton.click({ timeout: UI_WAIT_MS });
    await continueButton.waitFor({ state: "detached", timeout: UI_WAIT_MS });
    await page
      .getByText("Use free models")
      .click({ timeout: UI_WAIT_MS })
      .catch(() => undefined);
  }
  await railButton().waitFor({ state: "visible", timeout: UI_WAIT_MS });
  pass(
    "The Projects column has no This computer or Home server tabs",
    (await page.getByRole("tab", { name: "This computer" }).count()) === 0 &&
      (await page.getByRole("tab", { name: "Home server" }).count()) === 0,
  );
  pass("Local is the active server at the start", (await activeServer())?.kind === "local");
  await shot("projects-no-tabs");

  await page.evaluate(async () => {
    for (const server of await window.codebot.servers.list()) {
      if (server.kind === "remote" && server.name === "Home server") {
        await window.codebot.localServers
          .delete(server.id)
          .catch(() => window.codebot.servers.remove(server.id))
          .catch(() => undefined);
      }
    }
  });
  const created = await page.evaluate(() => window.codebot.localServers.create("Home server"));
  homeServerId = created.id;
  await waitFor(
    page,
    "the home server to be online",
    () =>
      page.evaluate(
        async (id) => (await window.codebot.servers.list()).find((server) => server.id === id)?.state ?? "missing",
        created.id,
      ),
    (state) => state === "online",
    SERVER_WAIT_MS,
  );
  pass("A second engine is joined as a server", true, created.name);

  await openMenu();
  pass(
    "The Servers list shows Local and the home server",
    (await menuRow("Local").count()) > 0 && (await menuRow(created.name).count()) > 0,
  );
  pass(
    "The menu has Add a server and Server layout",
    (await page.getByRole("menuitem", { name: /^Add (a|remote) server$/ }).count()) > 0 &&
      (await page.getByRole("menuitem", { name: english("server.menu.layout") }).count()) > 0,
  );
  pass(
    "The menu has no credits or buy credits row",
    (await menu()
      .getByText(/credits/i)
      .count()) === 0,
  );
  await shot("server-menu-open");
  await chooseServer(created.name);
  await waitFor(page, "the home server to be active", activeServer, (server) => server?.id === created.id, UI_WAIT_MS);
  pass(
    "A click on the home server in the menu makes the server engine the active engine",
    (await activeServer())?.kind === "remote",
  );
  await page.waitForFunction(() => document.querySelector(".app-loading") === null, undefined, {
    timeout: SERVER_WAIT_MS,
  });
  const welcome = page.locator(".server-onboarding-screen");
  if (await welcome.isVisible().catch(() => false)) {
    await shot("home-server-welcome");
    await welcome.getByText("Codex", { exact: true }).first().click({ timeout: UI_WAIT_MS });
    await welcome.getByRole("button", { name: /^(Continue|Use free models)/ }).click({ timeout: UI_WAIT_MS });
    await welcome.waitFor({ state: "detached", timeout: SERVER_WAIT_MS });
  }
  await openMenu();
  pass(
    "The home server has the check mark in the menu",
    (await menuRow(created.name).first().getAttribute("aria-current")) === "true",
  );
  await page.keyboard.press("Escape");

  const folder = resolve(import.meta.dirname, "../.codebot-build/w17/home-project");
  mkdirSync(folder, { recursive: true });
  const project = await page.evaluate(
    ([serverId, mainFolder]) =>
      window.codebot.projects.create(
        { name: "Server project", mainFolder, accessLevel: "open", agents: [{ name: "Ada", role: "Developer" }] },
        serverId,
      ),
    [created.id, folder] as const,
  );
  await waitFor(
    page,
    "the server project to show in the left bar",
    () =>
      page.evaluate(() => {
        const row = [...document.querySelectorAll(".project-row-name")].find(
          (element) => element.textContent === "Server project",
        );
        if (!row) return false;
        const box = row.getBoundingClientRect();
        const top = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
        return top !== null && row.closest("aside") === top.closest("aside");
      }),
    (shown) => shown,
    UI_WAIT_MS,
  );
  pass("A project made on the home server shows in the left bar", true, project.project.id);
  await shot("switch-home-server");

  const hostProjects = await page.evaluate(() => window.codebot.projects.list("local"));
  pass(
    "The project is not on this computer, only on the server",
    !hostProjects.some((entry) => entry.id === project.project.id),
  );

  await chooseServer("Local");
  await waitFor(page, "this computer to be active", activeServer, (server) => server?.kind === "local", UI_WAIT_MS);
  pass("A click on Local returns to the local engine", (await activeServer())?.kind === "local");
  const stillThere = await page.getByText("Server project").count();
  pass("The server project is not listed while this computer is active", stillThere === 0, stillThere);
  await shot("switch-back-to-computer");
  report.passed = true;
} catch (error) {
  report.checks.push({ name: "error", passed: false, detail: error instanceof Error ? error.message : String(error) });
  process.exitCode = 1;
} finally {
  await page
    .evaluate(() => window.codebot.setAppAppearancePreference({ appearance: "dark", palette: "codebot-dark" }))
    .catch(() => undefined);
  if (homeServerId) {
    await page
      .evaluate(async (id) => {
        const servers = await window.codebot.servers.list();
        const local = servers.find((server) => server.kind === "local");
        if (local && !local.active) await window.codebot.servers.select(local.id);
        await window.codebot.localServers.delete(id);
      }, homeServerId)
      .catch(() => undefined);
  }
  const path = writeReport(NAME, report);
  process.stdout.write(`${report.passed ? "PASS" : "FAIL"} ${path}\n`);
  await session.close().catch(() => undefined);
}
