import { IPC_ENDPOINTS, LOCAL_MODEL_SERVER_LIMITS } from "@codebot/contracts/ipc";
import { BrowserWindow } from "electron";
import { runCauseEffect } from "../../backend/effect-boundary";
import type { CustomProviderStore } from "../custom-provider-store";
import type { LocalModelServerMonitor, MonitorSubscription } from "../local-model-servers/monitor";
import { sendToRenderer } from "../renderer-ipc";
import { eventPayloadHandler, handler, type IpcGroupHandlers, payloadHandler } from "./define-ipc-group";
import {
  parseLocalModelServerRefresh,
  parseLocalModelServerScan,
  parseLocalModelServerTest,
  parseLocalModelServerWatch,
  parseSaveLocalModelServerSettings,
} from "./local-model-servers-inputs";

export interface LocalModelServersIpcDependencies {
  monitor: LocalModelServerMonitor;
  customProviders: Pick<CustomProviderStore, "setLocalServerSettings">;
}

export function localModelServersIpcHandlers({
  monitor,
  customProviders,
}: LocalModelServersIpcDependencies): Pick<IpcGroupHandlers, "localModelServers"> {
  const watches = new Map<string, MonitorSubscription>();
  return {
    localModelServers: {
      list: handler(() => monitor.statuses()),
      refresh: payloadHandler(parseLocalModelServerRefresh, ({ id }) => runCauseEffect(monitor.refresh(id))),
      watch: eventPayloadHandler(parseLocalModelServerWatch, (event, { watchId, mode }) => {
        const key = `${event.sender.id}:${watchId}`;
        const existing = watches.get(key);
        if (mode === "off") {
          existing?.close();
          watches.delete(key);
          return;
        }
        if (existing) {
          existing.setVisibility(mode);
          return;
        }
        if (watches.size >= LOCAL_MODEL_SERVER_LIMITS.watches) return;
        const sender = event.sender;
        const subscription = monitor.subscribe((statuses) => {
          sendToRenderer(BrowserWindow.fromWebContents(sender), IPC_ENDPOINTS.localModelServers.statuses, statuses);
        }, mode);
        watches.set(key, subscription);
        sender.once("destroyed", () => {
          subscription.close();
          watches.delete(key);
        });
      }),
      test: payloadHandler(parseLocalModelServerTest, (input) => runCauseEffect(monitor.test(input))),
      scanHost: payloadHandler(parseLocalModelServerScan, ({ host }) => runCauseEffect(monitor.scanHost(host))),
      saveSettings: payloadHandler(parseSaveLocalModelServerSettings, async ({ id, settings }) => {
        await runCauseEffect(customProviders.setLocalServerSettings(id, settings));
        return runCauseEffect(monitor.refresh(null));
      }),
    },
  };
}
