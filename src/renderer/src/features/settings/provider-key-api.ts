import type { ProviderAdminDesktopApi } from "@codebot/contracts/ipc";
import type { ProviderKeyApi } from "@codebot/ui/features/settings/OpenCodeKeyDialog";

export const providerKeyApi: ProviderKeyApi = {
  getProviderApiKeyState: (provider) => window.codebot.getProviderApiKeyState(provider),
  setProviderApiKey: (input) => window.codebot.setProviderApiKey(input),
  clearProviderApiKey: (provider) => window.codebot.clearProviderApiKey(provider),
  openExternal: (destination) => window.codebot.openExternal(destination),
};

export function hostProviderKeyApi(
  admin: () => ProviderAdminDesktopApi,
  serverId: string,
  openExternal: ProviderKeyApi["openExternal"] = (destination) => window.codebot.openExternal(destination),
): ProviderKeyApi {
  return {
    onHost: true,
    getProviderApiKeyState: (provider) => admin().getApiKeyState(provider, serverId),
    setProviderApiKey: (input) => admin().setApiKey(input, serverId),
    clearProviderApiKey: (provider) => admin().clearApiKey(provider, serverId),
    openExternal,
  };
}
