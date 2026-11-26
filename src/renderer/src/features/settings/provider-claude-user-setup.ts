import type { CodeBotDesktopApi } from "@codebot/contracts/ipc";
import type { ProviderClaudeUserSetup } from "@codebot/ui/features/settings/ProviderSettingsPage";
import { useText } from "@codebot/ui/text";
import { createHostSetting } from "./host-setting-state";

export type HostClaudeUserSetupCalls = Pick<
  CodeBotDesktopApi["hostAdmin"],
  "getClaudeUserSetup" | "setClaudeUserSetup"
>;

export interface HostClaudeUserSetupOptions {
  calls?: HostClaudeUserSetupCalls;
}

export interface ProviderClaudeUserSetupSource extends HostClaudeUserSetupOptions {
  serverId: string;
  remote: boolean;
}

export function createProviderClaudeUserSetup(
  source: () => ProviderClaudeUserSetupSource | undefined,
  status: () => unknown,
): () => ProviderClaudeUserSetup | undefined {
  const { t } = useText();
  const calls = (): HostClaudeUserSetupCalls => source()?.calls ?? window.codebot.hostAdmin;
  const setting = createHostSetting<boolean, boolean>({
    serverId: () => source()?.serverId,
    status,
    read: async (serverId) => (await calls().getClaudeUserSetup(serverId)).enabled,
    save: async (enabled, serverId) => (await calls().setClaudeUserSetup(enabled, serverId)).enabled,
    loadFailed: () => t("provider.settings.claudeUserSetupLoadFailed"),
  });
  const setup: ProviderClaudeUserSetup = {
    get value() {
      return setting.state.value;
    },
    get pending() {
      return setting.state.pending;
    },
    get error() {
      return setting.state.error;
    },
    get remote() {
      return source()?.remote === true;
    },
    onChange: (next) => void setting.choose(next),
  };
  return () => (source() ? setup : undefined);
}
