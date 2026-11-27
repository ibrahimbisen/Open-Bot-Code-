import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { join, resolve } from "node:path";
import type { AppThemePalette } from "@codebot/contracts/app-appearance";
import {
  BUILT_IN_THEME_PALETTES,
  CODEBOT_DARK_PALETTE,
  CODEBOT_HIGH_CONTRAST_PALETTE,
  CODEBOT_LIGHT_PALETTE,
} from "@codebot/contracts/app-theme-defaults";
import type { CodeBotDesktopApi } from "@codebot/contracts/ipc";
import { en } from "@codebot/i18n";
import { createCodeBotLogger } from "@codebot/logging";
import type { Page } from "playwright-core";
import { contrastRatio, monacoThemeData } from "../src/renderer/src/editor-theme";
import { assertMutationAllowed, connectToDevApp } from "./dev-automation/cdp-client";
import { readDevInstanceRecords } from "./dev-automation/instance-registry";
import { resolveDevelopmentAppDataRoot } from "./development-state-paths";
import { STAND_IN_REPLY } from "./themes-stand-in";

declare global {
  interface Window {
    codebot: CodeBotDesktopApi;
  }
}

const OUT = resolve(import.meta.dirname, "../.codebot-build/themes");
const SCREENS = join(OUT, "screens");
const WORKSPACE = join(OUT, "workspace");
const PROJECT = "Theme demo";
const PROMPT = "Add a total helper";
const WAIT_MS = 60_000;
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
const SERVER_SOURCE = `import { createServer } from "node:http";

interface Route {
  path: string;
  handler: (request: Request) => Response;
}

const routes: Route[] = [
  { path: "/health", handler: () => new Response("ok") },
  { path: "/count", handler: () => Response.json({ count: 42, ratio: 0.5 }) },
];

// Start the server on the first free port.
export function start(port = 3000): void {
  const pattern = /^\\/api\\/(\\w+)$/;
  createServer((req, res) => {
    const match = pattern.exec(req.url ?? "");
    res.end(match ? \`route \${match[1]}\` : "not found");
  }).listen(port);
  console.log(\`listening on \${port}\`, routes.length);
}
`;

interface Check {
  name: string;
  passed: boolean;
  detail?: string;
}

interface TextSample {
  text: string;
  ratio: number;
  large: boolean;
  color: string;
  background: string;
}

interface PartAudit {
  found: boolean;
  background: number[];
  luminance: number;
  texts: number;
  samples: TextSample[];
}

const checks: Check[] = [];
const screenshots: string[] = [];
const measured: Record<string, Record<string, { background: string; minContrast: number; texts: number }>> = {};

