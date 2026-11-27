import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, statSync } from "node:fs";
import { delimiter, posix, win32 } from "node:path";
import { promisify } from "node:util";
import type { SpawnTarget } from "../process-confinement";

const run = promisify(execFile);

type ContainerTool = "docker" | "podman";
export type ContainerPolicy = "auto" | "always" | "never";

interface ContainerMount {
  readonly host: string;
  readonly readOnly: boolean;
}

export interface ContainerPlan {
  readonly tool: string;
  readonly toolArgs: readonly string[];
  readonly name: string;
  readonly image: string;
  readonly mounts: readonly ContainerMount[];
  readonly workdir: string;
  readonly platform: NodeJS.Platform;
  readonly user: string | null;
}

export interface ContainerPlanInput {
  readonly tool: string;
  readonly toolArgs?: readonly string[];
  readonly projectId: string;
  readonly writableFolders: readonly string[];
  readonly readOnlyFolders: readonly string[];
  readonly workdir: string;
  readonly platform?: NodeJS.Platform;
  readonly env?: NodeJS.ProcessEnv;
  readonly user?: string | null;
}

const CONTAINER_IMAGE_VARIABLE = "CODEBOT_LOCK_CONTAINER_IMAGE";
const CONTAINER_POLICY_VARIABLE = "CODEBOT_LOCK_CONTAINER";
const DEFAULT_CONTAINER_IMAGE = "docker.io/library/ubuntu:24.04";

const MOUNTS_LABEL = "codebot.lock.mounts";
const NAME_PREFIX = "codebot-lock-";
const ENVIRONMENT_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/u;
const TOOLS: readonly ContainerTool[] = ["docker", "podman"];

let policy: ContainerPolicy | null = null;

export function setContainerPolicy(next: ContainerPolicy | null): void {
  policy = next;
}

export function containerPolicy(env: NodeJS.ProcessEnv = process.env): ContainerPolicy {
  if (policy) return policy;
  const value = env[CONTAINER_POLICY_VARIABLE]?.trim().toLowerCase();
  return value === "always" || value === "never" ? value : "auto";
}

export function findContainerTool(
  env: NodeJS.ProcessEnv = process.env,
  platform: NodeJS.Platform = process.platform,
): string | null {
  const suffixes = platform === "win32" ? [".exe", ".cmd", ".bat"] : [""];
  const folders = (env.PATH ?? env.Path ?? "").split(platform === "win32" ? ";" : delimiter).filter(Boolean);
  for (const tool of TOOLS)
    for (const folder of folders)
      for (const suffix of suffixes) {
        const candidate = (platform === "win32" ? win32 : posix).join(folder, `${tool}${suffix}`);
        if (isFile(candidate)) return candidate;
      }
  return null;
}

function isFile(path: string): boolean {
  try {
    return existsSync(path) && statSync(path).isFile();
  } catch {
    return false;
  }
}

function containerName(projectId: string): string {
  const safe = projectId.replace(/[^A-Za-z0-9_.-]/gu, "-").slice(0, 48);
  const digest = createHash("sha256").update(projectId).digest("hex").slice(0, 8);
  return `${NAME_PREFIX}${safe}-${digest}`;
}

export function containerPath(host: string, platform: NodeJS.Platform = process.platform): string {
  if (platform !== "win32") return host;
  const match = /^([A-Za-z]):[/]*(.*)$/u.exec(host);
  if (!match?.[1]) return `/codebot/host/${host.replace(/^[/]+/u, "").replaceAll("\\", "/")}`;
  return posix.join("/codebot", match[1].toLowerCase(), match[2]?.replaceAll("\\", "/") ?? "");
}

