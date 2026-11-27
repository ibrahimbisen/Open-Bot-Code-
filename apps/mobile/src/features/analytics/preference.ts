import { create } from "zustand";
import { mobileAnalytics } from "./mobile-analytics";

export const useAnalyticsPreference = create<{ enabled: boolean; ready: boolean; saving: boolean }>(() => ({
  enabled: false,
  ready: false,
  saving: false,
}));

export function loadAnalyticsPreference(): Promise<void> {
  mobileAnalytics.setEnabled(false);
  useAnalyticsPreference.setState({ enabled: false, ready: true });
  return Promise.resolve();
}