function record(name: string, condition: boolean, detail?: string) {
  checks.push({ name, passed: condition, ...(detail === undefined ? {} : { detail }) });
  if (!condition) process.stdout.write(`FAIL ${name}${detail === undefined ? "" : `: ${detail}`}\n`);
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

rmSync(SCREENS, { recursive: true, force: true });
mkdirSync(SCREENS, { recursive: true });
mkdirSync(join(WORKSPACE, "src"), { recursive: true });
writeFileSync(join(WORKSPACE, "src", "server.ts"), SERVER_SOURCE);
writeFileSync(join(WORKSPACE, "README.md"), "# Theme demo\n\nA small project for the theme test.\n");

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

async function settle() {
  await page.waitForFunction(
    () =>
      !document
        .getAnimations()
        .some(
          (animation) =>
            animation.playState === "running" &&
            animation.timeline instanceof DocumentTimeline &&
            animation.effect instanceof KeyframeEffect &&
            ((animation.effect.pseudoElement ?? "").startsWith("::view-transition") ||
              animation.effect.getComputedTiming().iterations !== Number.POSITIVE_INFINITY),
        ),
    undefined,
    { timeout: WAIT_MS },
  );
}

async function applyPalette(palette: AppThemePalette) {
  await setTheme({ appearance: palette.scheme, palette: palette.id });
  await waitForScheme(palette.scheme, palette.colors.canvas);
  await page.waitForFunction(
    (canvas) => {
      const editor = document.querySelector(".monaco-editor .monaco-editor-background");
      if (!editor) return true;
      const probe = document.createElement("div");
      probe.style.backgroundColor = canvas;
      document.body.append(probe);
      const expected = getComputedStyle(probe).backgroundColor;
      probe.remove();
      return getComputedStyle(editor).backgroundColor === expected;
    },
    palette.colors.canvas,
    { timeout: WAIT_MS },
  );
  await settle();
}

async function shot(name: string) {
  await settle();
  const path = join(SCREENS, `${name}.png`);
  await page.screenshot({ path });
  screenshots.push(path);
}

function audit(selector: string): Promise<PartAudit> {
  return page.evaluate((target) => {
    const parse = (value: string): number[] => {
      const numbers = (value.match(/-?[\d.]+(e-?\d+)?%?/g) ?? []).map((part) =>
        part.endsWith("%") ? Number.parseFloat(part) / 100 : Number.parseFloat(part),
      );
      if (value.startsWith("color(srgb")) {
        const [r = 0, g = 0, b = 0, a = 1] = numbers;
        return [r * 255, g * 255, b * 255, a];
      }
      const [r = 0, g = 0, b = 0, a = 1] = numbers;
      return [r, g, b, a];
    };
    const over = (top: number[], base: number[]): number[] => {
      const alpha = top[3] ?? 1;
      return [0, 1, 2].map((index) => (top[index] ?? 0) * alpha + (base[index] ?? 0) * (1 - alpha)).concat(1);
    };
    const channel = (value: number) => {
      const scaled = value / 255;
      return scaled <= 0.03928 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4;
    };
    const luminance = (color: number[]) =>
      0.2126 * channel(color[0] ?? 0) + 0.7152 * channel(color[1] ?? 0) + 0.0722 * channel(color[2] ?? 0);
    const ratio = (first: number[], second: number[]) => {
      const [light = 0, dark = 0] = [luminance(first), luminance(second)].sort((a, b) => b - a);
      return (light + 0.05) / (dark + 0.05);
    };
    const pageBase = parse(getComputedStyle(document.body).backgroundColor);
    const background = (element: Element): number[] => {
      const layers: number[][] = [];
      for (let node: Element | null = element; node; node = node.parentElement) {
        const color = parse(getComputedStyle(node).backgroundColor);
        if ((color[3] ?? 0) > 0) layers.push(color);
        if ((color[3] ?? 0) >= 0.999) break;
      }
      let result = (pageBase[3] ?? 0) >= 0.999 ? pageBase : [0, 0, 0, 1];
      for (const layer of layers.reverse()) result = over(layer, result);
      return result;
    };
    const opacity = (element: Element) => {
      let value = 1;
      for (let node: Element | null = element; node; node = node.parentElement)
        value *= Number.parseFloat(getComputedStyle(node).opacity);
      return value;
    };
    const hex = (color: number[]) =>
      `#${color
        .slice(0, 3)
        .map((part) => Math.round(part).toString(16).padStart(2, "0"))
        .join("")}`;
    const roots = [...document.querySelectorAll(target)].filter((element) => element.getClientRects().length > 0);
    const root = roots[0];
    if (!root) return { found: false, background: [], luminance: 0, texts: 0, samples: [] };
    const rootBackground = background(root);
    const samples: TextSample[] = [];
    const seen = new Set<Element>();
    const candidates: [Element, string][] = [];
    for (const element of roots) {
      const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const text = (node.textContent ?? "").trim();
        if (text && node.parentElement) candidates.push([node.parentElement, text]);
      }
      for (const field of element.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("input, textarea"))
        if (field.value.trim() && !field.closest(".monaco-editor")) candidates.push([field, field.value.trim()]);
    }
    for (const [parent, text] of candidates) {
      {
        if (seen.has(parent)) continue;
        seen.add(parent);
        const style = getComputedStyle(parent);
        if (style.visibility !== "visible" || parent.getClientRects().length === 0) continue;
        const box = parent.getBoundingClientRect();
        if (box.width < 1 || box.height < 1 || box.bottom < 0 || box.top > innerHeight) continue;
        if (parent.closest("[aria-disabled=true], :disabled, [inert], .sr-only")) continue;
        if (parent.closest("[aria-hidden=true]") && !parent.closest(".monaco-editor")) continue;
        if (parent.closest(".minimap, .decorationsOverviewRuler")) continue;
        const fade = opacity(parent);
        if (fade < 0.05) continue;
        const under = background(parent);
        const color = parse(style.color);
        const shown = over([...color.slice(0, 3), (color[3] ?? 1) * fade], under);
        const size = Number.parseFloat(style.fontSize);
        const weight = Number.parseInt(style.fontWeight, 10);
        samples.push({
          text: text.slice(0, 40),
          ratio: ratio(shown, under),
          large: size >= 24 || (size >= 18.66 && weight >= 700),
          color: hex(shown),
          background: hex(under),
        });
      }
    }
    return {
      found: true,
      background: rootBackground,
      luminance: luminance(rootBackground),
      texts: samples.length,
      samples,
    };
  }, selector);
}

