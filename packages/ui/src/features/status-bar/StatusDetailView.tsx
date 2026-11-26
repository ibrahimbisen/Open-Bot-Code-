import type { LocalModelServerGpu, LocalModelServerKind, LocalModelServerStatus } from "@codebot/contracts/ipc";
import { gpuMemoryRatio, localModelServerDisplayUrl } from "@codebot/contracts/ipc";
import type { AppTextKey } from "@codebot/i18n";
import { Button, Dialog, Heading, IconButton, Progress, RefreshCw, Settings, Text, X } from "@codebot/ui";
import { createMemo, For, Show } from "solid-js";
import { useText } from "../../text";
import type { AccountUsageProviderRow } from "../account/account-usage-view";
import { UsageProviderMark } from "../usage/UsageProviderMark";
import {
  type StatusMachineEntry,
  type StatusProviderEntry,
  statusMachineEntries,
  statusProviderEntry,
} from "./status-model";

const KIND_KEYS = {
  ollama: "statusBar.machine.kind.ollama",
  lmstudio: "statusBar.machine.kind.lmstudio",
  vllm: "statusBar.machine.kind.vllm",
  openai: "statusBar.machine.kind.openai",
} as const satisfies Record<LocalModelServerKind, AppTextKey>;

export interface StatusDetailViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  providerRows: readonly AccountUsageProviderRow[];
  machines: readonly LocalModelServerStatus[];
  refreshing: boolean;
  onRefresh: () => void;
  onManageMachines?: (() => void) | undefined;
}

