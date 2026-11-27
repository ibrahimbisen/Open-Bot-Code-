import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createCodeBotLogger } from "@codebot/logging";

const logger = createCodeBotLogger("no-billing-e2e");

/**
 * Proves that the desktop app has no billing, license purchase, credits, hosted-server or hosted-site code:
 * no imports of the removed contract modules, no calls to the removed IPC and tools, no deleted UI files.
 *
 * Named exceptions: the contract files themselves stay until apps/auth-api and apps/mobile are removed
 * (W03 and W18), and packages/team-client and packages/ui billing files are used by those two apps.
 */
const root = dirname(dirname(fileURLToPath(import.meta.url)));

const REMOVED_CONTRACT_MODULES = [
  "billing",
  "billing-details",
  "license",
  "promotion-code",
  "first-touch",
  "custom-server-plans",
  "credits",
  "credit-media",
  "hosted-servers",
  "hosted-sites",
  "referral",
  "ipc-near-wallet",
  "ipc-link-account",
  "ipc-hosted-sites",
];

const DESKTOP_ROOTS = ["src", "scripts"];

// Files that still import a removed module, with the reason and the owner that removes them.
const IMPORT_EXCEPTIONS = new Map<string, string>([["scripts/no-billing-e2e.ts", "this test names the modules"]]);

const BANNED_IDENTIFIERS = [
  "BillingDialog",
  "createBillingStore",
  "ServerPaywall",
  "HostedServerUpsell",
  "LicenseSection",
  "redeemHostedServerClaim",
  "create_server_install_command",
  "ServerInstallChatCard",
  "hosted-server-contact",
  "parseHostedServerName",
  "HOSTED_SERVER_CONTACT_URL",
  "billing_return_viewed",
  "hosted_server_plans_action",
  "license_action",
  "NearWallet",
  "linkAccount",
];

const DELETED_PATHS = [
  "src/renderer/src/features/servers/credit-agents-rail.ts",
  "src/renderer/src/features/servers/credit-prices.ts",
  "src/renderer/src/features/settings/license-analytics.ts",
  "src/renderer/src/features/conversation/ServerInstallChatCard.tsx",
  "packages/ui/src/features/conversation/ServerInstallCard.tsx",
  "scripts/stripe-bootstrap.ts",
  "scripts/stripe-flows-e2e.ts",
  "scripts/hosted-site-limits-e2e.ts",
];

const failures: string[] = [];
const checks: { name: string; passed: boolean; detail: string }[] = [];

function git(...args: string[]): string {
  try {
    return execFileSync("git", args, { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  } catch (error) {
    // git grep exits 1 when nothing matches.
    if (typeof error === "object" && error && "status" in error && error.status === 1) return "";
    throw error;
  }
}

function record(name: string, problems: string[]): void {
  checks.push({ name, passed: problems.length === 0, detail: problems.join("\n") });
  for (const problem of problems) failures.push(`${name}: ${problem}`);
}

function sourceFiles(): string[] {
  return git("ls-files", "--", ...DESKTOP_ROOTS)
    .split("\n")
    .filter((file) => /\.(ts|tsx|css)$/u.test(file) && existsSync(join(root, file)));
}

const files = sourceFiles();

{
  const pattern = new RegExp(`@codebot/contracts/(${REMOVED_CONTRACT_MODULES.join("|")})["']`, "u");
  const problems: string[] = [];
  for (const file of files) {
    if (IMPORT_EXCEPTIONS.has(file)) continue;
    const lines = readFileSync(join(root, file), "utf8").split("\n");
    lines.forEach((line, index) => {
      if (pattern.test(line)) problems.push(`${file}:${index + 1} imports a removed contract module`);
    });
  }
  record("no desktop import of removed contract modules", problems);
}

{
  const problems: string[] = [];
  for (const file of files) {
    if (file === "scripts/no-billing-e2e.ts") continue;
    const text = readFileSync(join(root, file), "utf8");
    for (const word of BANNED_IDENTIFIERS) if (text.includes(word)) problems.push(`${file} contains ${word}`);
  }
  record("no removed identifiers in desktop code", problems);
}

record(
  "deleted files stay deleted",
  DELETED_PATHS.filter((path) => existsSync(join(root, path))).map((path) => `${path} exists`),
);

{
  const problems: string[] = [];
  const preload = files.filter((file) => file.startsWith("src/preload/") || file.startsWith("src/main/ipc/"));
  const channel = /["'`](billing|license|credits|hosted-servers|hosted-sites|near-wallet|link-account|referral)[:.-]/u;
  for (const file of preload) {
    const text = readFileSync(join(root, file), "utf8");
    if (channel.test(text)) problems.push(`${file} names a removed IPC channel`);
  }
  record("no removed IPC channels in main and preload", problems);
}

{
  const problems: string[] = [];
  const stripe = /(checkout\.stripe\.com|billing\.stripe\.com|\/v2\/(billing|hosting|license|credits))/u;
  for (const file of files) {
    if (file === "scripts/no-billing-e2e.ts") continue;
    if (stripe.test(readFileSync(join(root, file), "utf8")))
      problems.push(`${file} calls a payment or hosting endpoint`);
  }
  record("no payment or hosting endpoints", problems);
}

{
  const problems: string[] = [];
  const server = readFileSync(join(root, "src/renderer/src/features/servers/AddServerOverlay.tsx"), "utf8");
  if (/plan|price|checkout/iu.test(server.replace(/planned/giu, "")))
    problems.push("AddServerOverlay mentions a plan or price");
  record("Add server dialog offers no paid option", problems);
}

const reportPath = join(root, ".codebot-build/no-billing-e2e/report.json");
mkdirSync(dirname(reportPath), { recursive: true });
writeFileSync(
  reportPath,
  `${JSON.stringify({ at: new Date().toISOString(), filesScanned: files.length, passed: failures.length === 0, checks }, null, 2)}\n`,
);

for (const check of checks) logger.info(`${check.passed ? "PASS" : "FAIL"} ${check.name}`);
if (failures.length > 0) {
  logger.error(failures.join("\n"));
  process.exit(1);
}
logger.info(`no-billing e2e passed (${files.length} files scanned, report ${reportPath})`);
