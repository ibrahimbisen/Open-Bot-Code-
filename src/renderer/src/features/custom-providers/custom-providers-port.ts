import type { CodeBotDesktopApi, CustomProvidersDesktopApi, ProviderAdminDesktopApi } from "@codebot/contracts/ipc";
import type { ProviderDetectionCalls } from "./stores/provider-detection-store";

export interface CustomProvidersPort {
  customProviders: CodeBotDesktopApi["customProviders"];
}

export type CustomProvidersEndpointApi = CustomProvidersDesktopApi;

export function customProvidersPort(): CustomProvidersPort {
  return window.codebot;
}

export function hostCustomProvidersApi(
  admin: () => ProviderAdminDesktopApi,
  serverId: string,
): CustomProvidersEndpointApi {
  return {
    list: () => admin().listCustomProviders(serverId),
    save: (input) => admin().saveCustomProvider(input, serverId),
    update: (input) => admin().updateCustomProvider(input, serverId),
    delete: (input) => admin().deleteCustomProvider(input, serverId),
  };
}

interface ProviderDetectionPort {
  providerDetection: CodeBotDesktopApi["providerDetection"];
}

function providerDetectionPort(): ProviderDetectionPort {
  return window.codebot;
}

export function desktopProviderDetectionCalls(serverId: string): ProviderDetectionCalls {
  const api = () => providerDetectionPort().providerDetection;
  return {
    scanModelServers: () => api().scanModelServers(serverId),
    scanAgents: () => api().scanAgents(serverId),
    discoverModels: (input) => api().discoverModels(input, serverId),
    getSettings: () => api().getSettings(serverId),
    setSettings: (settings) => api().setSettings(settings, serverId),
  };
}
