import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { translateFor } from "@codebot/i18n";
import { connectChannelE2e, waitFor, writeReport } from "./channel-e2e-support";

const NAME = "server-mode-ui";
const SCREENS = resolve(import.meta.dirname, "../.codebot-build/w17/screens");
mkdirSync(SCREENS, { recursive: true });
const english = translateFor("en");
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
  await page.waitForTimeout(600);
  const path = resolve(SCREENS, `${label}.png`);
  await page.screenshot({ path });
  report.screenshots.push(path);
}

const computerTab = () => page.getByRole("tab", { name: english("serverMode.switch.thisComputer") });
const homeTab = () => page.getByRole("tab", { name: english("serverMode.switch.homeServer") });
const activeServer = () =>
  page.evaluate(async () => {
    const found = (await window.codebot.servers.list()).find((server) => server.active);
    return found ? { id: found.id, kind: found.kind, name: found.name, state: found.state } : null;
  });

let homeServerId: string | null = null;
try {
  await page.setViewportSize({ width: 1440, height: 900 }).catch(() => undefined);
  await page.waitForFunction(() => window.codebot !== undefined, undefined, { timeout: UI_WAIT_MS });
  await homeTab().waitFor({ state: "visible", timeout: UI_WAIT_MS });
  pass(
    "The switch shows This computer and Home server in the left bar",
    (await computerTab().isVisible()) && (await homeTab().isVisible()),
  );
  pass("This computer is selected at the start", (await computerTab().getAttribute("aria-selected")) === "true");
  await shot("switch-this-computer");

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

  await homeTab().click();
  await waitFor(page, "the home server to be active", activeServer, (server) => server?.id === created.id, UI_WAIT_MS);
  pass("A click on Home server makes the server engine the active engine", (await activeServer())?.kind === "remote");
  pass("Home server is selected in the switch", (await homeTab().getAttribute("aria-selected")) === "true");

  const folder = resolve(import.meta.dirname, "../.codebot-build/w17/home-project");
  mkdirSync(folder, { recursive: true });
  const project = await page.evaluate(
    ([serverId, mainFolder]) =>
      window.codebot.projects.create(
        { name: "Server project", mainFolder, agents: [{ name: "Ada", role: "Developer" }] },
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

  await computerTab().click();
  await waitFor(page, "this computer to be active", activeServer, (server) => server?.kind === "local", UI_WAIT_MS);
  pass(
    "A click on This computer returns to the local engine",
    (await computerTab().getAttribute("aria-selected")) === "true",
  );
  const stillThere = await page.getByText("Server project").count();
  pass("The server project is not listed while this computer is active", stillThere === 0, stillThere);
  await shot("switch-back-to-computer");
  report.passed = true;
} catch (error) {
  report.checks.push({ name: "error", passed: false, detail: error instanceof Error ? error.message : String(error) });
  process.exitCode = 1;
} finally {
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
