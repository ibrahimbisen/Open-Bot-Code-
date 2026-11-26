import { chmod, mkdir, writeFile } from "node:fs/promises";
import { basename, dirname } from "node:path";

const ON_WINDOWS = process.platform === "win32";
const WINDOWS_WRAPPER_EXTENSION = ".cmd";

export function standInPath(path: string): string {
  return ON_WINDOWS ? `${path}${WINDOWS_WRAPPER_EXTENSION}` : path;
}

export async function writeStandInScript(path: string, source: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  if (!ON_WINDOWS) {
    await writeFile(path, `#!${process.execPath}\n${source}`);
    await chmod(path, 0o755);
    return;
  }
  const script = `${windowsWrapperBase(path)}.stand-in.cjs`;
  await writeFile(script, source);
  await writeFile(path, windowsWrapper([siblingArgument(script)]));
}

export async function writeStandInLauncher(
  path: string,
  module: string,
  env: Readonly<Record<string, string>> = {},
): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  if (!ON_WINDOWS) {
    const exports = Object.entries(env)
      .map(([name, value]) => `export ${name}=${JSON.stringify(value)}\n`)
      .join("");
    await writeFile(path, `#!/bin/sh\n${exports}exec "${process.execPath}" "${module}" "$@"\n`);
    await chmod(path, 0o755);
    return;
  }
  const preload = `${windowsWrapperBase(path)}.stand-in-env.cjs`;
  await writeFile(preload, `Object.assign(process.env, ${JSON.stringify(env)});\n`);
  await writeFile(path, windowsWrapper(["-r", siblingArgument(preload), `"${batchText(module)}"`]));
}

function windowsWrapperBase(path: string): string {
  if (!path.toLowerCase().endsWith(WINDOWS_WRAPPER_EXTENSION)) {
    throw new Error(`On Windows, a stand-in program needs the path that standInPath() gives: ${path}`);
  }
  return path.slice(0, -WINDOWS_WRAPPER_EXTENSION.length);
}

function windowsWrapper(programArguments: readonly string[]): string {
  const command = `@"${batchText(process.execPath)}" ${programArguments.join(" ")} %*`;
  const onlyAscii = Buffer.byteLength(command) === command.length;
  return `${(onlyAscii ? [command] : ["@chcp 65001>nul", command]).join("\r\n")}\r\n`;
}

function siblingArgument(path: string): string {
  return `"%~dp0${batchText(basename(path))}"`;
}

function batchText(text: string): string {
  return text.replaceAll("%", "%%");
}
