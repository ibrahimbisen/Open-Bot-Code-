import { isBoolean, isDynamicRecord, isOneOf } from "./runtime-values";

export const ADVANCED_FEATURE_IDS = [
  "routines",
  "channels",
  "marketplace",
  "chatApps",
  "computerUse",
  "remoteDesktop",
] as const;

export type AdvancedFeatureId = (typeof ADVANCED_FEATURE_IDS)[number];

export type AdvancedFeatureSettings = Record<AdvancedFeatureId, boolean>;

export interface SetAdvancedFeatureInput {
  feature: AdvancedFeatureId;
  enabled: boolean;
}

export const DEFAULT_ADVANCED_FEATURES: Readonly<AdvancedFeatureSettings> = {
  routines: false,
  channels: false,
  marketplace: false,
  chatApps: false,
  computerUse: false,
  remoteDesktop: false,
};

export function isAdvancedFeatureId(value: unknown): value is AdvancedFeatureId {
  return isOneOf(ADVANCED_FEATURE_IDS, value);
}

export function normalizeAdvancedFeatures(value: unknown): AdvancedFeatureSettings {
  const source = isDynamicRecord(value) ? value : {};
  const next = { ...DEFAULT_ADVANCED_FEATURES };
  for (const id of ADVANCED_FEATURE_IDS) if (source[id] === true) next[id] = true;
  return next;
}

export function decodeAdvancedFeatureSettings(value: unknown): AdvancedFeatureSettings {
  if (!isDynamicRecord(value) || ADVANCED_FEATURE_IDS.some((id) => !isBoolean(value[id])))
    throw new Error("Invalid advanced features.");
  return normalizeAdvancedFeatures(value);
}

export function decodeSetAdvancedFeatureInput(value: unknown): SetAdvancedFeatureInput {
  if (!isDynamicRecord(value) || !isAdvancedFeatureId(value.feature) || !isBoolean(value.enabled))
    throw new Error("Invalid advanced feature change.");
  return { feature: value.feature, enabled: value.enabled };
}
