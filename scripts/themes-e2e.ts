import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { CODEBOT_DARK_PALETTE, CODEBOT_LIGHT_PALETTE } from "@codebot/contracts/app-theme-defaults";
import type { CodeBotDesktopApi } from "@codebot/contracts/ipc";
import { en } from "@codebot/i18n";
import { createCodeBotLogger } from "@codebot/logging";
import type { Page } from "playwright-core";
import { contrastRatio, monacoThemeData } from "../src/renderer/src/editor-theme";
import { assertMutationAllowed, connectToDevApp } from "./dev-automation/cdp-client";
import { readDevInstanceRecords } from "./dev-automation/instance-registry";
import { resolveDevelopmentAppDataRoot } from "./development-state-paths";

declare global {
  interface Window {
    codebot: CodeBotDesktopApi;
  }
}

const OUT = resolve(import.meta.dirname, "../.codebot-build/themes");
const SCREENS = resolve(import.meta.dirname, "../.codebot-build/w16/screens");
const CUSTOM_ID = "e2e-custom-theme";
const CUSTOM_COLORS = {
  canvas: "#102030",
  frame: "#0a1420",
  sidebar: "#0a1420",
  surface: "#183048",
  text: "#e8f0f8",
  textMuted: "#7f98b0",
  border: "#2f4b66",
  accent: "#ff7a59",
  accentForeground: "#102030",
  success: "#4fd18b",
  warning: "#f2b84b",
  danger: "#ff6b81",
};

interface Check {
  name: string;
  passed: boolean;
  detail?: string;
}

const checks: Check[] = [];

function record(name: string, condition: boolean, detail?: string) {
  checks.push({ name, passed: condition, ...(detail === undefined ? {} : { detail }) });
  assert.ok(condition, `${name}${detail === undefined ? "" : `: ${detail}`}`);
}

const instances = readDevInstanceRecords().filter(
  (item) => item.service === "app" && resolve(item.projectRoot) === resolve(process.cwd()),
);
assert.equal(instances.length, 1, "Start one dev app for this worktree first.");
const instance = instances[0];
assert.ok(instance);
assertMutationAllowed({
  command: "themes-e2e",
  allowMutations: process.argv.includes("--allow-mutations"),
  instanceNamed: true,
  target: instance.instanceId,
});
const logger = createCodeBotLogger("themes-e2e");
const session = await connectToDevApp(instance.remoteDebuggingPort, logger, {
  expectedRendererPort: instance.rendererPort,
  ownerPid: instance.pid,
});
const themes = join(resolveDevelopmentAppDataRoot(), instance.profile, "themes");
const customFile = join(themes, `${CUSTOM_ID}.json`);
const page: Page = session.page;

mkdirSync(OUT, { recursive: true });
mkdirSync(SCREENS, { recursive: true });

function state() {
  return page.evaluate(() => {
    const root = document.documentElement;
    const style = getComputedStyle(root);
    const read = (name: string) => style.getPropertyValue(name).trim();
    return {
      scheme: root.dataset.codebotColorScheme ?? null,
      canvas: read("--codebot-bg-canvas"),
      text: read("--codebot-text-primary"),
      editorBackground: read("--codebot-editor-bg"),
      editorKeyword: read("--codebot-syntax-keyword"),
      body: getComputedStyle(document.body).backgroundColor,
    };
  });
}

async function waitForScheme(scheme: "light" | "dark", canvas: string) {
  await page.waitForFunction(
    ([expectedScheme, expectedCanvas]) => {
      const root = document.documentElement;
      return (
        root.dataset.codebotColorScheme === expectedScheme &&
        getComputedStyle(root).getPropertyValue("--codebot-editor-bg").trim() === expectedCanvas
      );
    },
    [scheme, canvas] as const,
  );
  return state();
}

async function setTheme(change: Parameters<CodeBotDesktopApi["setAppAppearancePreference"]>[0]) {
  await page.evaluate((next) => window.codebot.setAppAppearancePreference(next), change);
}

async function shot(name: string) {
  await page.waitForFunction(
    () =>
      !document
        .getAnimations()
        .some(
          (animation) =>
            animation.effect instanceof KeyframeEffect &&
            (animation.effect.pseudoElement ?? "").startsWith("::view-transition"),
        ),
  );
  await page.screenshot({ path: join(SCREENS, `${name}.png`) });
}

function settingsTitle() {
  return page.getByRole("heading", { level: 1, name: en["app.settingsPage.title"], exact: true });
}

async function openAppearanceSettings() {
  if (!(await settingsTitle().isVisible()))
    await page
      .getByRole("navigation", { name: en["app.rail.label"] })
      .getByRole("button", { name: en["app.rail.settings"], exact: true })
      .click();
  await settingsTitle().waitFor();
  const tab = page.getByRole("tab", { name: en["settings.appearance.title"], exact: true });
  if (await tab.isVisible()) await tab.click();
  await page.getByRole("button", { name: new RegExp(`^${en["settings.appearance.theme.title"]} `) }).waitFor();
}

async function closeSettings() {
  await settingsTitle().focus();
  await page.keyboard.press("Escape");
  await settingsTitle().waitFor({ state: "hidden" });
}

