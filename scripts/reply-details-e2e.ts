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

const { checks, step } = createChecks();
const screens: string[] = [];
const rail = (page: Page) => page.getByRole("navigation", { name: "Pages" });

async function setReplyView(page: Page, view: "Short" | "Detailed"): Promise<void> {
  await rail(page).getByRole("button", { name: "Settings", exact: true }).click();
  const select = page.getByRole("button", { name: "Reply view" }).first();
  await select.waitFor({ state: "visible", timeout: 30_000 });
  await select.scrollIntoViewIfNeeded();
  await select.click();
  await page.getByRole("option", { name: view, exact: true }).click();
  await until(
    page,
    `reply view ${view}`,
    () => select.innerText(),
    (text) => text.includes(view),
  );
  screens.push(await shot(page, `reply-view-setting-${view.toLowerCase()}-dark`));
  await closeBlockingDialogs(page);
}

async function main(): Promise<void> {
  const session = await connectChannelE2e("reply-details-e2e");
  const { page } = session;
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  const restore = await prepareWindow(page);
  const folder = await mkdtemp(join(tmpdir(), "codebot-reply-details-"));
  mkdirSync(folder, { recursive: true });
  try {
    const projectName = `R${Date.now().toString(36).slice(-4)} Replies`;
    await createProjectWithAgent(page, projectName, folder);

    await step("8.5 the reply view is Short by default and the setting offers Short and Detailed", async () => {
      await rail(page).getByRole("button", { name: "Settings", exact: true }).click();
      const select = page.getByRole("button", { name: "Reply view" }).first();
      await select.waitFor({ state: "visible", timeout: 30_000 });
      assert.match(await select.innerText(), /Short/);
      await closeBlockingDialogs(page);
    });

    await projectButton(page, projectName).click();
    const panel = chatPanels(page).first();
    await panel.waitFor({ state: "visible", timeout: 60_000 });
    await sendInPanel(page, panel, "Check the build [steps] [long-code]");
    await waitForChatsIdle(page, projectName, 1);

    await step("8.6 a code block longer than 20 lines folds with a Show all button", async () => {
      const showAll = panel.getByRole("button", { name: "Show all (30 lines)" });
      await showAll.waitFor({ state: "visible", timeout: 30_000 });
      assert.equal(await panel.getByText("const line30 = 30;").isVisible(), false, "line 30 is shown while folded");
      await showAll.scrollIntoViewIfNeeded();
      screens.push(await shot(page, "reply-code-folded-dark"));
      await showAll.click();
      await panel.getByText("const line30 = 30;").waitFor({ state: "visible", timeout: 30_000 });
      const showLess = panel.getByRole("button", { name: "Show less" });
      await showLess.scrollIntoViewIfNeeded();
      screens.push(await shot(page, "reply-code-unfolded-dark"));
      await showLess.click();
      await showAll.waitFor({ state: "visible", timeout: 30_000 });
    });

    await step("8.4 Short shows a one-line summary and Details opens every step with input and output", async () => {
      const summary = panel.getByText(/ran 5 commands/);
      await summary.first().waitFor({ state: "visible", timeout: 30_000 });
      assert.equal(await panel.getByText("ls -la").count(), 0, "a step is shown before Details opens");
      const details = panel.getByRole("button", { name: "Details" }).first();
      await details.click();
      await panel.getByRole("button", { name: "Hide details" }).first().waitFor({ timeout: 30_000 });
      await until(
        page,
        "the five commands are listed",
        () => panel.getByText("ls -la").count(),
        (count) => count >= 5,
      );
      await panel
        .getByText(/Reading the request/)
        .first()
        .waitFor({ state: "visible", timeout: 30_000 });
      await panel.getByText("Output").first().waitFor({ state: "visible", timeout: 30_000 });
      await panel
        .getByText(/file-0\.txt/)
        .first()
        .waitFor({ state: "visible", timeout: 30_000 });
      await panel
        .getByText(/ran 5 commands/)
        .first()
        .scrollIntoViewIfNeeded();
      screens.push(await shot(page, "reply-details-open-dark"));
      await panel.getByRole("button", { name: "Hide details" }).first().click();
      await panel.getByRole("button", { name: "Details" }).first().waitFor({ timeout: 30_000 });
    });

    await step("8.5 with Detailed in settings the steps show without a click", async () => {
      await setReplyView(page, "Detailed");
      await projectButton(page, projectName).click();
      await until(
        page,
        "steps shown",
        () => chatPanels(page).first().getByText("ls -la").count(),
        (count) => count >= 1,
      );
      screens.push(await shot(page, "reply-detailed-default-dark"));
      await setReplyView(page, "Short");
      await projectButton(page, projectName).click();
      await until(
        page,
        "steps hidden again",
        () => chatPanels(page).first().getByText("ls -la").count(),
        (count) => count === 0,
      );
    });
  } finally {
    await restore();
    await session.close();
    rmSync(folder, { recursive: true, force: true, maxRetries: 3 });
  }
  const passed = checks.length > 0 && checks.every((entry) => entry.passed);
  const reportPath = writeReport("reply-details", { passed, checks, screens, pageErrors });
  process.stdout.write(`report: ${reportPath}\n`);
  process.exitCode = passed ? 0 : 1;
}

await main();
