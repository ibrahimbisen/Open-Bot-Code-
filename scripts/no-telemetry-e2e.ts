import assert from "node:assert/strict";
import dns from "node:dns";
import fs, { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import fsPromises from "node:fs/promises";
import http from "node:http";
import https from "node:https";
import net from "node:net";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import tls from "node:tls";
import { createCodeBotLogger } from "@codebot/logging";
import { classifyFailure, httpStatusCause, isCauseCode, openPanelTransport, ReportQueue } from "@codebot/telemetry";
import { Effect } from "effect";
import { HostAnalytics } from "../src/main/analytics";
import { buildContentSecurityPolicy } from "../src/main/content-security-policy";
import { desktopAnalytics } from "../src/renderer/src/analytics";
import { reportErrorBanner, reportNotification } from "../src/renderer/src/error-reports";

const ROOT = resolve(import.meta.dirname, "..");
const OUT = join(ROOT, ".codebot-build/no-telemetry-e2e");
const logger = createCodeBotLogger("no-telemetry-e2e");
mkdirSync(OUT, { recursive: true });

interface Check {
  name: string;
  passed: boolean;
  detail?: string;
}
const checks: Check[] = [];
async function check(name: string, run: () => void | Promise<void>): Promise<void> {
  try {
    await run();
    checks.push({ name, passed: true });
  } catch (error) {
    checks.push({ name, passed: false, detail: error instanceof Error ? error.message : String(error) });
  }
}

const observed: string[] = [];
const patched: Array<{ target: object; name: string; original: unknown }> = [];

function spyOn(target: object, label: string, names: string[]): void {
  for (const name of names) {
    const original = Object.getOwnPropertyDescriptor(target, name)?.value;
    if (typeof original !== "function") continue;
    patched.push({ target, name, original });
    const wrapper = function observedCall(this: unknown, ...args: unknown[]) {
      observed.push(`${label}.${name}`);
      return original.apply(this, args);
    };
    Object.defineProperty(target, name, { value: wrapper, configurable: true, writable: true });
  }
}

const FS_WRITES = [
  "writeFile",
  "writeFileSync",
  "appendFile",
  "appendFileSync",
  "createWriteStream",
  "mkdir",
  "mkdirSync",
  "rename",
  "renameSync",
  "copyFile",
  "copyFileSync",
  "open",
  "openSync",
  "rm",
  "rmSync",
  "unlink",
  "unlinkSync",
];
const NETWORK_CALLS = ["request", "get", "connect", "createConnection", "lookup", "resolve"];
const GLOBAL_NETWORK = ["fetch"];

function installSpies(): void {
  spyOn(fs, "fs", FS_WRITES);
  spyOn(fsPromises, "fs/promises", FS_WRITES);
  spyOn(http, "http", NETWORK_CALLS);
  spyOn(https, "https", NETWORK_CALLS);
  spyOn(net, "net", NETWORK_CALLS);
  spyOn(tls, "tls", NETWORK_CALLS);
  spyOn(dns, "dns", NETWORK_CALLS);
  spyOn(globalThis, "global", GLOBAL_NETWORK);
}

function removeSpies(): void {
  for (const { target, name, original } of patched.splice(0)) {
    Object.defineProperty(target, name, { value: original, configurable: true, writable: true });
  }
}

function walk(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (["node_modules", ".git", ".codebot-build", "dist", "out"].includes(entry.name)) continue;
      walk(path, found);
    } else found.push(path);
  }
  return found;
}

const sandbox = mkdtempSync(join(tmpdir(), "codebot-no-telemetry-"));

await check("the observers see a file write (control)", () => {
  installSpies();
  try {
    fs.writeFileSync(join(sandbox, "control.txt"), "x");
    assert.ok(observed.includes("fs.writeFileSync"), "the file write observer does not work");
  } finally {
    removeSpies();
    observed.length = 0;
  }
});

await check("the observers see a network request (control)", async () => {
  installSpies();
  try {
    const refused = await fetch("http://127.0.0.1:1/").then(
      () => false,
      () => true,
    );
    assert.ok(refused, "port 1 should refuse the connection");
    assert.ok(observed.includes("global.fetch"), "the fetch observer does not work");
  } finally {
    removeSpies();
    observed.length = 0;
  }
});

