import type { SettingsCrumb } from "@codebot/ui/features/settings/SettingsDialogShell";
import { type VaultAgentChoice, VaultPanel } from "@codebot/ui/features/vault/VaultPanel";
import { useText } from "@codebot/ui/text";
import { createEffect, createSignal, onSettled, Show } from "solid-js";
import { actionToast } from "../../action-toast";
import type { VaultStore } from "./stores/vault-store";

type VaultAgent = VaultAgentChoice;

export interface ServerVaultOptions {
  store: VaultStore;
  apiKeys: boolean;
  twoStep: boolean;
  listAgents?: (() => Promise<readonly VaultAgent[]>) | undefined;
}

export function ServerVaultPanel(
  props: ServerVaultOptions & {
    menuMount: HTMLElement | undefined;
    onDetailChange?: ((detail: SettingsCrumb | null) => void) | undefined;
  },
) {
  const { t, errorMessage } = useText();
  const [agents, setAgents] = createSignal<readonly VaultAgent[]>([]);
  let request = 0;
  createEffect(
    () => props.listAgents,
    (listAgents) => {
      const current = ++request;
      setAgents([]);
      listAgents?.().then(
        (list) => {
          if (current === request) setAgents(list);
        },
        () => undefined,
      );
    },
  );
  onSettled(() => {
    const store = props.store;
    const unsubscribe = store.subscribe();
    store.refresh().catch((error: unknown) => actionToast.error(errorMessage(error, t("vault.loadFailed"))));
    return () => {
      unsubscribe();
    };
  });
  const onCodes = () => (props.twoStep ? props.store.codes : undefined);
  return (
    <Show when={props.store.state.vault}>
      {(vault) => (
        <VaultPanel
          state={vault()}
          apiKeys={props.apiKeys}
          agents={agents()}
          onCodes={onCodes()}
          onSave={props.store.save}
          onDelete={props.store.remove}
          onReveal={props.store.reveal}
          onCopy={async (request) => {
            await props.store.copy(request);
            actionToast.success(t("vault.copied"));
          }}
          onCopyText={async (value) => {
            await navigator.clipboard.writeText(value);
            actionToast.success(t("vault.copied"));
          }}
          onImportCsv={props.store.importCsv}
          onReset={props.store.reset}
          menuMount={props.menuMount}
          onDetailChange={props.onDetailChange}
        />
      )}
    </Show>
  );
}
