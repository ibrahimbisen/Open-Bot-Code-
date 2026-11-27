import { chmod, mkdir, writeFile } from "node:fs/promises";
import { basename, dirname } from "node:path";

const ON_WINDOWS = process.platform === "win32";
const WINDOWS_WRAPPER_EXTENSION = ".cmd";
const RUNTIMES_ON_PATH = new Set(["node", "bun"]);

export function standInPath(path: string): string {
  return ON_WINDOWS ? `${path}${WINDOWS_WRAPPER_EXTENSION}` : path;
}

export async function writeStandInScript(path: string, source: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  if (!ON_WINDOWS) {
    await writeFile(path, source);
    await chmod(path, 0o755);
    return;
  }
  const script = `${windowsWrapperBase(path)}.stand-in.cjs`;
  await writeFile(script, source);
  await writeFile(path, windowsWrapper(windowsRuntime(source), [siblingArgument(script)]));
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
  await writeFile(
    path,
    windowsWrapper(`"${batchText(process.execPath)}"`, ["-r", siblingArgument(preload), `"${batchText(module)}"`]),
  );
}

function windowsWrapperBase(path: string): string {
  if (!path.toLowerCase().endsWith(WINDOWS_WRAPPER_EXTENSION)) {
    throw new Error(`On Windows, a stand-in program needs the path that standInPath() gives: ${path}`);
  }
  return path.slice(0, -WINDOWS_WRAPPER_EXTENSION.length);
}

function windowsRuntime(source: string): string {
  const interpreter = /^#!([^\r\n]+)/.exec(source)?.[1]?.trim() ?? "";
  if (interpreter === process.execPath) return `"${batchText(interpreter)}"`;
  const onPath = /^\/usr\/bin\/env\s+(\S+)$/.exec(interpreter)?.[1] ?? "";
  if (RUNTIMES_ON_PATH.has(onPath)) return onPath;
  throw new Error(
    `Windows cannot start a stand-in script with the interpreter line "#!${interpreter}". Write the stand-in in JavaScript for Node.js or Bun.`,
  );
}

function windowsWrapper(runtime: string, programArguments: readonly string[]): string {
  const command = `@${runtime} ${programArguments.join(" ")} %*`;
  const onlyAscii = Buffer.byteLength(command) === command.length;
  return `${(onlyAscii ? [command] : ["@chcp 65001>nul", command]).join("\r\n")}\r\n`;
}

function siblingArgument(path: string): string {
  return `"%~dp0${batchText(basename(path))}"`;
}

function batchText(text: string): string {
  return text.replaceAll("%", "%%");
}
