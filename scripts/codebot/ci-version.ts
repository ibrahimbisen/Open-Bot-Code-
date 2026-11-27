import { readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { isDynamicRecord, isString } from "@codebot/contracts/runtime-values";

const USAGE = `Usage:
  bun scripts/codebot/ci-version.ts <build number> [--write]

Prints the release version: the major and minor version of package.json, and the build number as the
patch version. With --write it also sets this version in package.json.`;

const VERSION = /^(\d+)\.(\d+)\.\d+$/u;
const BUILD_NUMBER = /^[1-9]\d{0,8}$/u;

export function releaseVersion(packageVersion: string, buildNumber: string): string {
  const match = VERSION.exec(packageVersion);
  if (!match) throw new Error(`package.json version ${packageVersion} is not major.minor.patch.`);
  if (!BUILD_NUMBER.test(buildNumber)) throw new Error(`The build number ${buildNumber} is not a positive integer.`);
  return `${match[1]}.${match[2]}.${Number(buildNumber)}`;
}

export function withVersion(packageText: string, version: string): string {
  const packageJson = JSON.parse(packageText);
  if (!isDynamicRecord(packageJson)) throw new Error("package.json is not an object.");
  return `${JSON.stringify({ ...packageJson, version }, null, 2)}\n`;
}

function packageVersion(packageText: string): string {
  const packageJson = JSON.parse(packageText);
  if (!isDynamicRecord(packageJson) || !isString(packageJson.version)) throw new Error("package.json has no version.");
  return packageJson.version;
}

if (import.meta.main) {
  const [buildNumber, flag, ...rest] = process.argv.slice(2);
  if (buildNumber === undefined || rest.length > 0 || (flag !== undefined && flag !== "--write")) {
    process.stderr.write(`${USAGE}\n`);
    process.exit(2);
  }
  const path = join(resolve(import.meta.dirname, "..", ".."), "package.json");
  const text = await readFile(path, "utf8");
  const version = releaseVersion(packageVersion(text), buildNumber);
  if (flag === "--write") await writeFile(path, withVersion(text, version));
  process.stdout.write(`${version}\n`);
}
