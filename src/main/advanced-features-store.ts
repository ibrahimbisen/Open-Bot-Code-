import {
  type AdvancedFeatureSettings,
  DEFAULT_ADVANCED_FEATURES,
  normalizeAdvancedFeatures,
  type SetAdvancedFeatureInput,
} from "@codebot/contracts/ipc";
import { isDynamicRecord } from "@codebot/contracts/runtime-values";
import { Effect } from "effect";
import { PreferenceStore } from "./preference-file";

export const ADVANCED_FEATURES_PREFERENCE_FILE = "codebot-advanced-features-v1.json";

export type AdvancedFeaturesPreferenceStore = PreferenceStore<AdvancedFeatureSettings>;

export function createAdvancedFeaturesPreferenceStore(path: string): AdvancedFeaturesPreferenceStore {
  return new PreferenceStore({
    path,
    defaultValue: { ...DEFAULT_ADVANCED_FEATURES },
    decode: (parsed) => (isDynamicRecord(parsed) && parsed.version === 1 ? normalizeAdvancedFeatures(parsed) : null),
  });
}

export type AdvancedFeaturesControl = ReturnType<typeof advancedFeaturesControl>;

export function advancedFeaturesControl(store: AdvancedFeaturesPreferenceStore) {
  return {
    get: (): AdvancedFeatureSettings => store.get(),
    set: Effect.fn("AdvancedFeatures.set")(function* ({ feature, enabled }: SetAdvancedFeatureInput) {
      return yield* store.update((current) => ({ ...current, [feature]: enabled }));
    }),
  };
}
