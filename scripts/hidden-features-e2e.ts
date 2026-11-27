import assert from "node:assert/strict";
import { resolve } from "node:path";
import type { AdvancedFeatureId } from "@codebot/contracts/ipc";
import type { Page } from "playwright-core";
import {
  closeBlockingDialogs,
  createChecks,
  dismissToasts,
  leftBar,
  prepareWindow,
  shot,
  until,
} from "./app-e2e-support";
import { connectChannelE2e, writeReport } from "./channel-e2e-support";

const SCREENS = resolve(import.meta.dirname, "../.codebot-build/f3/screens");

let activePage: Page | undefined;
const { checks, step } = createChecks(() => activePage);
const screens: string[] = [];
const observations: string[] = [];
const rail = (page: Page) => page.getByRole("navigation", { name: "Pages" });

async function showProjects(page: Page): Promise<void> {
  await closeBlockingDialogs(page);
  if (
    !(await leftBar(page)
      .isVisible()
      .catch(() => false))
  )
    await rail(page).getByRole("button", { name: "Projects", exact: true }).click();
  await leftBar(page).waitFor({ state: "visible", timeout: 30_000 });
}

async function railHas(page: Page, label: string): Promise<boolean> {
  if (
    await rail(page)
      .getByRole("button", { name: label, exact: true })
      .isVisible()
      .catch(() => false)
  )
    return true;
  const more = rail(page).getByRole("button", { name: "More", exact: true });
  if (!(await more.isVisible().catch(() => false))) return false;
  await more.click();
  await page.getByRole("menu").first().waitFor({ state: "visible", timeout: 10_000 });
  const found = (await page.getByRole("menu").getByText(label, { exact: true }).count()) > 0;
  await page.keyboard.press("Escape");
  await page
    .getByRole("menu")
    .first()
    .waitFor({ state: "hidden", timeout: 10_000 })
    .catch(() => undefined);
  return found;
}

async function openSettingsTab(page: Page, tab: string): Promise<void> {
  await rail(page).getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("tab", { name: tab, exact: true }).first().click();
}

async function settingsTabShown(page: Page, tab: string): Promise<boolean> {
  await rail(page).getByRole("button", { name: "Settings", exact: true }).click();
  await page
    .getByRole("tab", { name: "Advanced features", exact: true })
    .first()
    .waitFor({ state: "visible", timeout: 30_000 });
  const shown = (await page.getByRole("tab", { name: tab, exact: true }).count()) > 0;
  await showProjects(page);
  return shown;
}

async function engineSetting(page: Page, feature: AdvancedFeatureId): Promise<boolean> {
  return page.evaluate(async (id) => (await window.codebot.hostAdmin.getAdvancedFeatures("local"))[id], feature);
}

async function toggle(page: Page, title: string, feature: AdvancedFeatureId, enabled: boolean): Promise<void> {
  await openSettingsTab(page, "Advanced features");
  const control = page.getByRole("switch", { name: title, exact: true });
  await control.waitFor({ state: "visible", timeout: 30_000 });
  assert.equal(await control.isChecked(), !enabled, `${title} starts ${enabled ? "off" : "on"}`);
  await control.click({ force: true });
  await until(
    page,
    `${title} is ${enabled ? "on" : "off"}`,
    async () => [await control.isChecked(), await engineSetting(page, feature)] as const,
    ([checked, saved]) => checked === enabled && saved === enabled,
  );
}

interface Feature {
  id: AdvancedFeatureId;
  title: string;
  where: string;
  shown: (page: Page) => Promise<boolean>;
}

const FEATURES: Feature[] = [
  { id: "routines", title: "Routines", where: "Schedule in the left bar", shown: (page) => railHas(page, "Schedule") },
  {
    id: "marketplace",
    title: "Marketplace",
    where: "Marketplace in the left bar",
    shown: (page) => railHas(page, "Marketplace"),
  },
  {
    id: "computerUse",
    title: "Computer Use",
    where: "Computer Use tab in settings",
    shown: (page) => settingsTabShown(page, "Computer Use"),
  },
];

