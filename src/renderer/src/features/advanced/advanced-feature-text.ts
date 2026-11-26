import type { AdvancedFeatureId } from "@codebot/contracts/ipc";
import type { AppTextKey } from "@codebot/i18n";

export const ADVANCED_FEATURE_TEXT: Readonly<
  Record<AdvancedFeatureId, { title: AppTextKey; description: AppTextKey }>
> = {
  routines: { title: "advanced.routines.title", description: "advanced.routines.description" },
  channels: { title: "advanced.channels.title", description: "advanced.channels.description" },
  marketplace: { title: "advanced.marketplace.title", description: "advanced.marketplace.description" },
  chatApps: { title: "advanced.chatApps.title", description: "advanced.chatApps.description" },
  computerUse: { title: "advanced.computerUse.title", description: "advanced.computerUse.description" },
  remoteDesktop: { title: "advanced.remoteDesktop.title", description: "advanced.remoteDesktop.description" },
};
