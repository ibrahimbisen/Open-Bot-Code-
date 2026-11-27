import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { isDynamicRecord, isString } from "@codebot/contracts/runtime-values";

interface AllowedLine {
  path: string;
  contains: string;
  reason: string;
}

interface Allowlist {
  paths: string[];
  directories: string[];
  lines: AllowedLine[];
}

interface Finding {
  path: string;
  line: number;
  text: string;
  kind: "name" | "server";
}

const UPSTREAM_NAME = ["o", "p", "e", "n", "b", "o", "t"].join("");
const NAME_PATTERN = new RegExp(UPSTREAM_NAME, "i");
const VISIBLE_NAME = new RegExp(
  `${UPSTREAM_NAME.charAt(0).toUpperCase()}${UPSTREAM_NAME.slice(1, 4)}Bot Code(?![A-Za-z0-9])`,
  "g",
);
const SERVER_PATTERN = new RegExp(
  [
    `${UPSTREAM_NAME}\\.(?:run|site)\\b`,
    `nightly-labs/${UPSTREAM_NAME}`,
    `${UPSTREAM_NAME}[a-z0-9-]*\\.[a-z0-9-]+\\.workers\\.dev`,
    `${UPSTREAM_NAME}-a3328`,
  ].join("|"),
  "i",
);
const BINARY_PROBE_BYTES = 8_192;
const TEXT_LIMIT = 240;

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

function readAllowlist(): Allowlist {
  const path = join(projectRoot, "scripts", "codebot", "branding-allowlist.json");
  const parsed = JSON.parse(readFileSync(path, "utf8"));
  if (!isAllowlist(parsed)) throw new Error(`${path} must have "paths", "directories" and "lines".`);
  return parsed;
}

function isAllowlist(value: unknown): value is Allowlist {
  return (
    isDynamicRecord(value) &&
    isStringArray(value.paths) &&
    isStringArray(value.directories) &&
    Array.isArray(value.lines) &&
    value.lines.every(isAllowedLine)
  );
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isString);
}

function isAllowedLine(value: unknown): value is AllowedLine {
  return isDynamicRecord(value) && isString(value.path) && isString(value.contains) && isString(value.reason);
}

function withoutVisibleName(text: string): string {
  return text.replace(VISIBLE_NAME, "");
}

function trackedFiles(): string[] {
  return execFileSync("git", ["ls-files", "-z"], { cwd: projectRoot, encoding: "utf8", maxBuffer: 256 * 1_024 * 1_024 })
    .split("\0")
    .filter((path) => path !== "");
}

function findings(allowlist: Allowlist): Finding[] {
  const found: Finding[] = [];
  for (const path of trackedFiles()) {
    if (allowlist.paths.includes(path)) continue;
    if (allowlist.directories.some((directory) => path.startsWith(directory))) continue;
    if (NAME_PATTERN.test(path)) found.push({ path, line: 0, text: path, kind: "name" });
    let content: Buffer;
    try {
      content = readFileSync(join(projectRoot, path));
    } catch {
      continue;
    }
    if (content.subarray(0, BINARY_PROBE_BYTES).includes(0)) continue;
    const text = content.toString("utf8");
    if (!NAME_PATTERN.test(withoutVisibleName(text))) continue;
    const allowedLines = allowlist.lines.filter((entry) => entry.path === path);
    const lines = text.split("\n");
    for (const [index, line] of lines.entries()) {
      const checked = withoutVisibleName(line);
      if (!NAME_PATTERN.test(checked)) continue;
      if (allowedLines.some((entry) => line.includes(entry.contains))) continue;
      found.push({
        path,
        line: index + 1,
        text: line.trim().slice(0, TEXT_LIMIT),
        kind: SERVER_PATTERN.test(checked) ? "server" : "name",
      });
    }
  }
  return found;
}

function main(): void {
  const args = process.argv.slice(2);
  const unknown = args.filter((arg) => arg !== "--report" && arg !== "--json");
  if (unknown.length > 0) {
    process.stderr.write("Usage: bun scripts/codebot/check-branding.ts [--report] [--json]\n");
    process.exit(2);
  }
  const found = findings(readAllowlist());
  const servers = found.filter((finding) => finding.kind === "server");
  const byPath = new Map<string, number>();
  for (const finding of found) byPath.set(finding.path, (byPath.get(finding.path) ?? 0) + 1);
  const report = {
    passed: found.length === 0,
    findings: found.length,
    serverReferences: servers.length,
    files: byPath.size,
    byPath: [...byPath.entries()].sort((left, right) => right[1] - left[1]),
    lines: found,
  };
  const reportPath = join(projectRoot, ".codebot-build", "check-branding", "report.json");
  mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  if (args.includes("--json")) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else {
    const limit = args.includes("--report") ? found.length : 40;
    for (const finding of found.slice(0, limit)) {
      process.stdout.write(`${finding.path}:${finding.line} [${finding.kind}] ${finding.text}\n`);
    }
    process.stdout.write(
      `${found.length} upstream name references in ${byPath.size} files (${servers.length} name an upstream server). Report: ${reportPath}\n`,
    );
  }
  if (!args.includes("--report") && found.length > 0) process.exit(1);
}

main();