export function containerPlan(input: ContainerPlanInput): ContainerPlan {
  const platform = input.platform ?? process.platform;
  const writable = [...new Set(input.writableFolders)];
  const readOnly = [...new Set(input.readOnlyFolders)].filter((folder) => !writable.includes(folder));
  return {
    tool: input.tool,
    toolArgs: input.toolArgs ?? [],
    name: containerName(input.projectId),
    image: (input.env ?? process.env)[CONTAINER_IMAGE_VARIABLE]?.trim() || DEFAULT_CONTAINER_IMAGE,
    mounts: [
      ...writable.map((host) => ({ host, readOnly: false })),
      ...readOnly.map((host) => ({ host, readOnly: true })),
    ],
    workdir: containerPath(input.workdir, platform),
    platform,
    user: input.user === undefined ? currentUser() : input.user,
  };
}

function currentUser(): string | null {
  return typeof process.getuid === "function" && typeof process.getgid === "function"
    ? `${process.getuid()}:${process.getgid()}`
    : null;
}

function mountsKey(plan: ContainerPlan): string {
  return createHash("sha256")
    .update(JSON.stringify([plan.image, plan.user, plan.mounts]))
    .digest("hex")
    .slice(0, 16);
}

function containerRunArgs(plan: ContainerPlan): string[] {
  return [
    "run",
    "--detach",
    "--init",
    "--name",
    plan.name,
    "--label",
    `${MOUNTS_LABEL}=${mountsKey(plan)}`,
    "--security-opt",
    "no-new-privileges",
    "--cap-drop",
    "ALL",
    "--tmpfs",
    "/tmp",
    ...(plan.user ? ["--user", plan.user] : []),
    ...plan.mounts.flatMap((mount) => [
      "--volume",
      `${mount.host}:${containerPath(mount.host, plan.platform)}${mount.readOnly ? ":ro" : ""}`,
    ]),
    "--workdir",
    plan.workdir,
    plan.image,
    "sleep",
    "infinity",
  ];
}

function containerExecArgs(
  plan: ContainerPlan,
  command: string,
  args: readonly string[],
  cwd: string | undefined,
  environmentNames: readonly string[],
): string[] {
  return [
    "exec",
    "--interactive",
    "--workdir",
    cwd ? containerPath(cwd, plan.platform) : plan.workdir,
    ...environmentNames.filter((name) => ENVIRONMENT_NAME.test(name)).flatMap((name) => ["--env", name]),
    plan.name,
    command,
    ...args,
  ];
}

export function containerExecTarget(
  plan: ContainerPlan,
  target: SpawnTarget,
  cwd: string | undefined,
  environmentNames: readonly string[],
): SpawnTarget {
  return {
    command: plan.tool,
    args: [...plan.toolArgs, ...containerExecArgs(plan, target.command, target.args, cwd, environmentNames)],
    windowsVerbatimArguments: false,
  };
}

class ContainerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ContainerError";
  }
}

export async function ensureProjectContainer(plan: ContainerPlan, env: NodeJS.ProcessEnv = process.env): Promise<void> {
  const exec = async (args: readonly string[]) => {
    try {
      const { stdout } = await run(plan.tool, [...plan.toolArgs, ...args], {
        env,
        windowsHide: true,
        timeout: 120_000,
      });
      return { ok: true as const, stdout: stdout.trim() };
    } catch (error) {
      const text = error instanceof Error ? error.message : String(error);
      return { ok: false as const, stdout: "", error: text };
    }
  };
  const inspected = await exec([
    "inspect",
    "--format",
    `{{.State.Running}} {{index .Config.Labels "${MOUNTS_LABEL}"}}`,
    plan.name,
  ]);
  if (inspected.ok && inspected.stdout === `true ${mountsKey(plan)}`) return;
  if (inspected.ok) await exec(["rm", "--force", plan.name]);
  const started = await exec(containerRunArgs(plan));
  if (!started.ok) throw new ContainerError(started.error.slice(0, 400));
}

export async function removeProjectContainer(
  plan: Pick<ContainerPlan, "tool" | "toolArgs" | "name">,
  env: NodeJS.ProcessEnv = process.env,
): Promise<void> {
  await run(plan.tool, [...plan.toolArgs, "rm", "--force", plan.name], {
    env,
    windowsHide: true,
    timeout: 60_000,
  }).catch(() => undefined);
}
