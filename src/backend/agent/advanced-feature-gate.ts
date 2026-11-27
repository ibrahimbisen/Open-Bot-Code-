import {
  ADVANCED_FEATURE_IDS,
  type AdvancedFeatureId,
  type AdvancedFeatureSettings,
  DEFAULT_ADVANCED_FEATURES,
} from "@codebot/contracts/ipc";

const FEATURE_TOOLS: Readonly<Record<AdvancedFeatureId, readonly string[]>> = {
  routines: [
    "list_routines",
    "create_routine",
    "update_routine",
    "delete_routine",
    "test_routine",
    "create_webhook_routine",
    "update_webhook_routine",
    "list_routine_flows",
    "connect_routine_agents",
    "disconnect_routine_agents",
    "channel_list_routines",
    "channel_create_routine",
    "channel_update_routine",
    "channel_delete_routine",
  ],
  channels: [
    "list_channels",
    "send_to_channel",
    "create_channel",
    "update_channel",
    "channel_history",
    "channel_assign",
    "channel_transfer",
    "channel_result",
    "channel_reply",
    "channel_cancel",
    "channel_remember",
    "channel_forget_memory",
    "channel_add_member",
    "channel_remove_member",
    "channel_set_instructions",
    "channel_list_routines",
    "channel_create_routine",
    "channel_update_routine",
    "channel_delete_routine",
  ],
  marketplace: ["suggest_marketplace_app"],
  chatApps: [
    "messaging_remember",
    "messaging_forget_memory",
    "messaging_history",
    "messaging_list_places",
    "messaging_post",
  ],
  computerUse: [],
  remoteDesktop: [],
};

const TOOL_FEATURES: ReadonlyMap<string, readonly AdvancedFeatureId[]> = (() => {
  const map = new Map<string, AdvancedFeatureId[]>();
  for (const feature of ADVANCED_FEATURE_IDS)
    for (const name of FEATURE_TOOLS[feature]) map.set(name, [...(map.get(name) ?? []), feature]);
  return map;
})();

let read: () => AdvancedFeatureSettings = () => ({ ...DEFAULT_ADVANCED_FEATURES });

export function configureAdvancedFeatureGate(reader: () => AdvancedFeatureSettings): void {
  read = reader;
}

export function advancedFeatureEnabled(feature: AdvancedFeatureId): boolean {
  return read()[feature];
}

export function advancedFeaturesKey(): string {
  const settings = read();
  return ADVANCED_FEATURE_IDS.map((feature) => (settings[feature] ? "1" : "0")).join("");
}

export function toolHiddenByAdvancedFeature(toolName: string): boolean {
  const features = TOOL_FEATURES.get(toolName);
  return features?.some((feature) => !advancedFeatureEnabled(feature)) ?? false;
}

export function withoutHiddenTools<Tool extends { name: string }>(tools: readonly Tool[]): Tool[] {
  return tools.filter((tool) => !toolHiddenByAdvancedFeature(tool.name));
}
