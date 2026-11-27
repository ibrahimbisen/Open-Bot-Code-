import { stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { isAbsolute } from "node:path";
import type { AgentSummary } from "@codebot/contracts/ipc";
import { Effect } from "effect";
import { lockEnforced } from "../lock/lock-level";
import { isPathInside } from "../path-containment";
import { agentProjectContext } from "../projects/project-context";

type SandboxedAgent = Pick<AgentSummary, "id" | "access" | "additionalFolders" | "provider" | "workspacePath">;

export function codexSandboxMode(agent: SandboxedAgent): "workspace-write" | "danger-full-access" {
  return lockEnforced(agent) ? "workspace-write" : "danger-full-access";
}

export type CodexApprovalPolicy = "untrusted" | "on-request";

export function codexApprovalPolicy(
  agent: Pick<AgentSummary, "id" | "access">,
  asksFirst: boolean,
): CodexApprovalPolicy {
  return asksFirst && !lockEnforced(agent) ? "untrusted" : "on-request";
}

const foundFolders = new Map<string, boolean>();

type FolderAgent = Pick<AgentSummary, "id" | "additionalFolders">;

let channelFoldersOf: (agentId: string) => readonly string[] = () => [];

export function setChannelFolderSource(source: (agentId: string) => readonly string[]): void {
  channelFoldersOf = source;
}

export function agentWorkingDirectory(agent: Pick<AgentSummary, "id" | "workspacePath">): string {
  return agentProjectContext(agent.id)?.mainFolder ?? agent.workspacePath;
}

export function effectiveAgentFolders(agent: FolderAgent): string[] {
  const project = agentProjectContext(agent.id);
  const own = project ? [...project.folders] : (agent.additionalFolders ?? []);
  return [...own, ...channelFoldersOf(agent.id).filter((folder) => !own.includes(folder))];
}

export const checkAgentFolders = Effect.fn("checkAgentFolders")(function* (agent: FolderAgent) {
  const folders = effectiveAgentFolders(agent);
  const found = yield* Effect.promise(() =>
    Promise.all(
      folders.map((folder) =>
        stat(folder).then(
          (stats) => stats.isDirectory(),
          () => false,
        ),
      ),
    ),
  );
  for (const [index, folder] of folders.entries()) foundFolders.set(folder, found[index] === true);
});

export function existingAgentFolders(agent: FolderAgent): string[] {
  return effectiveAgentFolders(agent).filter((folder) => foundFolders.get(folder) === true);
}

export function workspaceWritableRoots(
  agent: Pick<AgentSummary, "id" | "access" | "additionalFolders" | "workspacePath">,
  sharedRoot: string,
) {
  return [
    agent.workspacePath,
    ...(agentProjectContext(agent.id) && lockEnforced(agent) ? [] : [sharedRoot]),
    ...existingAgentFolders(agent),
  ];
}

export function workspaceExcludedFolders(agent: Pick<AgentSummary, "id" | "access" | "excludedFolders">): string[] {
  return lockEnforced(agent) ? (agent.excludedFolders ?? []) : [];
}

export function confinedWritesAllowed(
  agent: Pick<AgentSummary, "id" | "access" | "additionalFolders" | "excludedFolders" | "workspacePath">,
  sharedRoot: string,
  paths: readonly string[],
): boolean {
  if (!lockEnforced(agent) || paths.length === 0) return false;
  const roots = workspaceWritableRoots(agent, sharedRoot);
  const excluded = workspaceExcludedFolders(agent);
  return paths.every(
    (path) =>
      isAbsolute(path) &&
      roots.some((root) => isPathInside(root, path)) &&
      !excluded.some((folder) => isPathInside(folder, path)),
  );
}

export type CodexSandboxPolicy =
  | { type: "dangerFullAccess" }
  | {
      type: "workspaceWrite";
      writableRoots: string[];
      networkAccess: boolean;
      excludeTmpdirEnvVar: boolean;
      excludeSlashTmp: boolean;
    };

export function workspaceTemporaryPaths(platform: NodeJS.Platform = process.platform): string[] {
  return [...new Set(platform === "win32" ? [tmpdir()] : ["/tmp", tmpdir()])];
}

export function codexSandboxPolicy(agent: SandboxedAgent, sharedRoot: string): CodexSandboxPolicy {
  if (!lockEnforced(agent)) return { type: "dangerFullAccess" };
  return {
    type: "workspaceWrite",
    writableRoots: workspaceWritableRoots(agent, sharedRoot),
    networkAccess: true,
    excludeTmpdirEnvVar: false,
    excludeSlashTmp: false,
  };
}

export function codexSandboxConfig(
  agent: SandboxedAgent,
  sharedRoot: string,
): { sandbox_workspace_write?: { writable_roots: string[]; network_access: boolean } } {
  if (!lockEnforced(agent)) return {};
  return {
    sandbox_workspace_write: { writable_roots: workspaceWritableRoots(agent, sharedRoot), network_access: true },
  };
}
