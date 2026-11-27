import type { AppUpdateFeed, CodeBotDesktopApi } from "@codebot/contracts/ipc";
import { sourceText } from "@codebot/i18n/source";

export interface MockAppUpdateOptions {
  updateFeed?: AppUpdateFeed;
}

const BUILD_FEED: AppUpdateFeed = {
  url: "https://home.example.test/codebot-updates/",
  source: "build",
  savedUrl: null,
};

export function createMockAppUpdate(options: MockAppUpdateOptions): CodeBotDesktopApi["appUpdate"] {
  const fallback = options.updateFeed ?? BUILD_FEED;
  let savedUrl = fallback.savedUrl;
  const feed = (): AppUpdateFeed => {
    if (savedUrl !== null) return { url: savedUrl, source: "settings", savedUrl };
    return fallback.source === "settings" ? { url: null, source: null, savedUrl: null } : { ...fallback };
  };
  return {
    getFeed: async () => feed(),
    setFeedUrl: async ({ url }) => {
      const text = url?.trim() ?? "";
      if (text !== "" && !URL.canParse(text)) throw new Error(sourceText("error.appUpdate.urlInvalid"));
      if (text === "") {
        savedUrl = null;
        return feed();
      }
      const parsed = new URL(text);
      if (parsed.username !== "" || parsed.password !== "") {
        throw new Error(sourceText("error.appUpdate.urlCredentials"));
      }
      if (parsed.protocol !== "https:") throw new Error(sourceText("error.appUpdate.urlInsecure"));
      if (!parsed.pathname.endsWith("/")) parsed.pathname += "/";
      savedUrl = parsed.toString();
      return feed();
    },
  };
}
