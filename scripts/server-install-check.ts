import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { parse } from "yaml";

const ROOT = resolve(import.meta.dirname, "..");
const OUT = resolve(ROOT, ".codebot-build/server-install");
const HOSTING = join(ROOT, "scripts/hosting");
const hostingFiles = (): string[] =>
  readdirSync(HOSTING, { withFileTypes: true })
    .filter((entry) => entry.isFile() && !entry.name.endsWith(".ts"))
    .map((entry) => join(HOSTING, entry.name));

interface Check {
  name: string;
  passed: boolean;
  detail?: string;
}

const report: { passed: boolean; checks: Check[]; notRun: string[] } = {
  passed: false,
  checks: [],
  notRun: [
    "docker build and docker run: this computer has no Docker. The check reads docker/Dockerfile and docker/compose.yaml and tests each path that they name.",
    "The Linux AppImage build: electron-builder needs a Linux host for the AppImage target. The check reads electron-builder.yml.",
    "A start of the engine on Linux with CODEBOT_SERVER=1: needs the packaged AppImage on a Linux computer with systemd.",
    "The install script run as root with apt and systemd: only its syntax (bash -n) and its text are tested.",
  ],
};

function check(name: string, run: () => void): void {
  try {
    run();
    report.checks.push({ name, passed: true });
  } catch (error) {
    report.checks.push({ name, passed: false, detail: error instanceof Error ? error.message : String(error) });
  }
}

function read(path: string): string {
  return readFileSync(join(ROOT, path), "utf8");
}

const dockerfile = read("docker/Dockerfile");
const compose = parse(read("docker/compose.yaml"));
const installScript = read("scripts/install-server.sh");
const builder = parse(read("electron-builder.yml"));

check("The Dockerfile names only files that the hosting folder ships", () => {
  const referenced = [...dockerfile.matchAll(/resources\/hosting\/([A-Za-z0-9._-]+)/gu)].map((match) => match[1]);
  assert.ok(referenced.length >= 4, "The Dockerfile names no hosting file.");
  for (const name of new Set(referenced)) assert.ok(existsSync(join(HOSTING, name ?? "")), `Missing ${name}.`);
});

check("The hosting folder is copied into the Linux build as resources/hosting", () => {
  const extra = builder?.linux?.extraResources;
  assert.ok(Array.isArray(extra));
  const hosting = extra.find((entry: { from?: string }) => entry.from === "scripts/hosting");
  assert.equal(hosting?.to, "hosting");
  assert.ok(existsSync(join(ROOT, "build/linux/codebot.apparmor")), "build/linux/codebot.apparmor is missing.");
});

check("The Linux target is an AppImage for x64 and arm64, named as the install script expects", () => {
  const targets = builder?.linux?.target;
  assert.ok(Array.isArray(targets));
  const appImage = targets.find((entry: { target?: string }) => entry.target === "AppImage");
  assert.deepEqual(appImage?.arch, ["x64", "arm64"]);
  assert.equal(builder.artifactName, `\${productName}-\${version}-\${arch}.\${ext}`);
  assert.equal(builder.productName, "CodeBot");
  assert.match(installScript, /CodeBot-\$version-\$architecture\.AppImage/u);
  assert.match(installScript, /latest-linux\.yml/u);
  assert.match(installScript, /latest-linux-arm64\.yml/u);
});

check("The Dockerfile starts the container script as user codebot with tini and keeps its data in /data", () => {
  assert.match(
    dockerfile,
    /ENTRYPOINT \["\/usr\/bin\/tini", "--", "\/opt\/CodeBot\/app\/resources\/hosting\/codebot-container"\]/u,
  );
  assert.match(dockerfile, /useradd --uid 1000/u);
  assert.match(dockerfile, /USER codebot/u);
  assert.match(dockerfile, /VOLUME \/data/u);
  assert.match(dockerfile, /^ARG BASE=ubuntu:24\.04@sha256:[0-9a-f]{64}$/mu);
});

check("The Compose file has one service with a volume, the seccomp profile and no upstream image", () => {
  const service = compose?.services?.codebot;
  assert.ok(service, "No codebot service.");
  assert.equal(service.image, "codebot:latest");
  assert.ok(service.volumes.includes("codebot-data:/data"));
  assert.ok(service.security_opt.includes("no-new-privileges:true"));
  const seccomp = service.security_opt.find((entry: string) => entry.startsWith("seccomp="));
  assert.ok(seccomp, "No seccomp option.");
  const file = join(ROOT, "docker", seccomp.slice("seccomp=".length));
  assert.ok(existsSync(file), "The seccomp file is missing.");
  assert.ok(JSON.parse(readFileSync(file, "utf8")).syscalls.length > 0);
});

check("The engine starts in server mode only for a packaged Linux build with CODEBOT_SERVER=1", () => {
  const source = read("src/main/server-mode.ts");
  assert.match(source, /platform !== "linux" \|\| environment\.CODEBOT_SERVER !== "1"/u);
  assert.match(read("src/main/start.ts"), /CODEBOT_SERVER === "1"/u);
});

check("The install script needs an update URL on your own server and names no upstream address", () => {
  assert.match(installScript, /--update-url/u);
  assert.match(installScript, /Give the https:\/\/ URL of your update folder/u);
});

const shellFiles = [
  join(ROOT, "scripts/install-server.sh"),
  ...hostingFiles().filter((path) => /^#!.*\b(bash|sh)\b/u.test(readFileSync(path, "utf8").split("\n")[0] ?? "")),
];
const bash = spawnSync("bash", ["--version"], { encoding: "utf8" });
if (bash.status === 0) {
  check(`bash -n passes for ${shellFiles.length} install and hosting scripts`, () => {
    const failed: string[] = [];
    for (const file of shellFiles) {
      const result = spawnSync("bash", ["-n", file], { encoding: "utf8" });
      if (result.status !== 0) failed.push(`${file}: ${result.stderr.trim()}`);
    }
    assert.deepEqual(failed, []);
  });
} else {
  report.notRun.push("bash -n of the install and hosting scripts: bash is not on this computer.");
}

check("No upstream address is in the Docker files, the install script or the hosting scripts", () => {
  const files = [
    join(ROOT, "docker/Dockerfile"),
    join(ROOT, "docker/compose.yaml"),
    join(ROOT, "scripts/install-server.sh"),
    ...hostingFiles().filter((path) => !path.endsWith("release-boat-template.sh")),
  ];
  const found = files.filter((file) =>
    /your-org|codebot\.example|raw\.githubusercontent/iu.test(readFileSync(file, "utf8")),
  );
  assert.deepEqual(found, []);
});

report.passed = report.checks.every((entry) => entry.passed);
mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
for (const entry of report.checks)
  process.stdout.write(`${entry.passed ? "ok  " : "FAIL"} ${entry.name} ${entry.detail ?? ""}\n`);
process.stdout.write(`${report.passed ? "PASS" : "FAIL"} ${join(OUT, "report.json")}\n`);
process.exitCode = report.passed ? 0 : 1;
