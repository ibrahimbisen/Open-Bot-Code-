import type { AdvancedFeatureId, AdvancedFeatureSettings, ServerSummary } from "@codebot/contracts/ipc";
import { ADVANCED_FEATURES_CAPABILITY } from "@codebot/contracts/team-protocol/advanced-features-v1";
import { createEffect, createMemo, createSignal } from "solid-js";
import { createSimpleContext } from "../../simple-context";
import { serverCanAdminister, serverSupportsCapability } from "../servers/server-capabilities";
import { useServers } from "../servers/servers-context";

function advancedFeaturesReadable(server: ServerSummary | undefined): server is ServerSummary {
  if (!server) return false;
  if (server.kind === "local") return true;
  return server.state === "online" && serverSupportsCapability(server, ADVANCED_FEATURES_CAPABILITY);
}

const context = createSimpleContext({
  name: "AdvancedFeatures",
  init: () => {
    const { activeServer } = useServers();
    const [settings, setSettings] = createSignal<AdvancedFeatureSettings | undefined>(undefined);
    const [loadFailed, setLoadFailed] = createSignal(false);
    const readKey = createMemo(() => {
      const server = activeServer();
      return advancedFeaturesReadable(server) ? server.id : undefined;
    });
    let generation = 0;
    createEffect(readKey, (serverId) => {
      const request = ++generation;
      setSettings(undefined);
      setLoadFailed(false);
      if (serverId === undefined) return;
      window.codebot.hostAdmin.getAdvancedFeatures(serverId).then(
        (next) => {
          if (request === generation) setSettings(next);
        },
        () => {
          if (request === generation) setLoadFailed(true);
        },
      );
    });
    return {
      settings,
      loadFailed,
      enabled: (feature: AdvancedFeatureId): boolean => settings()?.[feature] === true,
      canChange: (): boolean => {
        const server = activeServer();
        return readKey() !== undefined && serverCanAdminister(server, ADVANCED_FEATURES_CAPABILITY);
      },
      async change(feature: AdvancedFeatureId, enabled: boolean): Promise<void> {
        const serverId = readKey();
        if (serverId === undefined) return;
        const next = await window.codebot.hostAdmin.setAdvancedFeature({ feature, enabled }, serverId);
        if (readKey() === serverId) setSettings(next);
      },
    };
  },
});

export const AdvancedFeaturesProvider = context.provider;
export const useAdvancedFeatures = context.use;
