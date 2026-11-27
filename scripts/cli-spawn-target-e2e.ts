import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { cliSpawnTarget } from "../src/backend/cli";
import { Checks } from "./account-e2e-support";

const checks = new Checks();
const run = (name: string, body: () => void | Promise<void>) =>
  checks.scenario(name, async () => {
    await body();
    checks.add(name, true);
  });

await run("a non-launcher executable is spawned directly on every platform", () => {
  const target = cliSpawnTarget("/usr/bin/tool", ["--version"], "linux");
  assert.deepEqual(target, { command: "/usr/bin/tool", args: ["--version"], windowsVerbatimArguments: false });
  const mac = cliSpawnTarget("/opt/homebrew/bin/tool", ["a b"], "darwin");
  assert.equal(mac.command, "/opt/homebrew/bin/tool");
  assert.equal(mac.windowsVerbatimArguments, false);
});

await run("a .cmd path with percent signs is not doubled", () => {
  const target = cliSpawnTarget("C:/Tools/100%/tool.cmd", [], "win32");
  const line = target.args.at(-1) ?? "";
  assert.ok(!line.includes("%%\\"), `percent doubled: ${line}`);
  assert.ok(line.includes("100%%cd:~,%/tool.cmd"), `unexpected line: ${line}`);
});

if (process.platform === "win32") {
  await run("cmd.exe runs a .cmd file whose path contains percent signs", async () => {
    const root = await mkdtemp(join(tmpdir(), "cli-spawn-"));
    try {
      const folder = join(root, "a%b%PATH%c");
      await mkdir(folder, { recursive: true });
      const script = join(folder, "echo.cmd");
      await writeFile(script, "@echo off\r\necho ran %1\r\n");
      const target = cliSpawnTarget(script, ["x%y"]);
      const result = spawnSync(target.command, target.args, {
        encoding: "utf8",
        windowsVerbatimArguments: target.windowsVerbatimArguments,
      });
      assert.equal(result.status, 0, result.stderr);
      assert.match(result.stdout, /ran "?x%y"?/);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
}

if (!(await checks.writeReport("cli-spawn-target"))) process.exitCode = 1;
