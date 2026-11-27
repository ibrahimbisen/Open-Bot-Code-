import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { isDynamicRecord, isString } from "@codebot/contracts/runtime-values";
import { createCodeBotLogger } from "@codebot/logging";
import { validUpdateFeedUrl } from "../src/main/app-update/update-feed";

const logger = createCodeBotLogger("release-preflight");

const packageJson = JSON.parse(await readFile("package.json", "utf8"));
if (!isDynamicRecord(packageJson) || !isString(packageJson.version)) {
  throw new Error("package.json has no valid version.");
}
const failures: string[] = [];

if (!/^\d+\.\d+\.\d+$/.test(packageJson.version)) failures.push("package version is not semver");
if (run("git", ["status", "--porcelain"])) failures.push("working tree is not clean");
if (run("git", ["tag", "--list", `codebot-v${packageJson.version}`])) {
  failures.push(`tag codebot-v${packageJson.version} already exists`);
}
const updateUrl = process.env.CODEBOT_UPDATE_URL;
if (updateUrl === undefined || updateUrl.trim() === "") {
  failures.push("CODEBOT_UPDATE_URL is not set, so the build has no update server (users can set it in Settings)");
} else if (validUpdateFeedUrl(updateUrl) === null) {
  failures.push("CODEBOT_UPDATE_URL is not a valid update server URL");
}

if (failures.length > 0) {
  logger.error("CodeBot release preflight failed:\n");
  for (const failure of failures) logger.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  logger.info(`CodeBot v${packageJson.version} release preflight passed.`);
}

function run(command: string, args: string[]): string {
  return execFileSync(command, args, { encoding: "utf8" }).trim();
}
