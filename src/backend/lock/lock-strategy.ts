import type { AgentProviderDescriptor } from "@codebot/contracts/ipc";
import type { ContainerPolicy } from "./container";
import type { EnforcedLockLevel } from "./lock-level";

export type WorkspaceEnforcement = AgentProviderDescriptor["workspaceEnforcement"];

export interface LockFacts {
  readonly level: EnforcedLockLevel;
  readonly enforcement: WorkspaceEnforcement;
  readonly platform: NodeJS.Platform;
  readonly bubblewrap: boolean;
  readonly seatbelt: boolean;
  readonly containerTool: boolean;
  readonly containerPolicy: ContainerPolicy;
  readonly claudeSandbox: boolean | null;
}

export type LockStrategy =
  | { readonly kind: "native" }
  | { readonly kind: "container" }
  | { readonly kind: "refuse"; readonly reason: LockRefusal };

export type LockRefusal =
  | "claude-strict-no-sandbox"
  | "codex-strict-needs-container"
  | "provider-needs-mac-or-linux"
  | "provider-tool-missing-bubblewrap"
  | "container-missing";

export function lockStrategy(facts: LockFacts): LockStrategy {
  const container =
    facts.containerTool &&
    (facts.containerPolicy === "always" || (facts.containerPolicy === "auto" && facts.platform === "linux"));
  if (facts.level === "strict" && facts.containerPolicy === "always") {
    return container ? { kind: "container" } : { kind: "refuse", reason: "container-missing" };
  }
  if (facts.enforcement === "tool-sandbox") {
    if (facts.level === "normal" || facts.claudeSandbox !== false) return { kind: "native" };
    return container ? { kind: "container" } : { kind: "refuse", reason: "claude-strict-no-sandbox" };
  }
  if (facts.enforcement === "command-sandbox") {
    if (facts.level === "normal") return { kind: "native" };
    return container ? { kind: "container" } : { kind: "refuse", reason: "codex-strict-needs-container" };
  }
  if (facts.platform === "darwin")
    return facts.seatbelt ? { kind: "native" } : { kind: "refuse", reason: "provider-needs-mac-or-linux" };
  if (facts.platform === "linux")
    return facts.bubblewrap
      ? { kind: "native" }
      : facts.level === "strict" && container
        ? { kind: "container" }
        : { kind: "refuse", reason: "provider-tool-missing-bubblewrap" };
  if (facts.level === "strict" && container) return { kind: "container" };
  return { kind: "refuse", reason: "provider-needs-mac-or-linux" };
}
