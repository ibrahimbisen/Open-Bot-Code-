import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { mkdir, mkdtemp, realpath, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
  type ExplorerGitStatus,
  type ExplorerScope,
  isExplorerGitCommitFiles,
  isExplorerGitDiff,
  isExplorerGitLog,
  isExplorerGitStatus,
} from "@codebot/contracts/ipc";
import { createExplorerService } from "../src/main/explorer/explorer-service";

const OUT = resolve(import.meta.dirname, "../.codebot-build/explorer-git-e2e");
const SCOPE: ExplorerScope = { agentId: "agent-git-e2e" };

interface Check {
  name: string;
  passed: boolean;
  detail?: unknown;
  error?: string;
}

const report: { passed: boolean; platform: string; checks: Check[] } = {
  passed: false,
  platform: process.platform,
  checks: [],
};

async function check(name: string, run: () => Promise<unknown>): Promise<void> {
  try {
    const detail = await run();
    report.checks.push({ name, passed: true, ...(detail === undefined ? {} : { detail }) });
    process.stdout.write(`ok   ${name}\n`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    report.checks.push({ name, passed: false, error: message });
    process.stdout.write(`FAIL ${name}\n     ${message.split("\n").join("\n     ")}\n`);
  }
}

const base = await realpath(await mkdtemp(join(tmpdir(), "codebot-explorer-git-")));
const repo = join(base, "repo");
const plain = join(base, "plain");
const outside = join(base, "outside");

function git(...args: string[]): string {
  return execFileSync(
    "git",
    [
      "-c",
      "user.name=Test",
      "-c",
      "user.email=test@example.invalid",
      "-c",
      "commit.gpgsign=false",
      "-c",
      "core.autocrlf=false",
      ...args,
    ],
    { cwd: repo, encoding: "utf8", windowsHide: true },
  );
}

let folders: string[] = [repo];
const explorer = createExplorerService({
  folders: () => folders,
  trash: async () => undefined,
  reveal: () => undefined,
});

function byRelative(status: ExplorerGitStatus, relativePath: string) {
  return status.files.find((file) => file.relativePath === relativePath);
}

try {
  await mkdir(join(repo, "src"), { recursive: true });
  await mkdir(plain);
  await mkdir(outside);
  git("init", "-q", "-b", "main");
  await writeFile(join(repo, ".gitignore"), "ignored.log\nbuild/\n");
  await writeFile(join(repo, "src", "app.ts"), "export const one = 1;\n");
  await writeFile(join(repo, "src", "old-name.ts"), "export const keep = true;\nexport const more = 2;\n");
  await writeFile(join(repo, "src", "gone.ts"), "export const gone = 1;\n");
  await writeFile(join(repo, "logo.bin"), Buffer.from([0, 1, 2, 3, 0, 255]));
  git("add", "-A");
  git("commit", "-q", "-m", "First commit");
  await writeFile(join(repo, "src", "app.ts"), "export const one = 1;\nexport const two = 2;\n");
  git("commit", "-q", "-a", "-m", "Add two");
  git("tag", "v1");

  await writeFile(join(repo, "src", "app.ts"), "export const one = 1;\nexport const two = 3;\n");
  await rm(join(repo, "src", "gone.ts"));
  await rename(join(repo, "src", "old-name.ts"), join(repo, "src", "new-name.ts"));
  git("add", "src/new-name.ts", "src/old-name.ts");
  await writeFile(join(repo, "fresh.txt"), "new file\n");
  await writeFile(join(repo, "ignored.log"), "noise\n");
  await mkdir(join(repo, "build"));
  await writeFile(join(repo, "build", "out.js"), "x\n");
  await writeFile(join(repo, "logo.bin"), Buffer.from([0, 9, 9, 9, 0, 255]));

  await check("status lists new, changed, deleted, renamed and ignored files", async () => {
    const status = await explorer.git.status({ scope: SCOPE, root: repo, ignored: true });
    assert.ok(isExplorerGitStatus(status), "The status has an invalid shape.");
    assert.equal(status.state, "ready");
    assert.equal(status.branch?.name, "main");
    assert.equal(byRelative(status, "src/app.ts")?.worktree, "modified");
    assert.equal(byRelative(status, "src/gone.ts")?.worktree, "deleted");
    assert.equal(byRelative(status, "fresh.txt")?.worktree, "untracked");
    assert.equal(byRelative(status, "src/new-name.ts")?.index, "renamed");
    assert.equal(byRelative(status, "src/new-name.ts")?.originalPath, join(repo, "src", "old-name.ts"));
    assert.ok(byRelative(status, "ignored.log")?.worktree === "ignored", "ignored.log is not ignored.");
    assert.ok(
      status.files.some((file) => file.worktree === "ignored" && file.relativePath.startsWith("build")),
      "build/ is not ignored.",
    );
    return status.files.map((file) => `${file.relativePath}:${file.index ?? "-"}/${file.worktree ?? "-"}`);
  });

  await check("status without ignored files hides them", async () => {
    const status = await explorer.git.status({ scope: SCOPE, root: repo, ignored: false });
    assert.ok(!status.files.some((file) => file.worktree === "ignored"));
    assert.ok(status.files.length >= 4);
  });

  await check("log returns commits newest first with refs, and pages", async () => {
    const log = await explorer.git.log({ scope: SCOPE, root: repo, skip: 0, limit: 1 });
    assert.ok(isExplorerGitLog(log));
    assert.equal(log.commits.length, 1);
    assert.equal(log.commits[0]?.subject, "Add two");
    assert.ok(log.more, "The first page must say there is more.");
    assert.ok(log.commits[0]?.refs.some((ref) => ref.includes("main")));
    assert.ok(log.commits[0]?.refs.some((ref) => ref.includes("v1")));
    const next = await explorer.git.log({ scope: SCOPE, root: repo, skip: 1, limit: 5 });
    assert.equal(next.commits[0]?.subject, "First commit");
    assert.equal(next.more, false);
    assert.equal(next.commits[0]?.parents.length, 0);
  });

  await check("commit files list the changes of a commit and of a root commit", async () => {
    const log = await explorer.git.log({ scope: SCOPE, root: repo, skip: 0, limit: 5 });
    const [latest, first] = log.commits;
    assert.ok(latest && first);
    const latestFiles = await explorer.git.commitFiles({ scope: SCOPE, root: repo, hash: latest.hash });
    assert.ok(isExplorerGitCommitFiles(latestFiles));
    assert.deepEqual(
      latestFiles.files.map((file) => [file.relativePath, file.change]),
      [["src/app.ts", "modified"]],
    );
    const firstFiles = await explorer.git.commitFiles({ scope: SCOPE, root: repo, hash: first.hash });
    assert.ok(firstFiles.files.length >= 4);
    assert.ok(firstFiles.files.every((file) => file.change === "added"));
  });

  await check("diff of a working file compares HEAD with the disk", async () => {
    const diff = await explorer.git.diff({
      scope: SCOPE,
      root: repo,
      path: join(repo, "src", "app.ts"),
      hash: null,
      originalPath: null,
    });
    assert.ok(isExplorerGitDiff(diff));
    assert.equal(diff.original, "export const one = 1;\nexport const two = 2;\n");
    assert.equal(diff.modified, "export const one = 1;\nexport const two = 3;\n");
  });

  await check("diff covers a new file, a deleted file and a rename", async () => {
    const added = await explorer.git.diff({
      scope: SCOPE,
      root: repo,
      path: join(repo, "fresh.txt"),
      hash: null,
      originalPath: null,
    });
    assert.equal(added.original, null);
    assert.equal(added.modified, "new file\n");
    const removed = await explorer.git.diff({
      scope: SCOPE,
      root: repo,
      path: join(repo, "src", "gone.ts"),
      hash: null,
      originalPath: null,
    });
    assert.equal(removed.original, "export const gone = 1;\n");
    assert.equal(removed.modified, null);
    const renamed = await explorer.git.diff({
      scope: SCOPE,
      root: repo,
      path: join(repo, "src", "new-name.ts"),
      hash: null,
      originalPath: join(repo, "src", "old-name.ts"),
    });
    assert.equal(renamed.original, "export const keep = true;\nexport const more = 2;\n");
    assert.equal(renamed.modified, renamed.original);
  });

  await check("diff of a commit compares the parent with the commit", async () => {
    const log = await explorer.git.log({ scope: SCOPE, root: repo, skip: 0, limit: 1 });
    const hash = log.commits[0]?.hash ?? "";
    const diff = await explorer.git.diff({
      scope: SCOPE,
      root: repo,
      path: join(repo, "src", "app.ts"),
      hash,
      originalPath: null,
    });
    assert.equal(diff.original, "export const one = 1;\n");
    assert.equal(diff.modified, "export const one = 1;\nexport const two = 2;\n");
  });

  await check("diff of a binary file has no text", async () => {
    const diff = await explorer.git.diff({
      scope: SCOPE,
      root: repo,
      path: join(repo, "logo.bin"),
      hash: null,
      originalPath: null,
    });
    assert.equal(diff.binary, true);
    assert.equal(diff.original, null);
    assert.equal(diff.modified, null);
  });

  await check("a folder that is not a repository reports its state", async () => {
    folders = [plain];
    const status = await explorer.git.status({ scope: SCOPE, root: plain, ignored: false });
    assert.equal(status.state, "not-repository");
    const log = await explorer.git.log({ scope: SCOPE, root: plain, skip: 0, limit: 5 });
    assert.equal(log.state, "not-repository");
    folders = [repo];
  });

  await check("a root that is not a project folder is refused", async () => {
    await assert.rejects(
      explorer.git.status({ scope: SCOPE, root: outside, ignored: false }),
      /not in the folders of the project/u,
    );
    await assert.rejects(
      explorer.git.diff({
        scope: SCOPE,
        root: repo,
        path: join(outside, "x.txt"),
        hash: null,
        originalPath: null,
      }),
      /not in the folders of the project/u,
    );
  });

  explorer.close();
  report.passed = report.checks.every((item) => item.passed);
} finally {
  await rm(base, { recursive: true, force: true }).catch(() => undefined);
  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
  process.stdout.write(`Report: ${join(OUT, "report.json")}\n`);
}

process.exit(report.passed ? 0 : 1);
