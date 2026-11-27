import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
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
const projectFolder = await mkdtemp(join(tmpdir(), "codebot-slash-ui-"));
await page.reload();
await page
  .getByRole("navigation", { name: english("project.list.label") })
  .waitFor({ state: "visible", timeout: UI_WAIT_MS });
for (let attempt = 0; attempt < 4; attempt += 1) {
  if (
    !(await page
      .locator("[role=dialog], [role=alertdialog]")
      .first()
      .isVisible()
      .catch(() => false))
  )
    break;
  await page.keyboard.press("Escape");
  await page.waitForTimeout(250);
}
await page.evaluate(() => {
  for (const button of document.querySelectorAll<HTMLElement>(".ui-toaster li button[aria-label]")) button.click();
});
await page.waitForTimeout(500);
await page
  .getByRole("button", { name: english("project.new"), exact: true })
  .first()
  .click();
const createDialog = page.getByRole("dialog");
await createDialog.getByLabel(english("project.field.mainFolder")).fill(projectFolder);
await createDialog.getByLabel(english("project.field.name"), { exact: true }).fill(agentName);
await createDialog.getByRole("button", { name: english("project.create.submit") }).click();
await page
  .getByRole("navigation", { name: english("project.list.label") })
  .getByRole("button", { name: english("project.row.open", { name: agentName }), exact: true })
  .waitFor({ timeout: UI_WAIT_MS });
await page.evaluate(() => window.codebot.setProviderApiKey({ provider: "claude", key: "sk-ant-recorder-not-a-key" }));
const agent = await waitFor(
  page,
  "the project agent",
  () =>
    page.evaluate(() =>
      window.codebot.agent.listAgents().then((list) => list.filter((entry) => entry.name === "Developer").at(-1)),
    ),
  (found) => found !== undefined,
).then((found) => {
  assert.ok(found, "The project agent exists.");
  return found;
});
await page.evaluate(
  (id) => window.codebot.agent.updateAgent({ agentId: id, provider: "claude", model: "claude-haiku-5-5" }),
  agent.id,
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
    () => page.evaluate((id) => window.codebot.slashCommands.list({ agentId: id }, "local"), agent.id),
    (list) => list.commands.length > 10,
  );
  await page.bringToFront();
  const composer = page.locator(".project-chat-panel:visible").first().getByRole("textbox").first();
  await composer.waitFor({ timeout: UI_WAIT_MS });
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
  writeReport(NAME, report);
  await session.close();
}

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (!report.passed) process.exitCode = 1;
