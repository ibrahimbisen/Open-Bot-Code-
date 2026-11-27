import { mkdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { AGENT_PROVIDER_DESCRIPTORS } from "@codebot/contracts/ipc";
import { claudeLockSandbox } from "../src/backend/lock/claude-lock";
import { containerPath } from "../src/backend/lock/container";
import type { FolderLock } from "../src/backend/lock/folder-lock";
import { type LockFacts, type LockStrategy, lockStrategy } from "../src/backend/lock/lock-strategy";
import { personalFolders, setPersonalFolderSource, strictHiddenFolders } from "../src/backend/lock/personal-folders";
import { bubblewrapArgs, seatbeltReadRules } from "../src/backend/lock/strict-confinement";
import { canConfineProcesses, confineSpawnTarget } from "../src/backend/process-confinement";

const OUT = resolve(import.meta.dirname, "../.codebot-build/folder-lock-confinement-e2e");

interface Check {
  name: string;
  passed: boolean;
  detail: string;
}

const checks: Check[] = [];
const check = (name: string, passed: boolean, detail = ""): void => {
  checks.push({ name, passed, detail });
  process.stdout.write(`${passed ? "PASS" : "FAIL"} ${name}${detail ? `: ${detail}` : ""}\n`);
};

const base: LockFacts = {
  level: "strict",
  enforcement: "confined-process",
  platform: "win32",
  bubblewrap: false,
  seatbelt: false,
  containerTool: false,
  containerPolicy: "auto",
  claudeSandbox: null,
};

const describeStrategy = (strategy: LockStrategy): string =>
  strategy.kind === "refuse" ? `refuse:${strategy.reason}` : strategy.kind;

const matrix: Array<[string, Partial<LockFacts>, string]> = [
  ["claude normal on windows", { enforcement: "tool-sandbox", level: "normal" }, "native"],
  ["claude normal on linux", { enforcement: "tool-sandbox", level: "normal", platform: "linux" }, "native"],
  ["claude strict, sandbox ready", { enforcement: "tool-sandbox", platform: "darwin", claudeSandbox: true }, "native"],
  [
    "claude strict on windows without sandbox",
    { enforcement: "tool-sandbox", claudeSandbox: false },
    "refuse:claude-strict-no-sandbox",
  ],
  [
    "claude strict on linux without sandbox, container found",
    { enforcement: "tool-sandbox", platform: "linux", claudeSandbox: false, containerTool: true },
    "container",
  ],
  [
    "claude strict on macOS without sandbox, container found (auto)",
    { enforcement: "tool-sandbox", platform: "darwin", claudeSandbox: false, containerTool: true },
    "refuse:claude-strict-no-sandbox",
  ],
  ["codex normal on windows", { enforcement: "command-sandbox", level: "normal" }, "native"],
  ["codex strict on windows", { enforcement: "command-sandbox" }, "refuse:codex-strict-needs-container"],
  [
    "codex strict on linux with container",
    { enforcement: "command-sandbox", platform: "linux", containerTool: true },
    "container",
  ],
  ["other provider normal on windows", { level: "normal" }, "refuse:provider-needs-mac-or-linux"],
  ["other provider strict on windows", {}, "refuse:provider-needs-mac-or-linux"],
  ["other provider normal on macOS", { level: "normal", platform: "darwin", seatbelt: true }, "native"],
  ["other provider strict on macOS", { platform: "darwin", seatbelt: true }, "native"],
  [
    "other provider normal on linux with bubblewrap",
    { level: "normal", platform: "linux", bubblewrap: true },
    "native",
  ],
  ["other provider strict on linux with bubblewrap", { platform: "linux", bubblewrap: true }, "native"],
  [
    "other provider normal on linux without bubblewrap",
    { level: "normal", platform: "linux" },
    "refuse:provider-tool-missing-bubblewrap",
  ],
  [
    "other provider strict on linux without bubblewrap, container found",
    { platform: "linux", containerTool: true },
    "container",
  ],
  [
    "server policy: strict uses the container",
    { platform: "linux", bubblewrap: true, containerPolicy: "always", containerTool: true },
    "container",
  ],
  [
    "server policy: no container tool",
    { platform: "linux", bubblewrap: true, containerPolicy: "always" },
    "refuse:container-missing",
  ],
  [
    "server policy: normal stays native",
    { level: "normal", platform: "linux", bubblewrap: true, containerPolicy: "always", containerTool: true },
    "native",
  ],
  [
    "policy never ignores the container",
    { platform: "linux", containerPolicy: "never", containerTool: true },
    "refuse:provider-tool-missing-bubblewrap",
  ],
];

for (const [name, facts, expected] of matrix) {
  const got = describeStrategy(lockStrategy({ ...base, ...facts }));
  check(`strategy: ${name}`, got === expected, `${got} (expected ${expected})`);
}

const kinds = new Set(AGENT_PROVIDER_DESCRIPTORS.map((descriptor) => descriptor.workspaceEnforcement));
check("every provider kind has a strategy row", kinds.size === 3, [...kinds].join(","));

const home = process.platform === "win32" ? "C:\\Users\\tester" : "/home/tester";
setPersonalFolderSource(null);
const windowsHidden = strictHiddenFolders("win32", { SystemDrive: "C:" }, "C:\\Users\\tester");
check(
  "strict hides the whole Users folder on Windows",
  windowsHidden.some((folder) => /^C:\\Users$/iu.test(folder)),
  windowsHidden.join(" "),
);
const macHidden = strictHiddenFolders("darwin", {}, "/Users/tester");
check(
  "strict hides /Users and /Volumes on macOS",
  macHidden.includes("/Users") && macHidden.includes("/Volumes"),
  macHidden.join(" "),
);
const linuxHidden = strictHiddenFolders("linux", {}, "/home/tester");
check(
  "strict hides /home and mounts on Linux",
  linuxHidden.includes("/home") && linuxHidden.includes("/mnt"),
  linuxHidden.join(" "),
);
const macPersonal = personalFolders("darwin", {}, "/Users/tester");
check(
  "normal hides Documents and iCloud on macOS",
  macPersonal.length === 0 || macPersonal.some((folder) => folder.includes("Documents")),
  "personal folders must lie outside the home folder (home is excluded by design)",
);

const lock: FolderLock = {
  level: "strict",
  projectId: "p1",
  allowedFolders: [join(homedir(), "work", "project")],
  excludedFolders: [],
  readOnlyFolders: [],
};
const claudeStrictMac = claudeLockSandbox(
  lock,
  { configDirectory: "/Users/tester/.claude", engineFolder: "/Users/tester/.local/bin", skillFolders: [] },
  "darwin",
  "/Users/tester",
);
check(
  "claude strict on macOS: sandbox denies the Users folder and allows the project",
  Boolean(claudeStrictMac.filesystem?.denyRead?.includes("/Users")) &&
    Boolean(claudeStrictMac.filesystem?.allowRead?.includes(lock.allowedFolders[0] ?? "")),
  JSON.stringify(claudeStrictMac.filesystem),
);
const claudeNormalLinux = claudeLockSandbox(
  { ...lock, level: "normal" },
  { configDirectory: "/home/tester/.claude", engineFolder: null, skillFolders: [] },
  "linux",
  "/home/tester",
);
check(
  "claude normal on Linux: sandbox hides no whole home area",
  !claudeNormalLinux.filesystem?.denyRead?.includes("/home"),
  JSON.stringify(claudeNormalLinux.filesystem?.denyRead ?? []),
);

const rules = seatbeltReadRules(
  ["/Users", "/Volumes"],
  ["/Users/tester/work/project", "/Users/tester/.local/bin"],
  (value) => JSON.stringify(value),
  (path) => [path],
);
check(
  "macOS profile: deny read of Users, then allow the project and the tools",
  rules.length === 2 &&
    rules[0]?.startsWith('(deny file-read* (subpath "/Users")') === true &&
    rules[1]?.includes('(subpath "/Users/tester/work/project")') === true,
  rules.join(" | "),
);

const present = new Set([
  "/usr",
  "/bin",
  "/lib",
  "/lib64",
  "/etc",
  "/work/project",
  "/work/extra",
  "/home/tester/.cursor",
  "/home/tester/.local/bin",
  "/tmp",
  "/work/project/.claude",
]);
const exists = (path: string) => present.has(path.replaceAll("\\", "/").replace(/^[A-Za-z]:/u, ""));
const wrapStrict = bubblewrapArgs({
  program: "/usr/bin/bwrap",
  command: "/home/tester/.local/bin/agent",
  args: ["acp"],
  writable: ["/work/project", "/work/extra", "/home/tester/.cursor", "/tmp"],
  protectedPaths: ["/work/project/.claude"],
  readable: ["/home/tester/.local/bin"],
  strict: true,
  home: "/home/tester",
  exists,
}).map((part) => part.replaceAll("\\", "/").replace(/^[A-Za-z]:/u, ""));
const joined = wrapStrict.join(" ");
check(
  "linux strict: bubblewrap binds the system read-only and not the whole root",
  joined.includes("--ro-bind /usr /usr") && !joined.includes("--ro-bind / /"),
  joined,
);
check(
  "linux strict: home is a tmpfs with only the project binds inside",
  joined.includes("--tmpfs /home/tester") && joined.includes("--bind /work/project /work/project"),
  joined,
);
check(
  "linux strict: the project settings folder is read-only",
  joined.includes("--ro-bind /work/project/.claude /work/project/.claude"),
  joined,
);
check("linux strict: no bind of the Documents folder", !/Documents|\/mnt|\/media/u.test(joined), joined);
const wrapNormal = bubblewrapArgs({
  program: "/usr/bin/bwrap",
  command: "/usr/bin/agent",
  args: [],
  writable: ["/work/project", "/tmp"],
  protectedPaths: [],
  readable: [],
  strict: false,
  home: "/home/tester",
  exists,
}).map((part) => part.replaceAll("\\", "/").replace(/^[A-Za-z]:/u, ""));
check(
  "linux normal: the root is read-only and only the project folders are writable",
  wrapNormal.join(" ").includes("--ro-bind / /") && wrapNormal.join(" ").includes("--bind /work/project /work/project"),
  wrapNormal.join(" "),
);

check(
  "container path of a Windows folder",
  containerPath("C:\\Users\\a\\proj", "win32") === "/codebot/c/Users/a/proj",
  containerPath("C:\\Users\\a\\proj", "win32"),
);
check("container path on POSIX is the same folder", containerPath("/srv/p", "linux") === "/srv/p");

if (process.platform === "win32") {
  let refused = "";
  try {
    confineSpawnTarget(
      { command: "agent.exe", args: [], windowsVerbatimArguments: false },
      { writableRoots: ["C:\\p"], lockLevel: "strict" },
      { writable: [], protected: [] },
    );
  } catch (error) {
    refused = error instanceof Error ? error.message : String(error);
  }
  check(
    "windows: a confined provider is refused, not started without a lock",
    refused !== "" && !canConfineProcesses(),
    refused,
  );
}

mkdirSync(OUT, { recursive: true });
const passed = checks.every((entry) => entry.passed);
writeFileSync(
  join(OUT, "report.json"),
  `${JSON.stringify({ passed, platform: process.platform, checks, home }, null, 2)}\n`,
);
process.stdout.write(`${passed ? "PASSED" : "FAILED"}: ${OUT}/report.json\n`);
process.exit(passed ? 0 : 1);
