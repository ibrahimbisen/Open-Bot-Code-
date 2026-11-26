import {
  type AdvancedFeatureSettings,
  DEFAULT_ADVANCED_FEATURES,
  type HostAdminDesktopApi,
} from "@codebot/contracts/ipc";

export function createMockAdvancedFeatures(): Pick<HostAdminDesktopApi, "getAdvancedFeatures" | "setAdvancedFeature"> {
  let settings: AdvancedFeatureSettings = { ...DEFAULT_ADVANCED_FEATURES };
  return {
    getAdvancedFeatures: async () => ({ ...settings }),
    setAdvancedFeature: async ({ feature, enabled }) => {
      settings = { ...settings, [feature]: enabled };
      return { ...settings };
    },
  };
}
