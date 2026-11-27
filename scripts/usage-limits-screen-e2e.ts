import assert from "node:assert/strict";
import { mkdirSync, rmSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Page } from "playwright-core";
import {
  chatPanels,
  closeBlockingDialogs,
  createChecks,
  createProjectWithAgent,
  prepareWindow,
  projectButton,
  sendInPanel,
  shot,
  until,
  waitForChatsIdle,
} from "./app-e2e-support";
import { connectChannelE2e, writeReport } from "./channel-e2e-support";

let activePage: Page | undefined;
const { checks, step } = createChecks(() => activePage);
const screens: string[] = [];
const statusButton = (page: Page) => page.getByRole("button", { name: /^Open status details/ }).first();

async function main(): Promise<void> {
  const session = await connectChannelE2e("usage-limits-screen-e2e");
  const { page } = session;
  activePage = page;
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  const restore = await prepareWindow(page);
  const folder = await mkdtemp(join(tmpdir(), "codebot-usage-limits-"));
  mkdirSync(folder, { recursive: true });
  try {
    const projectName = `U${Date.now().toString(36).slice(-4)} Limits`;
    await createProjectWithAgent(page, projectName, folder);
    await projectButton(page, projectName).click();
    const panel = chatPanels(page).first();
    await panel.waitFor({ state: "visible", timeout: 60_000 });
    await sendInPanel(page, panel, "Short question");
    await waitForChatsIdle(page, projectName, 1);

    await step("13.2 the status bar shows the 5-hour and weekly limit left of the provider", async () => {
      const bar = statusButton(page);
      await bar.waitFor({ state: "visible", timeout: 60_000 });
      const text = await until(
        page,
        "limit rows in the status bar",
        () => bar.innerText(),
        (value) => value.includes("5h") && value.includes("Week") && value.includes("63%") && value.includes("38%"),
        120_000,
      );
      const label = (await bar.getAttribute("aria-label")) ?? "";
      assert.match(label, /1 provider with limits/);
      screens.push(await shot(page, "status-bar-limits-dark"));
      return text.replace(/\s+/g, " ").trim();
    });

    await step("13.4 a click on the bar opens the detail view with each provider and the local machines", async () => {
      await statusButton(page).click();
      const dialog = page.getByRole("dialog", { name: "Status" });
      await dialog.waitFor({ state: "visible", timeout: 30_000 });
      await dialog.getByText("Providers", { exact: true }).waitFor({ state: "visible", timeout: 30_000 });
      await dialog.getByText("Local machines", { exact: true }).waitFor({ state: "visible", timeout: 30_000 });
      await dialog
        .getByText(/63% left/)
        .first()
        .waitFor({ state: "visible", timeout: 30_000 });
      await dialog
        .getByText(/38% left/)
        .first()
        .waitFor({ state: "visible", timeout: 30_000 });
      await dialog
        .getByText(/Resets/)
        .first()
        .waitFor({ state: "visible", timeout: 30_000 });
      screens.push(await shot(page, "status-detail-limits-dark"));
      await closeBlockingDialogs(page);
    });
  } finally {
    await restore();
    await session.close();
    rmSync(folder, { recursive: true, force: true, maxRetries: 3 });
  }
  const passed = checks.length > 0 && checks.every((entry) => entry.passed);
  const reportPath = writeReport("usage-limits-screen", { passed, checks, screens, pageErrors });
  process.stdout.write(`report: ${reportPath}\n`);
  process.exitCode = passed ? 0 : 1;
}

await main();