await check("analytics call sites run with no network request and no file write", async () => {
  const filesBefore = walk(sandbox).length;
  installSpies();
  try {
    const anything = JSON.parse("{}");
    const host = new HostAnalytics();
    host.handleAgentEvent(anything);
    host.handleStartup(anything);
    host.handleMainLoopProfile(anything);
    host.handleRemoteConnect(anything);
    host.handleFailure(anything);
    host.handleToolUsage(anything);
    host.handleWorkflowRun(anything);
    host.handleWebhookDelivery(anything);
    host.handleSiteVisit(anything);
    host.checkResources();
    desktopAnalytics.setUser(anything);
    desktopAnalytics.scope().track("onboarding_step", anything);
    desktopAnalytics.anonymousScope().track("onboarding_step", anything);
    reportNotification(anything);
    reportErrorBanner(new Error("boom"), "turn");
    const queue = new ReportQueue();
    openPanelTransport({ clientId: "x", clientSecret: "y" });
    await Effect.runPromise(queue.configure(true, "profile"));
    await Effect.runPromise(queue.scope().record("failure", anything));
    await Effect.runPromise(queue.flush());
    await new Promise((done) => setTimeout(done, 200));
    assert.deepEqual(observed, [], `unexpected calls: ${observed.join(", ")}`);
  } finally {
    removeSpies();
  }
  assert.equal(walk(sandbox).length, filesBefore, "a file appeared in the sandbox");
});

await check("failure classification still works", () => {
  const cause = httpStatusCause(429);
  assert.ok(cause !== undefined && isCauseCode(cause), "HTTP 429 has a cause code");
  assert.equal(classifyFailure({ code: "usageLimitExceeded" }), "usage_limit");
});

await check("no analytics endpoint, preference or consent code is left in desktop sources", () => {
  const roots = ["src", "packages", "remote", "scripts"].map((dir) => join(ROOT, dir));
  const forbidden: Array<[string, RegExp]> = [
    ["OpenPanel client", /openpanel(?!thread)/i],
    ["analytics capture URL", /analyticsCaptureUrl|analytics\.[a-z0-9-]+\.run/],
    ["analytics preference IPC", /analyticsPreference|analytics-preference|\/v1\/me\/analytics/],
    ["analytics install ID in app info", /analyticsInstallId/],
  ];
  const skip = [
    "scripts/no-telemetry-e2e.ts",
    "src/preload/app-decoding.test.ts",
    "packages/i18n/",
    "packages/telemetry/src/index.ts",
    "packages/telemetry/src/inert.ts",
    "scripts/stripe-flows-e2e.ts",
    "scripts/deploy-auth-api.ts",
    "scripts/hosting/",
    "scripts/mobile-ota.ts",
    "scripts/browser-extension-e2e.ts",
    "scripts/development-environment.ts",
    "scripts/mobile-account-e2e.ts",
  ];
  const hits: string[] = [];
  for (const root of roots) {
    for (const file of walk(root)) {
      const rel = relative(ROOT, file).replaceAll("\\", "/");
      if (skip.some((prefix) => rel.startsWith(prefix))) continue;
      if (!/\.(ts|tsx|css|json|js|mjs)$/.test(rel) || statSync(file).size > 2_000_000) continue;
      const text = readFileSync(file, "utf8");
      for (const [label, pattern] of forbidden) if (pattern.test(text)) hits.push(`${rel}: ${label}`);
    }
  }
  assert.deepEqual(hits, []);
});

await check("the inert modules import no I/O module and use no network or storage API", () => {
  const files = [
    "src/main/analytics.ts",
    "src/renderer/src/analytics.ts",
    "src/renderer/src/error-reports.ts",
    "packages/telemetry/src/inert.ts",
  ];
  const io = new RegExp(
    [
      'from "node:(?:fs|http|https|net|tls|dns|child_process|dgram)[^"]*"',
      "fetch\\(",
      "XMLHttpRequest",
      "sendBeacon",
      "WebSocket",
      "indexedDB",
      "localStorage",
    ].join("|"),
  );
  const hits = files.filter((file) => io.test(readFileSync(join(ROOT, file), "utf8")));
  assert.deepEqual(hits, []);
});

await check("the CSP has no analytics origin", () => {
  const policy = buildContentSecurityPolicy(true);
  assert.ok(!/analytics/i.test(policy), policy);
});

rmSync(sandbox, { recursive: true, force: true });
const passed = checks.every((item) => item.passed);
writeFileSync(join(OUT, "report.json"), `${JSON.stringify({ passed, checks }, null, 2)}\n`);
for (const item of checks) {
  logger.info(`${item.passed ? "PASS" : "FAIL"} ${item.name}${item.detail ? ` - ${item.detail}` : ""}`);
}
if (!passed) process.exit(1);
