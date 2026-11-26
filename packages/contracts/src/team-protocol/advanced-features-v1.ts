import { ADVANCED_FEATURE_IDS } from "../ipc-advanced-features";
import { adminRoute, boolean, empty, fields, type OptionalRouteCodec, oneOf } from "./admin-wire";

export const ADVANCED_FEATURES_CAPABILITY = "advanced-features-v1";

export const ADVANCED_FEATURES_ROUTES = {
  settings: "/v1/host/advanced-features",
  update: "/v1/admin/host/advanced-features/update",
} as const;

const snapshot = fields({
  routines: boolean,
  channels: boolean,
  marketplace: boolean,
  chatApps: boolean,
  computerUse: boolean,
  remoteDesktop: boolean,
});

export const ADVANCED_FEATURES_CODECS: ReadonlyMap<string, OptionalRouteCodec> = new Map([
  [ADVANCED_FEATURES_ROUTES.settings, adminRoute(empty, snapshot)],
  [
    ADVANCED_FEATURES_ROUTES.update,
    adminRoute(fields({ feature: oneOf(...ADVANCED_FEATURE_IDS), enabled: boolean }), snapshot),
  ],
]);
