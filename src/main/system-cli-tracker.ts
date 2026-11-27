import { isManagedRuntimeProvider, type ManagedProviderId } from "@codebot/contracts/agent-providers";
import type { AgentProviderStatus, AgentStatus } from "@codebot/contracts/ipc";
import { Effect } from "effect";
import type { ProviderRuntimeManager } from "./provider-runtime-manager";
import type { ProviderUseSettingsStore } from "./provider-use-settings-store";

export interface SystemCliTrackerDependencies {
  runtimes: Pick<
    ProviderRuntimeManager,
    "setSystemVersion" | "getStatus" | "download" | "providerUseChanged" | "executablePath"
  >;
  providerUse: Pick<ProviderUseSettingsStore, "off" | "installed">;
  agentProviders: () => ReadonlySet<string>;
  server: boolean;
}

export function createSystemCliTracker({
  runtimes,
  providerUse,
  agentProviders,
  server,
}: SystemCliTrackerDependencies): (status: Pick<AgentStatus, "providers">) => void {
  const incompleteStarted = new Set<ManagedProviderId>();
  const replacesIncompleteCli = (
    provider: AgentProviderStatus,
    runtime: ManagedProviderId,
    used: () => ReadonlySet<string>,
  ) =>
    provider.cliIncomplete === true &&
    !incompleteStarted.has(runtime) &&
    !providerUse.installed().includes(runtime) &&
    runtimes.getStatus().providers[runtime].phase === "not-downloaded" &&
    used().has(runtime);
  const startDownload = (runtime: ManagedProviderId, needsDownload: Effect.Effect<boolean>) => {
    Effect.runFork(
      needsDownload.pipe(
        Effect.flatMap((download) => (download ? runtimes.download(runtime) : Effect.void)),
        Effect.ignore,
      ),
    );
  };
  return (status) => {
    let copyInUse = false;
    let usedProviders: ReadonlySet<string> | null = null;
    const used = () => {
      usedProviders ??= agentProviders();
      return usedProviders;
    };
    for (const provider of status.providers ?? []) {
      if (!isManagedRuntimeProvider(provider.id)) continue;
      const runtime = provider.id;
      const version = provider.cliSource === "system" ? (provider.version ?? null) : null;
      if (runtimes.setSystemVersion(runtime, version, provider.cliIncomplete === true)) copyInUse = true;
      if (!server || providerUse.off().includes(runtime)) continue;
      if (replacesIncompleteCli(provider, runtime, used)) {
        incompleteStarted.add(runtime);
        startDownload(runtime, Effect.succeed(true));
      }
    }
    if (copyInUse) Effect.runFork(runtimes.providerUseChanged());
  };
}