export function StatusDetailView(props: StatusDetailViewProps) {
  const { t } = useText();
  const providers = createMemo(() => props.providerRows.map(statusProviderEntry));
  const machines = createMemo(() => statusMachineEntries(props.machines));
  return (
    <Dialog.Root open={props.open} onOpenChange={props.onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay class="status-detail-backdrop">
          <Dialog.Content as="section" class="status-detail">
            <header class="status-detail-header">
              <div class="status-detail-heading">
                <Dialog.Title class="status-detail-title">{t("statusBar.detail.title")}</Dialog.Title>
                <Dialog.Description class="status-detail-description">
                  {t("statusBar.detail.description")}
                </Dialog.Description>
              </div>
              <div class="status-detail-actions">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={props.refreshing}
                  onClick={() => props.onRefresh()}
                >
                  <RefreshCw aria-hidden="true" />
                  {props.refreshing ? t("statusBar.detail.refreshing") : t("statusBar.detail.refresh")}
                </Button>
                <IconButton
                  label={t("statusBar.detail.close")}
                  variant="ghost"
                  onClick={() => props.onOpenChange(false)}
                >
                  <X />
                </IconButton>
              </div>
            </header>
            <div class="status-detail-body">
              <section class="status-detail-section" aria-labelledby="status-detail-providers">
                <Heading as="h3" size="sm" id="status-detail-providers">
                  {t("statusBar.detail.providers")}
                </Heading>
                <Show
                  when={providers().length > 0}
                  fallback={<Text tone="muted">{t("statusBar.detail.noProviders")}</Text>}
                >
                  <ul class="status-detail-list">
                    <For each={providers()}>{(entry) => <ProviderCard entry={entry} />}</For>
                  </ul>
                </Show>
              </section>
              <section class="status-detail-section" aria-labelledby="status-detail-machines">
                <div class="status-detail-section-head">
                  <Heading as="h3" size="sm" id="status-detail-machines">
                    {t("statusBar.detail.machines")}
                  </Heading>
                  <Show when={props.onManageMachines}>
                    {(manage) => (
                      <Button type="button" variant="ghost" size="sm" onClick={() => manage()()}>
                        <Settings aria-hidden="true" />
                        {t("statusBar.detail.manage")}
                      </Button>
                    )}
                  </Show>
                </div>
                <Show
                  when={machines().length > 0}
                  fallback={<Text tone="muted">{t("statusBar.detail.noMachines")}</Text>}
                >
                  <ul class="status-detail-list">
                    <For each={machines()}>{(entry) => <MachineCard entry={entry} />}</For>
                  </ul>
                </Show>
              </section>
            </div>
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function ProviderCard(props: { entry: StatusProviderEntry }) {
  const { t, format } = useText();
  const row = () => props.entry.row;
  return (
    <li class="status-card status-provider-card">
      <div class="status-card-head">
        <UsageProviderMark provider={row().provider} />
        <span class="status-card-name">{row().name}</span>
      </div>
      <Show
        when={row().windows.length > 0}
        fallback={
          <Text tone="muted" variant="caption">
            {row().reportsUsage ? t("statusBar.detail.unavailable") : t("statusBar.detail.notReported")}
          </Text>
        }
      >
        <ul class="status-window-list">
          <For each={row().windows}>
            {(window) => (
              <li class="status-window" data-tone={window.tone}>
                <span class="status-window-name">{window.label}</span>
                <Progress
                  class="status-window-bar"
                  value={window.remainingPercent}
                  aria-label={t("statusBar.limit.leftOf", {
                    name: window.label,
                    percent: format.percent(window.remainingPercent / 100),
                  })}
                />
                <span class="status-window-value">
                  {t("statusBar.limit.left", { percent: format.percent(window.remainingPercent / 100) })}
                </span>
                <Show when={window.resetsAtLabel}>
                  {(label) => <span class="status-window-reset">{t("statusBar.limit.resets", { time: label() })}</span>}
                </Show>
              </li>
            )}
          </For>
        </ul>
      </Show>
    </li>
  );
}

function MachineCard(props: { entry: StatusMachineEntry }) {
  const { t, format, sourceText } = useText();
  const status = () => props.entry.status;
  const time = (ms: number) =>
    format.date(new Date(ms), { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  const stateLabel = () =>
    status().state === "online"
      ? t("statusBar.machine.online")
      : status().state === "offline"
        ? t("statusBar.machine.offline")
        : t("statusBar.machine.unknown");
  const facts = () => {
    const parts: string[] = [];
    const kind = status().kind;
    if (kind) {
      const name = t(KIND_KEYS[kind]);
      parts.push(status().version ? `${name} ${status().version}` : name);
    }
    const responseMs = status().responseMs;
    if (status().state === "online" && responseMs !== null)
      parts.push(t("statusBar.machine.response", { ms: Math.round(responseMs) }));
    if (status().hasApiKey) parts.push(t("statusBar.machine.keySet"));
    return parts.join(" · ");
  };
  const footnote = () => {
    const checkedAt = status().checkedAt;
    const lastOnlineAt = status().lastOnlineAt;
    if (status().state === "online")
      return checkedAt === null ? "" : t("statusBar.machine.checked", { time: time(checkedAt) });
    return lastOnlineAt === null
      ? t("statusBar.machine.neverOnline")
      : t("statusBar.machine.lastOnline", { time: time(lastOnlineAt) });
  };
  return (
    <li class="status-card status-machine-card" data-tone={props.entry.tone}>
      <div class="status-card-head">
        <span class="status-machine-dot" data-tone={props.entry.tone} aria-hidden="true" />
        <span class="status-card-name">{status().name}</span>
        <span class="status-machine-state">{stateLabel()}</span>
      </div>
      <Text tone="muted" variant="caption" class="status-machine-url">
        {localModelServerDisplayUrl(status().baseUrl)}
      </Text>
      <Show when={facts()}>
        <Text tone="muted" variant="caption">
          {facts()}
        </Text>
      </Show>
      <Show when={status().error !== null && status().state !== "online"}>
        <Text variant="caption" class="status-machine-error" role="status">
          {sourceText(status().error ?? "")}
        </Text>
      </Show>
      <Show when={status().state === "online"}>
        <Show
          when={(status().gpus?.length ?? 0) > 0}
          fallback={
            <Text tone="muted" variant="caption">
              {status().gpuError
                ? t("statusBar.machine.gpuError", { error: sourceText(status().gpuError ?? "") })
                : t("statusBar.machine.gpuNone")}
            </Text>
          }
        >
          <ul class="status-gpu-list">
            <For each={status().gpus ?? []}>
              {(gpu) => <GpuRow gpu={gpu} many={(status().gpus?.length ?? 0) > 1} />}
            </For>
          </ul>
        </Show>
        <Show when={status().loadedModels !== null}>
          <div class="status-models">
            <span class="status-subheading">{t("statusBar.machine.loadedModels")}</span>
            <Show
              when={(status().loadedModels?.length ?? 0) > 0}
              fallback={
                <Text tone="muted" variant="caption">
                  {t("statusBar.machine.noModels")}
                </Text>
              }
            >
              <ul class="status-model-list">
                <For each={status().loadedModels ?? []}>
                  {(model) => (
                    <li class="status-model">
                      <span class="status-model-name">{model.name}</span>
                      <Show when={model.vramBytes ?? model.sizeBytes}>
                        {(size) => <span class="status-model-size">{format.fileSize(size())}</span>}
                      </Show>
                    </li>
                  )}
                </For>
              </ul>
            </Show>
          </div>
        </Show>
        <MetricsLine status={status()} />
      </Show>
      <Show when={footnote()}>
        <Text tone="muted" variant="caption">
          {footnote()}
        </Text>
      </Show>
    </li>
  );
}

function MetricsLine(props: { status: LocalModelServerStatus }) {
  const { t, format } = useText();
  const text = () => {
    const metric = (id: string) => props.status.metrics.find((entry) => entry.id === id)?.value;
    const parts: string[] = [];
    const cache = metric("kvCacheUsage");
    if (cache !== undefined) parts.push(t("statusBar.machine.kvCache", { percent: format.percent(cache) }));
    const running = metric("requestsRunning");
    const waiting = metric("requestsWaiting");
    if (running !== undefined || waiting !== undefined)
      parts.push(t("statusBar.machine.requests", { running: running ?? 0, waiting: waiting ?? 0 }));
    return parts.join(" · ");
  };
  return (
    <Show when={text()}>
      <Text tone="muted" variant="caption">
        {text()}
      </Text>
    </Show>
  );
}

function Gauge(props: { name: string; percent: number; value: string }) {
  return (
    <div class="status-gauge">
      <span class="status-gauge-name">{props.name}</span>
      <Progress class="status-gauge-bar" value={props.percent} aria-label={props.name} />
      <span class="status-gauge-value">{props.value}</span>
    </div>
  );
}

function GpuRow(props: { gpu: LocalModelServerGpu; many: boolean }) {
  const { t, format } = useText();
  const ratio = () => gpuMemoryRatio(props.gpu);
  const title = () =>
    props.gpu.name ?? (props.many ? t("statusBar.machine.gpuLabel", { index: props.gpu.index }) : null);
  return (
    <li class="status-gpu">
      <Show when={title()}>{(name) => <span class="status-subheading">{name()}</span>}</Show>
      <Show when={props.gpu.utilizationPercent !== null}>
        <Gauge
          name={t("statusBar.machine.gpuLoad")}
          percent={props.gpu.utilizationPercent ?? 0}
          value={format.percent((props.gpu.utilizationPercent ?? 0) / 100)}
        />
      </Show>
      <Show when={ratio() !== null}>
        <Gauge
          name={t("statusBar.machine.gpuMemoryLabel")}
          percent={(ratio() ?? 0) * 100}
          value={t("statusBar.machine.gpuMemory", {
            used: format.fileSizeAmount(props.gpu.memoryUsedBytes ?? 0, props.gpu.memoryTotalBytes ?? 0),
            total: format.fileSize(props.gpu.memoryTotalBytes ?? 0),
          })}
        />
      </Show>
    </li>
  );
}
