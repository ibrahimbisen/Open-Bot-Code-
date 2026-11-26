import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { translateFor } from "@codebot/i18n";
import { connectChannelE2e, waitFor, writeReport } from "./channel-e2e-support";

const NAME = "slash-commands-ui";
const SCREENS = resolve(import.meta.dirname, "../.codebot-build/w08-slash/screens");
mkdirSync(SCREENS, { recursive: true });
const UI_WAIT_MS = 30_000;
const english = translateFor("en");

interface Report {
  agentId?: string;
  rows: string[];
  filtered: string[];
  screens: Record<string, string>;
  pageErrors: string[];
  screenshots: string[];
  passed: boolean;
}
const report: Report = { rows: [], filtered: [], screens: {}, pageErrors: [], screenshots: [], passed: false };
const session = await connectChannelE2e(NAME);
const { page } = session;
page.on("pageerror", (error) => report.pageErrors.push(error.stack ?? error.message));

async function shot(label: string): Promise<void> {
  const path = resolve(SCREENS, `${label}.png`);
  await page.screenshot({ path });
  report.screenshots.push(path);
}

const marker = crypto.randomUUID().replace(/-/g, "").slice(0, 6);
const agentName = `Slash ${marker}`;
const agent = await page.evaluate(
  (name) =>
    window.codebot.agent.createAgent({
      name,
      description: "Slash command check",
      avatarSeed: `slash${name.replace(/[^a-z0-9]/gi, "").toLowerCase()}`,
      avatarHue: null,
      initialMessage: "Reply with the single word ready.",
      provider: "claude",
    }),
  agentName,
);
report.agentId = agent.id;

const picker = () => page.getByRole("listbox", { name: english("slash.picker.label") });
const optionRows = () =>
  picker().evaluate((list) =>
    [...list.querySelectorAll("[role=option]")].map((option) => option.getAttribute("aria-label") ?? ""),
  );
const option = (name: string) => english("slash.picker.option", { name });

try {
  await waitFor(
    page,
    "the saved command list",
    () => page.evaluate((id) => window.codebot.slashCommands.list({ agentId: id }), agent.id),
    (list) => list.commands.length > 10,
  );
  await page.bringToFront();
  await page
    .getByRole("navigation", { name: english("sidebar.nav.label") })
    .getByRole("button", { name: new RegExp(`^${agentName}[,.]`) })
    .first()
    .click();
  const composer = page.getByRole("textbox", { name: english("composer.placeholder.message", { name: agentName }) });
  await composer.waitFor({ timeout: UI_WAIT_MS });
  await page.waitForFunction(
    (label) => {
      const box = document.querySelector(`[aria-label="${label}"]`);
      return box !== null && box.getAttribute("aria-disabled") !== "true" && !box.hasAttribute("disabled");
    },
    english("composer.placeholder.message", { name: agentName }),
    { timeout: UI_WAIT_MS },
  );
  await composer.click();
  await composer.pressSequentially("/");
  await picker().waitFor({ timeout: UI_WAIT_MS });
  report.rows = await optionRows();
  assert.ok(report.rows.includes(option("model")), "The menu lists /model.");
  assert.ok(report.rows.includes(option("compact")), "The menu lists /compact from the engine.");
  assert.ok(report.rows.length > 10, "The menu lists the engine commands.");
  await shot("menu-all");

  await composer.pressSequentially("co");
  await waitFor(page, "the filter", optionRows, (rows) => rows.length > 0 && rows.length < report.rows.length);
  report.filtered = await optionRows();
  assert.ok(
    report.filtered.every((row) => row.toLowerCase().includes("co")),
    "Each row matches the query.",
  );
  await shot("menu-filtered");

  for (const [command, title] of [
    ["model", english("slash.model.title")],
    ["effort", english("slash.effort.title")],
    ["resume", english("slash.resume.title")],
  ] as const) {
    await composer.fill("");
    await composer.pressSequentially(`/${command}`);
    await picker()
      .getByRole("option", { name: option(command) })
      .first()
      .waitFor({ timeout: UI_WAIT_MS });
    await picker()
      .getByRole("option", { name: option(command) })
      .first()
      .click();
    const dialog = page.getByRole("dialog", { name: title });
    await dialog.waitFor({ timeout: UI_WAIT_MS });
    await page.waitForTimeout(600);
    await shot(`screen-${command}`);
    report.screens[command] = title;
    await page.keyboard.press("Escape");
    await dialog.waitFor({ state: "detached", timeout: UI_WAIT_MS });
  }

  await composer.fill("");
  await composer.pressSequentially("/xyzzy");
  await page.getByText(english("slash.picker.noMatch", { query: "xyzzy" })).waitFor({ timeout: UI_WAIT_MS });
  await shot("menu-no-match");
  report.passed = true;
} finally {
  await page
    .getByRole("textbox", { name: english("composer.placeholder.message", { name: agentName }) })
    .fill("")
    .catch(() => undefined);
  await page.evaluate((id) => window.codebot.agent.deleteAgent(id), agent.id).catch(() => undefined);
  writeReport(NAME, report);
  await session.close();
}

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (!report.passed) process.exitCode = 1;
