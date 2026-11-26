import { ProviderLogo } from "@codebot/brand";
import { isAgentProvider } from "@codebot/contracts/ipc";
import { Show } from "solid-js";

export function UsageProviderMark(props: { provider: string }) {
  const provider = () => (isAgentProvider(props.provider) ? props.provider : null);
  return (
    <Show when={provider()}>{(value) => <ProviderLogo provider={value()} class="agent-usage-provider-icon" />}</Show>
  );
}
