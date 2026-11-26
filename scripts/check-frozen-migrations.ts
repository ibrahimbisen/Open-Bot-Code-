import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { frozenMigrationProblems, MIGRATIONS_DIR } from "./frozen-migrations";

function git(...args: string[]): string {
  return execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 64 << 20 });
}

function newestReleaseTag(): string {
  const tags = git("tag", "--list", "--sort=-v:refname", "codebot-v*");
  const newest = /^(codebot-v\d+\.\d+\.\d+)$/m.exec(tags)?.[1];
  if (!newest) throw new Error("No codebot-v* release tag in this checkout.");
  return newest;
}

const tagFlag = process.argv.indexOf("--tag");
const tag = tagFlag === -1 ? newestReleaseTag() : (process.argv[tagFlag + 1] ?? "");
git("rev-parse", "--verify", "--quiet", `refs/tags/${tag}^{commit}`);

const releasedFiles = new Map<string, string>();
for (const path of git("ls-tree", "--name-only", tag, "--", `${MIGRATIONS_DIR}/`).split("\n").filter(Boolean)) {
  releasedFiles.set(path.slice(MIGRATIONS_DIR.length + 1), git("show", `${tag}:${path}`));
}
const current = new Map(
  readdirSync(MIGRATIONS_DIR).map((file) => [file, readFileSync(join(MIGRATIONS_DIR, file), "utf8")]),
);

const problems = frozenMigrationProblems(current, { tag, files: releasedFiles });
if (problems.length > 0) {
  process.stderr.write(
    [
      `These migrations break the frozen-migration rules (compared with ${tag}):`,
      ...problems.map((problem) => `- ${MIGRATIONS_DIR}/${problem}`),
      "",
      "See src/backend/AGENTS.md#frozen-migrations.",
      "",
    ].join("\n"),
  );
  process.exit(1);
}
const scope =
  releasedFiles.size > 0 ? `${releasedFiles.size} released files unchanged` : "no frozen files in the tag yet";
process.stdout.write(`Migrations are frozen: ${tag}, ${scope}.\n`);
