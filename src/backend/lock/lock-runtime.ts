import { existsSync } from "node:fs";
import { type AgentSummary, agentProviderDescriptor, agentProviderName } from "@codebot/contracts/ipc";
import { sourceText } from "@codebot/i18n/source";
import type { AgentProvider } from "../agent-client";
import { type ContainerPlan, containerPlan, containerPolicy, findContainerTool } from "./container";
import { agentFolderLock, type FolderLock } from "./folder-lock";
import { type LockRefusal, type LockStrategy, lockStrategy } from "./lock-strategy";
import { findBubblewrap } from "./strict-confinement";

type LockAgent = Pick<AgentSummary, "id" | "access" | "additionalFolders" | "excludedFolders" | "workspacePath">;

export interface ProviderLock {
  readonly lock: FolderLock;
  readonly strategy: LockStrategy;
  readonly container: ContainerPlan | null;
}

const SANDBOX_EXEC = "/usr/bin/sandbox-exec";

export function providerLock(
  agent: LockAgent,
  provider: AgentProvider,
  sharedRoot: string,
  platform: NodeJS.Platform = process.platform,
): ProviderLock | null {
  const lock = agentFolderLock(agent, sharedRoot);
  if (!lock) return null;
  const enforcement = agentProviderDescriptor(provider).workspaceEnforcement;
  const tool = enforcement === "command-sandbox" ? null : findContainerTool();
  const strategy = lockStrategy({
    level: lock.level,
    enforcement,
    platform,
    bubblewrap: platform === "linux" && findBubblewrap() !== null,
    seatbelt: platform === "darwin" && existsSync(SANDBOX_EXEC),
    containerTool: tool !== null,
    containerPolicy: containerPolicy(),
    claudeSandbox: null,
  });
  const container =
    strategy.kind === "container" && tool && enforcement === "confined-process"
      ? containerPlan({
          tool,
          projectId: lock.projectId ?? agent.workspacePath,
          writableFolders: lock.allowedFolders,
          readOnlyFolders: lock.readOnlyFolders,
          workdir: agent.workspacePath,
        })
      : null;
  return { lock, strategy, container };
}

export function lockRefusalMessage(reason: LockRefusal, provider: AgentProvider, level: FolderLock["level"]): string {
  const name = agentProviderName(provider);
  const label = level === "strict" ? "Strict" : "Normal";
  switch (reason) {
    case "container-missing":
      return sourceText("error.lock.containerMissing", {});
    case "claude-strict-no-sandbox":
      return sourceText("error.lock.claudeNoSandboxStrict", {});
    case "codex-strict-needs-container":
      return sourceText("error.lock.codexStrictNeedsSandbox", {});
    case "provider-tool-missing-bubblewrap":
      return sourceText("error.lock.providerToolMissing", { level: label, tool: "bubblewrap (bwrap)" });
    case "provider-needs-mac-or-linux":
      return sourceText("error.lock.providerNeedsMacOrLinux", { provider: name, level: label });
  }
}