function minimum(palette: AppThemePalette, sample: TextSample): 3 | 4.5 | 7 {
  if (palette.id === CODEBOT_HIGH_CONTRAST_PALETTE.id) return sample.large ? 4.5 : 7;
  return sample.large ? 3 : 4.5;
}

const NEW_PALETTE_IDS = new Set(
  BUILT_IN_THEME_PALETTES.filter(
    (item) => item.id !== CODEBOT_DARK_PALETTE.id && item.id !== CODEBOT_LIGHT_PALETTE.id,
  ).map((item) => item.id),
);

async function checkParts(view: string, palette: AppThemePalette, parts: Record<string, string>) {
  for (const [part, selector] of Object.entries(parts)) {
    const result = await audit(selector);
    const label = `${palette.id} ${view}: ${part}`;
    record(`${label} is shown`, result.found, selector);
    if (!result.found) continue;
    const dark = palette.scheme === "dark";
    record(
      `${label} background follows the ${palette.scheme} theme`,
      dark ? result.luminance < 0.2 : result.luminance > 0.55,
      `luminance ${result.luminance.toFixed(3)}`,
    );
    const failing = result.samples.filter((sample) => sample.ratio < minimum(palette, sample));
    const worst = [...result.samples].sort((a, b) => a.ratio - b.ratio)[0];
    const strict = NEW_PALETTE_IDS.has(palette.id);
    record(
      `${label} text is readable${strict ? "" : " (report only)"}`,
      !strict || failing.length === 0,
      failing.length === 0
        ? `${result.texts} texts, lowest ${worst?.ratio.toFixed(2) ?? "-"}`
        : failing
            .slice(0, 4)
            .map((item) => `"${item.text}" ${item.color} on ${item.background} = ${item.ratio.toFixed(2)}`)
            .join("; "),
    );
    measured[palette.id] ??= {};
    const entry = measured[palette.id];
    if (entry)
      entry[`${view}: ${part}`] = {
        background: `rgb(${result.background
          .slice(0, 3)
          .map((value) => Math.round(value))
          .join(", ")})`,
        minContrast: Number((worst?.ratio ?? 0).toFixed(2)),
        texts: result.texts,
      };
  }
}

