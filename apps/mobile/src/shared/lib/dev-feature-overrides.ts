import type { MobileFeature } from "@codebot/contracts/mobile-features";

const DEV_FEATURE_OVERRIDES: Readonly<Record<MobileFeature, boolean | null>> = {
  cloudServers: null,
  browser: null,
};

export function devFeatureOverride(feature: MobileFeature): boolean | null {
  return __DEV__ ? DEV_FEATURE_OVERRIDES[feature] : null;
}

const DEV_REPLAY_ONBOARDING = false;

export function devReplayOnboarding(): boolean {
  return __DEV__ && DEV_REPLAY_ONBOARDING;
}
