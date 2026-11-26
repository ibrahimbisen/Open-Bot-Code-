export const APP_UPDATE_FEED_SOURCES = ["settings", "environment", "build"] as const;

export type AppUpdateFeedSource = (typeof APP_UPDATE_FEED_SOURCES)[number];

export interface AppUpdateFeed {
  url: string | null;
  source: AppUpdateFeedSource | null;
  savedUrl: string | null;
}

export interface SetAppUpdateFeedInput {
  url: string | null;
}

export const APP_UPDATE_FEED_URL_MAX_LENGTH = 2_048;