let completed = false;
const original = await page.evaluate(() => window.codebot.getAppAppearancePreference());
try {
  for (const palette of [CODEBOT_DARK_PALETTE, CODEBOT_LIGHT_PALETTE]) {
    const file = join(themes, `${palette.id}.json`);
    record(`themes folder holds ${palette.id}.json`, existsSync(file));
    const parsed = JSON.parse(readFileSync(file, "utf8"));
    record(
      `${palette.id}.json is a valid palette file`,
      parsed.appearance === palette.scheme && parsed.name === palette.name,
    );
    record(
      `${palette.id} is listed in the preference`,
      original.palettes.some((item) => item.id === palette.id),
    );
  }

  for (const palette of [CODEBOT_DARK_PALETTE, CODEBOT_LIGHT_PALETTE]) {
    const data = monacoThemeData(palette);
    const background = palette.colors.canvas;
    record(
      `${palette.id} editor theme uses the ${palette.scheme} base`,
      data.base === (palette.scheme === "dark" ? "vs-dark" : "vs"),
    );
    record(`${palette.id} editor background is the canvas`, data.colors["editor.background"] === background);
    for (const rule of data.rules) {
      if (rule.foreground === undefined) continue;
      const ratio = contrastRatio(`#${rule.foreground}`, background);
      record(`${palette.id} editor token ${rule.token || "default"} is readable`, ratio >= 4.5, ratio.toFixed(2));
    }
    record(`${palette.id} editor text contrast is at least 4.5`, contrastRatio(palette.colors.text, background) >= 4.5);
  }

  await setTheme({ appearance: "dark", palette: null });
  let shown = await waitForScheme("dark", "#1a1a1a");
  record("Dark shows the dark scheme and editor tokens", shown.scheme === "dark" && shown.editorKeyword !== "");
  await shot("chat-dark");

  await setTheme({ appearance: "light", palette: null });
  shown = await waitForScheme("light", CODEBOT_LIGHT_PALETTE.colors.canvas);
  record("Light shows the light scheme and editor tokens", shown.scheme === "light" && shown.canvas === "#f5f5f6");
  record("Light page background is the light canvas", shown.body === "rgb(245, 245, 246)", shown.body);
  await shot("chat-light");
  await openAppearanceSettings();
  await shot("settings-light");
  await closeSettings();

  await setTheme({ appearance: "system", palette: null });
  await page.emulateMedia({ colorScheme: "dark" });
  shown = await waitForScheme("dark", "#1a1a1a");
  record("System follows a dark operating system", shown.scheme === "dark");
  await page.emulateMedia({ colorScheme: "light" });
  shown = await waitForScheme("light", "#f5f5f6");
  record("System follows a light operating system without restart", shown.scheme === "light");
  await page.emulateMedia({ colorScheme: "dark" });
  shown = await waitForScheme("dark", "#1a1a1a");
  record("System follows the change back to dark", shown.scheme === "dark");

  await page.emulateMedia({ colorScheme: null });
  await setTheme({ palette: CODEBOT_LIGHT_PALETTE.id });
  shown = await waitForScheme("light", CODEBOT_LIGHT_PALETTE.colors.canvas);
  record("The light palette file applies the light scheme", shown.scheme === "light");
  await setTheme({ palette: CODEBOT_DARK_PALETTE.id });
  shown = await waitForScheme("dark", CODEBOT_DARK_PALETTE.colors.canvas);
  await shot("chat-dark-palette");
  record("The dark palette file applies the dark scheme", shown.scheme === "dark");

  const temporary = `${customFile}.tmp`;
  writeFileSync(
    temporary,
    `${JSON.stringify({ name: "E2E Custom", appearance: "dark", colors: CUSTOM_COLORS }, null, 2)}\n`,
  );
  renameSync(temporary, customFile);
  await page.waitForFunction(
    async (id) => (await window.codebot.getAppAppearancePreference()).palettes.some((item) => item.id === id),
    CUSTOM_ID,
  );
  record("A palette file that a user adds is listed without restart", true);
  await openAppearanceSettings();
  await page.getByRole("button", { name: new RegExp(`^${en["settings.appearance.theme.title"]} `) }).click();
  await page.getByRole("option", { name: "E2E Custom", exact: true }).click();
  shown = await waitForScheme("dark", CUSTOM_COLORS.canvas);
  record(
    "The custom palette reaches the page and the editor tokens",
    shown.canvas === CUSTOM_COLORS.canvas && shown.editorBackground === CUSTOM_COLORS.canvas,
  );
  record("The custom palette accent is the editor keyword colour", shown.editorKeyword === CUSTOM_COLORS.accent);
  await shot("settings-custom");
  await closeSettings();
  await shot("chat-custom");

  await setTheme({ appearance: "dark", palette: null });
  await waitForScheme("dark", "#1a1a1a");
  await openAppearanceSettings();
  await shot("settings-dark");
  await closeSettings();
  completed = true;
} finally {
  rmSync(customFile, { force: true });
  rmSync(`${customFile}.tmp`, { force: true });
  await page.emulateMedia({ colorScheme: null }).catch(() => undefined);
  const { appearance, transparentWindow, palette } = original;
  await page
    .evaluate((preference) => window.codebot.setAppAppearancePreference(preference), {
      appearance,
      transparentWindow,
      palette,
    })
    .catch(() => undefined);
  const passed = completed && checks.length > 0 && checks.every((check) => check.passed);
  writeFileSync(join(OUT, "report.json"), `${JSON.stringify({ passed, checks }, null, 2)}\n`);
  await session.close();
}
logger.info(`Passed ${checks.length} theme checks. Wrote ${join(OUT, "report.json")}.`);
