import { APP_UPDATE_FEED_URL_MAX_LENGTH, type SetAppUpdateFeedInput } from "@codebot/contracts/ipc";
import { isString } from "@codebot/contracts/runtime-values";
import { runCauseEffect } from "../../backend/effect-boundary";
import type { UpdateFeedService } from "../app-update/update-feed-service";
import { handler, type IpcGroupHandlers, payloadHandler } from "./define-ipc-group";
import { isObject } from "./validation";

export interface AppUpdateIpcDependencies {
  updateFeed: Pick<UpdateFeedService, "current" | "setSavedUrl">;
}

function parseSetAppUpdateFeedInput(input: unknown): SetAppUpdateFeedInput {
  if (!isObject(input) || (input.url !== null && !isString(input.url))) {
    throw new Error("The update server URL is required.");
  }
  if (input.url !== null && input.url.length > APP_UPDATE_FEED_URL_MAX_LENGTH) {
    throw new Error("The update server URL is too long.");
  }
  return { url: input.url };
}

export function appUpdateIpcHandlers({ updateFeed }: AppUpdateIpcDependencies): Pick<IpcGroupHandlers, "appUpdate"> {
  return {
    appUpdate: {
      getFeed: handler(() => updateFeed.current()),
      setFeedUrl: payloadHandler(parseSetAppUpdateFeedInput, ({ url }) => runCauseEffect(updateFeed.setSavedUrl(url))),
    },
  };
}