async function eachTheme(
  view: string,
  parts: Record<string, string>,
  extra?: (palette: AppThemePalette) => Promise<void>,
) {
  for (const palette of BUILT_IN_THEME_PALETTES) {
    await applyPalette(palette);
    await checkParts(view, palette, parts);
    if (extra) await extra(palette);
    await shot(`${view}-${palette.id}`);
  }
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

async function dismissToasts() {
  await page.evaluate(() => {
    for (const button of document.querySelectorAll<HTMLElement>(".ui-toaster li button[aria-label]")) button.click();
  });
  await page
    .locator(".ui-toaster li")
    .first()
    .waitFor({ state: "detached", timeout: 5_000 })
    .catch(() => undefined);
}

const projectList = () => page.getByRole("navigation", { name: en["project.list.label"] });
const projectButton = () => projectList().getByRole("button", { name: `Open the project ${PROJECT}`, exact: true });
const column = () => page.locator("#project-column");

async function ensureProject() {
  const exists = await page.evaluate(
    async ({ name }) => (await window.codebot.projects.list()).some((project) => project.name === name),
    { name: PROJECT },
  );
  if (!exists) {
    await page.evaluate((input) => window.codebot.projects.create(input), {
      name: PROJECT,
      mainFolder: WORKSPACE,
      accessLevel: "open" as const,
      agents: [{ name: "Dev", role: "Developer" }],
    });
    await page.reload();
  }
  await projectList().waitFor({ state: "visible", timeout: WAIT_MS });
  await dismissToasts();
  await projectButton().click();
  await column().waitFor({ state: "visible", timeout: WAIT_MS });
  const tabs = page.locator(".project-dock-view .dv-tab");
  for (let count = await tabs.count(); count > 1; count = await tabs.count()) {
    await page.getByRole("button", { name: en["panel.close"], exact: true }).first().click();
    await page.waitForFunction(([selector, before]) => document.querySelectorAll(selector).length < before, [
      ".project-dock-view .dv-tab",
      count,
    ] as const);
  }
}

async function sendCodePrompt() {
  const editor = page.locator(".project-chat-panel:visible").first().getByRole("textbox").first();
  await editor.click();
  await page.keyboard.type(PROMPT);
  await page.keyboard.press("Enter");
  await page.locator(".message-code-block").first().waitFor({ state: "visible", timeout: WAIT_MS });
}

const server = createServer((_request, response) => {
  response.setHeader("content-type", "text/html");
  response.end(
    "<!doctype html><title>Theme page</title><h1>Theme test page</h1><p>The browser frame follows the theme.</p>",
  );
});
await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
const address = server.address();
assert.ok(address && typeof address === "object");
const pageUrl = `http://127.0.0.1:${address.port}/`;

let completed = false;
let failure: string | undefined;
const original = await page.evaluate(() => window.codebot.getAppAppearancePreference());
const viewport = await page.context().newCDPSession(page);
try {
  for (const palette of BUILT_IN_THEME_PALETTES) {
    const file = join(themes, `${palette.id}.json`);
    record(`themes folder holds ${palette.id}.json`, existsSync(file));
    if (!existsSync(file)) continue;
    const parsed = JSON.parse(readFileSync(file, "utf8"));
    record(`${palette.id}.json is a valid palette file`, parsed.appearance === palette.scheme, parsed.name);
    record(
      `${palette.id} is listed in the preference`,
      original.palettes.some((item) => item.id === palette.id),
    );
  }
  record(
    "Visible theme names use the product name",
    BUILT_IN_THEME_PALETTES.every((palette) => palette.name.startsWith("OpenBot Code ")),
  );

  for (const palette of BUILT_IN_THEME_PALETTES) {
    const data = monacoThemeData(palette);
    const background = palette.colors.canvas;
    const body = palette.id === CODEBOT_HIGH_CONTRAST_PALETTE.id ? 7 : 4.5;
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
    if (!NEW_PALETTE_IDS.has(palette.id)) continue;
    for (const surface of ["canvas", "frame", "sidebar", "surface"] as const) {
      const text = contrastRatio(palette.colors.text, palette.colors[surface]);
      const muted = contrastRatio(palette.colors.textMuted, palette.colors[surface]);
      record(`${palette.id} text on ${surface} is at least ${body}`, text >= body, text.toFixed(2));
      record(`${palette.id} muted text on ${surface} is at least ${body}`, muted >= body, muted.toFixed(2));
      for (const role of ["accent", "success", "warning", "danger"] as const) {
        const value = contrastRatio(palette.colors[role], palette.colors[surface]);
        record(`${palette.id} ${role} on ${surface} is at least 4.5`, value >= 4.5, value.toFixed(2));
      }
    }
    const onAccent = contrastRatio(palette.colors.accentForeground, palette.colors.accent);
    record(`${palette.id} text on accent is at least ${body}`, onAccent >= body, onAccent.toFixed(2));
  }

  await setTheme({ appearance: "system", palette: null });
  await page.emulateMedia({ colorScheme: "dark" });
  let shown = await waitForScheme("dark", "#1a1a1a");
  record("System follows a dark operating system", shown.scheme === "dark");
  await page.emulateMedia({ colorScheme: "light" });
  shown = await waitForScheme("light", "#f5f5f6");
  record("System follows a light operating system without restart", shown.scheme === "light");
  await page.emulateMedia({ colorScheme: "dark" });
  shown = await waitForScheme("dark", "#1a1a1a");
  record("System follows the change back to dark", shown.scheme === "dark");
  await page.emulateMedia({ colorScheme: null });

  await viewport.send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 900,
    deviceScaleFactor: 0,
    mobile: false,
  });
  await ensureProject();

  await column().getByRole("button", { name: en["project.chat.new"], exact: true }).click();
  await page.locator(".project-chat-panel:visible").first().waitFor({ state: "visible", timeout: WAIT_MS });
  await eachTheme("main", {
    "left bar": "nav[aria-label='Pages']",
    "project list": "aside:has(nav[aria-label='Project list'])",
    "chat list": "#project-column",
    "chat panel": ".project-chat-panel",
  });

  await sendCodePrompt();
  const reply = page.locator(".message-entry-agent").last();
  record(
    "The chat shows the reply with a code block",
    (await reply.innerText()).includes(STAND_IN_REPLY.split("\n")[4] ?? "-"),
  );
  await eachTheme("chat", {
    "chat reply": ".message-entry-agent .ui-bubble-content",
    "code block": ".message-code-block",
    "chat tabs": ".dv-tabs-and-actions-container",
  });

  const sourceFile = page.getByRole("treeitem", { name: "server.ts" });
  if (!(await sourceFile.isVisible())) await page.getByRole("treeitem", { name: "src" }).click();
  await sourceFile.click();
  await page.locator(".monaco-editor .view-lines").first().waitFor({ state: "visible", timeout: WAIT_MS });
  await page.locator(".monaco-editor .view-line").filter({ hasText: "createServer" }).first().waitFor();
  await eachTheme(
    "editor",
    {
      "file tree": "[role=tree][aria-label='File tree']",
      "project tools": "[role=tablist][aria-label='Project tools']",
      "monaco editor": ".monaco-editor .view-lines",
      "monaco line numbers": ".monaco-editor .margin",
    },
    async (palette) => {
      const editorBackground = await page.evaluate(() => {
        const element = document.querySelector(".monaco-editor .monaco-editor-background");
        return element ? getComputedStyle(element).backgroundColor : "";
      });
      const expected = palette.colors.canvas;
      const rgb = `rgb(${[1, 3, 5].map((index) => Number.parseInt(expected.slice(index, index + 2), 16)).join(", ")})`;
      record(`${palette.id} Monaco background is the palette canvas`, editorBackground === rgb, editorBackground);
      const keyword = monacoThemeData(palette).rules.find((rule) => rule.token === "keyword")?.foreground ?? "";
      const keywordRgb = `rgb(${[0, 2, 4].map((index) => Number.parseInt(keyword.slice(index, index + 2), 16)).join(", ")})`;
      const keywordShown = await page
        .waitForFunction(
          (wanted) => {
            const span = [...document.querySelectorAll(".monaco-editor .view-line span span")].find(
              (element) => element.textContent === "import",
            );
            const color = span ? getComputedStyle(span).color : "";
            return color === wanted ? color : false;
          },
          keywordRgb,
          { timeout: 10_000 },
        )
        .then(async (handle) => String(await handle.jsonValue()))
        .catch(() => "");
      record(`${palette.id} Monaco keyword uses the theme colour`, keywordShown === keywordRgb, keywordShown);
    },
  );

  await page.getByRole("button", { name: en["panel.add"], exact: true }).first().click();
  await page.getByRole("menuitem", { name: "Browser", exact: true }).click();
  const browserAddress = page.getByRole("textbox", { name: en["browser.address.label"] }).last();
  await browserAddress.waitFor({ state: "visible", timeout: WAIT_MS });
  await browserAddress.fill(pageUrl);
  await browserAddress.press("Enter");
  await page.waitForFunction(
    async (url) => (await window.codebot.browser.listTabs()).some((tab) => tab.url === url),
    pageUrl,
    { timeout: WAIT_MS },
  );
  await page.getByRole("button", { name: en["panel.add"], exact: true }).first().click();
  await page.getByRole("menu").first().waitFor({ state: "visible" });
  await eachTheme("dock", {
    "dock panel": ".dv-groupview, .dv-tabs-and-actions-container",
    "browser frame": ".project-browser-panel",
    "panel menu": "[role=menu]",
  });
  await page.keyboard.press("Escape");

  await openAppearanceSettings();
  await eachTheme("settings", {
    "settings content": ".settings-page-content",
    "settings navigation": ".settings-page-nav",
  });
  await closeSettings();

  await projectList().waitFor();
  await page.getByRole("button", { name: en["project.new"], exact: true }).first().click();
  await page.getByRole("dialog").first().waitFor({ state: "visible", timeout: WAIT_MS });
  await eachTheme("dialog", { dialog: "[role=dialog]" });
  await page.keyboard.press("Escape");
  await page.getByRole("dialog").first().waitFor({ state: "hidden", timeout: WAIT_MS });

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
  completed = true;
} catch (error) {
  failure = error instanceof Error ? (error.stack ?? error.message) : String(error);
} finally {
  rmSync(customFile, { force: true });
  rmSync(`${customFile}.tmp`, { force: true });
  await viewport.send("Emulation.clearDeviceMetricsOverride").catch(() => undefined);
  await page.emulateMedia({ colorScheme: null }).catch(() => undefined);
  const { appearance, transparentWindow, palette } = original;
  await page
    .evaluate((preference) => window.codebot.setAppAppearancePreference(preference), {
      appearance,
      transparentWindow,
      palette,
    })
    .catch(() => undefined);
  await page
    .evaluate(async () => {
      for (const tab of await window.codebot.browser.listTabs()) await window.codebot.browser.close(tab.id);
    })
    .catch(() => undefined);
  server.close();
  const passed = completed && checks.length > 0 && checks.every((check) => check.passed);
  writeFileSync(
    join(OUT, "report.json"),
    `${JSON.stringify({ passed, failure, checks, measured, screenshots }, null, 2)}\n`,
  );
  await session.close();
}
const failed = checks.filter((check) => !check.passed).length;
if (failure !== undefined || failed > 0) {
  logger.error(`Theme test failed: ${failed} checks. ${failure ?? ""} Report: ${join(OUT, "report.json")}.`);
  process.exit(1);
}
logger.info(`Passed ${checks.length} theme checks. Wrote ${join(OUT, "report.json")}.`);