async function main(): Promise<void> {
  const session = await connectChannelE2e("hidden-features-e2e");
  const { page } = session;
  activePage = page;
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  const restore = await prepareWindow(page);
  try {
    await page.evaluate(
      async (ids) => {
        for (const feature of ids)
          await window.codebot.hostAdmin.setAdvancedFeature({ feature, enabled: false }, "local");
      },
      ["routines", "channels", "marketplace", "chatApps", "computerUse", "remoteDesktop"] satisfies AdvancedFeatureId[],
    );
    await page.reload();
    await leftBar(page).waitFor({ state: "visible", timeout: 60_000 });
    await closeBlockingDialogs(page);
    await dismissToasts(page);

    await step("15.1 with every switch off, no hidden feature has a button on the main screen", async () => {
      for (const feature of FEATURES) assert.equal(await feature.shown(page), false, `${feature.where} is shown`);
      screens.push(await shot(page, "hidden-features-off-main-dark", SCREENS));
      await openSettingsTab(page, "Advanced features");
      for (const feature of FEATURES)
        assert.equal(await page.getByRole("switch", { name: feature.title, exact: true }).isChecked(), false);
      screens.push(await shot(page, "hidden-features-settings-off-dark", SCREENS));
      await showProjects(page);
      return FEATURES.map((feature) => feature.where).join(", ");
    });

    for (const feature of FEATURES) {
      await step(`15.2 turning on ${feature.title} shows ${feature.where}`, async () => {
        await toggle(page, feature.title, feature.id, true);
        screens.push(await shot(page, `hidden-features-${feature.id}-on-settings-dark`, SCREENS));
        await showProjects(page);
        await until(
          page,
          `${feature.where} shown`,
          () => feature.shown(page),
          (shown) => shown,
        );
        if (feature.id === "computerUse") {
          await openSettingsTab(page, "Computer Use");
          await page.getByRole("tabpanel").first().waitFor({ state: "visible", timeout: 30_000 });
        } else {
          const label = feature.id === "routines" ? "Schedule" : feature.title;
          const direct = rail(page).getByRole("button", { name: label, exact: true });
          if (!(await direct.isVisible().catch(() => false))) {
            await rail(page).getByRole("button", { name: "More", exact: true }).click();
            await page
              .getByRole("menu")
              .getByText(label, { exact: true })
              .waitFor({ state: "visible", timeout: 10_000 });
          }
        }
        screens.push(await shot(page, `hidden-features-${feature.id}-on-dark`, SCREENS));
        await page.keyboard.press("Escape");
        await showProjects(page);
      });

      await step(`15.1 turning off ${feature.title} hides ${feature.where} again`, async () => {
        await toggle(page, feature.title, feature.id, false);
        await showProjects(page);
        await until(
          page,
          `${feature.where} hidden`,
          () => feature.shown(page),
          (shown) => !shown,
        );
      });
    }

    await step("15.1 the switch is kept after a reload", async () => {
      await toggle(page, "Routines", "routines", true);
      await page.reload();
      await leftBar(page).waitFor({ state: "visible", timeout: 60_000 });
      await closeBlockingDialogs(page);
      await dismissToasts(page);
      await until(
        page,
        "Schedule after the reload",
        () => railHas(page, "Schedule"),
        (shown) => shown,
      );
      await toggle(page, "Routines", "routines", false);
      await showProjects(page);
      await until(
        page,
        "Schedule hidden",
        () => railHas(page, "Schedule"),
        (shown) => !shown,
      );
    });
  } finally {
    await page
      .evaluate(
        async (ids) => {
          for (const feature of ids)
            await window.codebot.hostAdmin.setAdvancedFeature({ feature, enabled: false }, "local");
        },
        FEATURES.map((feature) => feature.id),
      )
      .catch(() => undefined);
    await restore();
    await session.close();
  }
  if (pageErrors.length > 0) observations.push(`page errors: ${pageErrors.join(" | ")}`);
  const passed = checks.length > 0 && checks.every((entry) => entry.passed);
  const reportPath = writeReport("hidden-features", { passed, checks, observations, screens, pageErrors });
  process.stdout.write(`report: ${reportPath}\n`);
  process.exitCode = passed ? 0 : 1;
}

await main();
