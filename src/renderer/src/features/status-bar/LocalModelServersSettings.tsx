import type { CustomProviderModel, DetectedModel } from "@codebot/contracts/ipc";
import { isLocalModelServerMachine } from "@codebot/contracts/ipc";
import {
  type LocalModelServerDraft,
  LocalModelServersPanel,
} from "@codebot/ui/features/status-bar/LocalModelServersPanel";
import { useCustomProviders } from "../custom-providers/custom-providers-context";
import { useLocalModelServers } from "./local-model-servers";

function modelsOf(models: readonly DetectedModel[]): CustomProviderModel[] {
  return models.map((model) => ({
    id: model.id,
    name: model.id,
    ...(model.contextWindow === undefined ? {} : { contextWindow: model.contextWindow }),
    ...(model.maxOutput === undefined ? {} : { maxOutput: model.maxOutput }),
    ...(model.reasoningEfforts === undefined ? {} : { reasoningEfforts: model.reasoningEfforts }),
    ...(model.inputs === undefined ? {} : { inputs: model.inputs }),
  }));
}

export function LocalModelServersSettings() {
  const machines = useLocalModelServers();
  const endpoints = useCustomProviders();

  async function submit(draft: LocalModelServerDraft): Promise<void> {
    const api = machines.api();
    const settings = {
      monitored: draft.monitored,
      ...(draft.gpuStatusUrl ? { gpuStatusUrl: draft.gpuStatusUrl } : {}),
      ...(draft.gpuStatusUrl && draft.gpuStatusUsesKey ? { gpuStatusUsesKey: true } : {}),
    };
    const tested = await api.test({
      name: draft.name,
      baseUrl: draft.baseUrl,
      apiKey: draft.apiKey,
      ...(draft.id === null ? {} : { savedProviderId: draft.id }),
      gpuStatusUrl: draft.gpuStatusUrl || null,
      gpuStatusUsesKey: draft.gpuStatusUsesKey,
    });
    if (draft.id === null) {
      await endpoints.saveCustomProvider({
        id: tested.suggestedId,
        name: draft.name,
        baseUrl: draft.baseUrl,
        apiKey: draft.apiKey,
        headers: [],
        models: modelsOf(tested.models),
      });
      await api.saveSettings({ id: tested.suggestedId, settings });
    } else {
      const saved = endpoints.customProviders().find((provider) => provider.id === draft.id);
      await endpoints.updateCustomProvider({
        id: draft.id,
        name: draft.name,
        baseUrl: draft.baseUrl,
        models: tested.online && tested.models.length > 0 ? modelsOf(tested.models) : (saved?.models ?? []),
        ...(draft.apiKey === null ? {} : { apiKey: draft.apiKey }),
      });
      await api.saveSettings({ id: draft.id, settings });
    }
    await machines.refresh();
  }

  async function remove(id: string): Promise<void> {
    await endpoints.deleteCustomProvider(id);
    await machines.refresh();
  }

  return (
    <LocalModelServersPanel
      machines={machines.statuses().filter(isLocalModelServerMachine)}
      refreshing={machines.refreshing()}
      onRefresh={() => void machines.refresh().catch(() => undefined)}
      onSubmit={submit}
      onRemove={remove}
      onTest={(input) => machines.api().test(input)}
      onScan={(host) => machines.api().scanHost({ host })}
    />
  );
}
