import { APP_UPDATE_FEED_SOURCES, type AppUpdateFeed } from "@codebot/contracts/ipc";
import { decodeRecord, nullableString } from "@codebot/contracts/ipc-decoding";
import { isOneOf } from "@codebot/contracts/runtime-values";

export function decodeAppUpdateFeed(value: unknown): AppUpdateFeed {
  const feed = decodeRecord(value, "update feed");
  const { source } = feed;
  if (source !== null && !isOneOf(APP_UPDATE_FEED_SOURCES, source)) throw new Error("Invalid source.");
  return { url: nullableString(feed, "url"), source, savedUrl: nullableString(feed, "savedUrl") };
}
