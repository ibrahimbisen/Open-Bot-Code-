import type { LocalModelServerStatus } from "@codebot/contracts/ipc";
import { Button, Progress } from "@codebot/ui";
import { createMemo, For, Show } from "solid-js";
import { useText } from "../../text";
import type { AccountUsageProviderRow } from "../account/account-usage-view";
import { UsageProviderMark } from "../usage/UsageProviderMark";
import {
  type StatusLimitWindow,
  type StatusMachineEntry,
  statusMachineEntries,
  statusProviderEntries,
} from "./status-model";

const MAX_PROVIDER_ROWS = 4;
const MAX_MACHINE_ROWS = 3;

export interface StatusFooterProps {
  providerRows: readonly AccountUsageProviderRow[];
  machines: readonly LocalModelServerStatus[];
  onOpen: () => void;
}

export function StatusFooter(props: StatusFooterProps) {
  const { t } = useText();
  const providers = createMemo(() => statusProviderEntries(props.providerRows));
  const machines = createMemo(() => statusMachineEntries(props.machines));
  const hiddenCount = () =>
    Math.max(0, providers().length - MAX_PROVIDER_ROWS) + Math.max(0, machines().length - MAX_MACHINE_ROWS);
  const summary = () => {
    const parts: string[] = [];
    if (providers().length > 0) parts.push(t("statusBar.summary.limits", { count: providers().length }));
    if (machines().length > 0)
      parts.push(
        t("statusBar.summary.machines", {
          online: machines().filter((machine) => machine.status.state === "online").length,
          total: machines().length,
        }),
      );
    return parts.join(", ");
  };
  return (
    <Show when={providers().length > 0 || machines().length > 0}>
      <Button
        type="button"
        variant="ghost"
        class="status-footer"
        aria-label={t("statusBar.open", { summary: summary() })}
        onClick={() => props.onOpen()}
      >
        <For each={providers().slice(0, MAX_PROVIDER_ROWS)}>
          {(entry) => (
            <span class="status-footer-row status-footer-provider">
              <UsageProviderMark provider={entry.row.provider} />
              <span class="status-footer-name">{entry.row.name}</span>
              <LimitMeter label={t("statusBar.limit.fiveHour")} window={entry.fiveHour} />
              <LimitMeter label={t("statusBar.limit.weekly")} window={entry.weekly} />
            </span>
          )}
        </For>
        <For each={machines().slice(0, MAX_MACHINE_ROWS)}>{(entry) => <MachineRow entry={entry} />}</For>
        <Show when={hiddenCount() > 0}>
          <span class="status-footer-more">{t("statusBar.more", { count: hiddenCount() })}</span>
        </Show>
      </Button>
    </Show>
  );
}

export function LimitMeter(props: { label: string; window: StatusLimitWindow | null }) {
  const { t, format } = useText();
  return (
    <span class="status-limit" data-tone={props.window?.tone ?? "none"} data-empty={props.window ? undefined : ""}>
      <span class="status-limit-label">{props.label}</span>
      <Show when={props.window} fallback={<span class="status-limit-value">{"-"}</span>}>
        {(window) => (
          <>
            <Progress
              class="status-limit-bar"
              value={window().remainingPercent}
              aria-label={t("statusBar.limit.leftOf", {
                name: props.label,
                percent: format.percent(window().remainingPercent / 100),
              })}
            />
            <span class="status-limit-value">{format.percent(window().remainingPercent / 100)}</span>
          </>
        )}
      </Show>
    </span>
  );
}

function MachineRow(props: { entry: StatusMachineEntry }) {
  const { t, format } = useText();
  const status = () => props.entry.status;
  const detail = () => {
    if (status().state === "offline") return t("statusBar.machine.offline");
    if (status().state !== "online") return t("statusBar.machine.unknown");
    const parts: string[] = [];
    const gpu = props.entry.gpu;
    if (gpu.utilizationPercent !== null)
      parts.push(t("statusBar.machine.gpu", { percent: format.percent(gpu.utilizationPercent / 100) }));
    if (gpu.memoryUsedBytes !== null && gpu.memoryTotalBytes !== null)
      parts.push(format.fileSizeAmount(gpu.memoryUsedBytes, gpu.memoryTotalBytes));
    if (props.entry.loadedCount !== null) parts.push(t("statusBar.machine.models", { count: props.entry.loadedCount }));
    return parts.length > 0 ? parts.join(" · ") : t("statusBar.machine.online");
  };
  return (
    <span class="status-footer-row status-footer-machine" data-tone={props.entry.tone}>
      <span class="status-machine-dot" data-tone={props.entry.tone} aria-hidden="true" />
      <span class="status-footer-name">{status().name}</span>
      <span class="status-machine-detail">{detail()}</span>
    </span>
  );
}
