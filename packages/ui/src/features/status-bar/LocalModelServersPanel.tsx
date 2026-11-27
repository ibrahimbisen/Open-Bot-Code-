import type {
  LocalModelServerCandidate,
  LocalModelServerKind,
  LocalModelServerStatus,
  LocalModelServerTestInput,
  LocalModelServerTestResult,
} from "@codebot/contracts/ipc";
import { isGpuStatusUrl, localModelServerDisplayUrl, sameCustomProviderOrigin } from "@codebot/contracts/ipc";
import type { AppTextKey } from "@codebot/i18n";
import {
  Button,
  ConfirmDialog,
  Dialog,
  Field,
  IconButton,
  Input,
  Pencil,
  Plus,
  RefreshCw,
  SettingsSection,
  SwitchField,
  Text,
  Trash2,
  X,
} from "@codebot/ui";
import { createSignal, createStore, For, Show } from "solid-js";
import { useText } from "../../text";
import { endpointUrlError } from "../custom-providers/custom-provider-form";

const KIND_KEYS = {
  ollama: "statusBar.machine.kind.ollama",
  lmstudio: "statusBar.machine.kind.lmstudio",
  vllm: "statusBar.machine.kind.vllm",
  openai: "statusBar.machine.kind.openai",
} as const satisfies Record<LocalModelServerKind, AppTextKey>;

export interface LocalModelServerDraft {
  id: string | null;
  name: string;
  baseUrl: string;
  apiKey: string | null;
  gpuStatusUrl: string;
  gpuStatusUsesKey: boolean;
  monitored: boolean;
}

export interface LocalModelServersPanelProps {
  machines: readonly LocalModelServerStatus[];
  refreshing: boolean;
  onRefresh: () => void;
  onSubmit: (draft: LocalModelServerDraft) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
  onTest: (input: LocalModelServerTestInput) => Promise<LocalModelServerTestResult>;
  onScan: (host: string) => Promise<LocalModelServerCandidate[]>;
}

const EMPTY_DRAFT: LocalModelServerDraft = {
  id: null,
  name: "",
  baseUrl: "",
  apiKey: null,
  gpuStatusUrl: "",
  gpuStatusUsesKey: false,
  monitored: true,
};

function draftOf(status: LocalModelServerStatus): LocalModelServerDraft {
  return {
    id: status.id,
    name: status.name,
    baseUrl: status.baseUrl,
    apiKey: null,
    gpuStatusUrl: status.settings.gpuStatusUrl ?? "",
    gpuStatusUsesKey: status.settings.gpuStatusUsesKey === true,
    monitored: status.monitored,
  };
}

interface ScanState {
  host: string;
  scanning: boolean;
  searched: boolean;
  error: string | null;
  found: LocalModelServerCandidate[];
}

interface FormState {
  name: string;
  baseUrl: string;
  apiKey: string;
  gpuStatusUrl: string;
  gpuStatusUsesKey: boolean;
  monitored: boolean;
  touched: boolean;
  saving: boolean;
  testing: boolean;
  error: string | null;
  result: LocalModelServerTestResult | null;
  testError: string | null;
}

export function LocalModelServersPanel(props: LocalModelServersPanelProps) {
  const { t, errorMessage } = useText();
  const [editing, setEditing] = createSignal<{ draft: LocalModelServerDraft; hasKey: boolean } | null>(null);
  const [removing, setRemoving] = createSignal<LocalModelServerStatus | null>(null);
  const [removeError, setRemoveError] = createSignal<string | null>(null);
  const [scan, setScan] = createStore<ScanState>({
    host: "",
    scanning: false,
    searched: false,
    error: null,
    found: [],
  });

  async function runScan(): Promise<void> {
    if (scan.scanning || !scan.host.trim()) return;
    setScan((state) => {
      state.scanning = true;
      state.error = null;
    });
    try {
      const found = await props.onScan(scan.host.trim());
      setScan((state) => {
        state.found = found;
        state.searched = true;
      });
    } catch (error) {
      setScan((state) => {
        state.error = errorMessage(error, t("localServer.scan.none"));
        state.found = [];
      });
    } finally {
      setScan((state) => {
        state.scanning = false;
      });
    }
  }

  async function confirmRemove(): Promise<void> {
    const target = removing();
    if (!target) return;
    try {
      await props.onRemove(target.id);
      setRemoving(null);
      setRemoveError(null);
    } catch (error) {
      setRemoveError(errorMessage(error, t("localServer.remove.failed")));
    }
  }

  return (
    <div class="local-servers">
      <SettingsSection
        title={t("localServer.settings.title")}
        description={t("localServer.settings.description")}
        actions={
          <>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={props.refreshing}
              onClick={() => props.onRefresh()}
            >
              <RefreshCw aria-hidden="true" />
              {t("localServer.settings.refresh")}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEditing({ draft: EMPTY_DRAFT, hasKey: false })}
            >
              <Plus aria-hidden="true" />
              {t("localServer.settings.add")}
            </Button>
          </>
        }
      >
        <Show
          when={props.machines.length > 0}
          fallback={
            <Text tone="muted" variant="caption">
              {t("localServer.settings.empty")}
            </Text>
          }
        >
          <ul class="local-servers-list">
            <For each={props.machines}>
              {(machine) => (
                <li class="local-servers-row" data-state={machine.state}>
                  <span class="local-servers-dot" aria-hidden="true" />
                  <span class="local-servers-text">
                    <span class="local-servers-name">{machine.name}</span>
                    <span class="local-servers-url">{localModelServerDisplayUrl(machine.baseUrl)}</span>
                    <span class="local-servers-facts">
                      <MachineFacts machine={machine} />
                    </span>
                  </span>
                  <IconButton
                    label={t("localServer.settings.edit", { name: machine.name })}
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setEditing({ draft: draftOf(machine), hasKey: machine.hasApiKey })}
                  >
                    <Pencil />
                  </IconButton>
                  <IconButton
                    label={t("localServer.settings.remove", { name: machine.name })}
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => {
                      setRemoveError(null);
                      setRemoving(machine);
                    }}
                  >
                    <Trash2 />
                  </IconButton>
                </li>
              )}
            </For>
          </ul>
        </Show>
      </SettingsSection>
      <SettingsSection title={t("localServer.scan.title")} description={t("localServer.scan.description")}>
        <form
          class="local-servers-scan"
          onSubmit={(event) => {
            event.preventDefault();
            void runScan();
          }}
        >
          <Field label={t("localServer.scan.host")} class="local-servers-scan-field">
            <Input
              value={scan.host}
              placeholder={t("localServer.scan.placeholder")}
              maxlength={255}
              spellcheck={false}
              onInput={(event) =>
                setScan((state) => {
                  state.host = event.currentTarget.value;
                })
              }
            />
          </Field>
          <Button type="submit" variant="outline" disabled={scan.scanning || !scan.host.trim()}>
            {scan.scanning ? t("localServer.scan.scanning") : t("localServer.scan.action")}
          </Button>
        </form>
        <Show when={scan.error}>
          {(message) => (
            <Text tone="danger" variant="caption" role="alert">
              {message()}
            </Text>
          )}
        </Show>
        <Show when={scan.searched && scan.found.length === 0 && !scan.error}>
          <Text tone="muted" variant="caption" role="status">
            {t("localServer.scan.none")}
          </Text>
        </Show>
        <Show when={scan.found.length > 0}>
          <ul class="local-servers-list">
            <For each={scan.found}>
              {(candidate) => (
                <li class="local-servers-row">
                  <span class="local-servers-text">
                    <span class="local-servers-name">{candidate.name}</span>
                    <span class="local-servers-url">{localModelServerDisplayUrl(candidate.baseUrl)}</span>
                    <span class="local-servers-facts">
                      {candidate.needsKey
                        ? t("localServer.scan.needsKey")
                        : t("localServer.settings.models", { count: candidate.models.length })}
                    </span>
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    aria-label={t("localServer.scan.add", { name: candidate.name })}
                    onClick={() =>
                      setEditing({
                        draft: { ...EMPTY_DRAFT, name: candidate.name, baseUrl: candidate.baseUrl },
                        hasKey: false,
                      })
                    }
                  >
                    {t("common.add")}
                  </Button>
                </li>
              )}
            </For>
          </ul>
        </Show>
      </SettingsSection>
      <Show when={editing()}>
        {(state) => (
          <LocalModelServerDialog
            initial={state().draft}
            hasSavedKey={state().hasKey}
            onClose={() => setEditing(null)}
            onSubmit={props.onSubmit}
            onTest={props.onTest}
          />
        )}
      </Show>
      <Show when={removing()}>
        {(machine) => (
          <ConfirmDialog
            open
            title={t("localServer.remove.title", { name: machine().name })}
            description={t("localServer.remove.description")}
            confirmLabel={t("common.remove")}
            error={removeError()}
            onCancel={() => setRemoving(null)}
            onConfirm={confirmRemove}
          />
        )}
      </Show>
    </div>
  );
}

function MachineFacts(props: { machine: LocalModelServerStatus }) {
  const { t } = useText();
  const parts = () => {
    const machine = props.machine;
    const list: string[] = [];
    list.push(
      machine.state === "online"
        ? t("statusBar.machine.online")
        : machine.state === "offline"
          ? t("statusBar.machine.offline")
          : machine.state === "off"
            ? t("localServer.settings.statusOff")
            : t("statusBar.machine.unknown"),
    );
    if (machine.kind) list.push(t(KIND_KEYS[machine.kind]));
    if (machine.availableModels !== null)
      list.push(t("localServer.settings.models", { count: machine.availableModels }));
    return list.join(" · ");
  };
  return <>{parts()}</>;
}

interface DialogProps {
  initial: LocalModelServerDraft;
  hasSavedKey: boolean;
  onClose: () => void;
  onSubmit: (draft: LocalModelServerDraft) => Promise<void>;
  onTest: (input: LocalModelServerTestInput) => Promise<LocalModelServerTestResult>;
}

function LocalModelServerDialog(props: DialogProps) {
  const { t, errorMessage, sourceText } = useText();
  const [form, setForm] = createStore<FormState>({
    name: props.initial.name,
    baseUrl: props.initial.baseUrl,
    apiKey: "",
    gpuStatusUrl: props.initial.gpuStatusUrl,
    gpuStatusUsesKey: props.initial.gpuStatusUsesKey,
    monitored: props.initial.monitored,
    touched: false,
    saving: false,
    testing: false,
    error: null,
    result: null,
    testError: null,
  });
  const gpuUrl = () => form.gpuStatusUrl.trim();
  const errors = () => ({
    name: form.name.trim() ? undefined : t("localServer.error.nameRequired"),
    baseUrl: endpointUrlError(form.baseUrl, t),
    gpuUrl: gpuUrl() && !isGpuStatusUrl(gpuUrl()) ? t("localServer.error.gpuUrlInvalid") : undefined,
    gpuKey:
      form.gpuStatusUsesKey &&
      gpuUrl() &&
      isGpuStatusUrl(gpuUrl()) &&
      !sameCustomProviderOrigin(gpuUrl(), form.baseUrl.trim())
        ? t("localServer.error.gpuKeyOtherOrigin")
        : undefined,
  });
  const invalid = () => Object.values(errors()).some(Boolean);
  const shown = <Key extends keyof ReturnType<typeof errors>>(key: Key) => (form.touched ? errors()[key] : undefined);

  async function test(): Promise<void> {
    setForm((state) => {
      state.touched = true;
    });
    if (invalid() || form.testing) return;
    setForm((state) => {
      state.testing = true;
      state.result = null;
      state.testError = null;
    });
    try {
      const result = await props.onTest({
        name: form.name.trim(),
        baseUrl: form.baseUrl.trim(),
        apiKey: form.apiKey.trim() || null,
        ...(props.initial.id === null ? {} : { savedProviderId: props.initial.id }),
        gpuStatusUrl: gpuUrl() || null,
        gpuStatusUsesKey: form.gpuStatusUsesKey && gpuUrl() !== "",
      });
      setForm((state) => {
        state.result = result;
      });
    } catch (error) {
      setForm((state) => {
        state.testError = errorMessage(error, t("localServer.dialog.saveFailed"));
      });
    } finally {
      setForm((state) => {
        state.testing = false;
      });
    }
  }

  async function save(): Promise<void> {
    setForm((state) => {
      state.touched = true;
    });
    if (invalid() || form.saving) return;
    setForm((state) => {
      state.saving = true;
      state.error = null;
    });
    try {
      await props.onSubmit({
        id: props.initial.id,
        name: form.name.trim(),
        baseUrl: form.baseUrl.trim(),
        apiKey: form.apiKey.trim() || null,
        gpuStatusUrl: gpuUrl(),
        gpuStatusUsesKey: form.gpuStatusUsesKey && gpuUrl() !== "",
        monitored: form.monitored,
      });
      props.onClose();
    } catch (error) {
      setForm((state) => {
        state.error = errorMessage(error, t("localServer.dialog.saveFailed"));
        state.saving = false;
      });
    }
  }

  const testSummary = () => {
    const result = form.result;
    if (!result) return null;
    if (!result.online) return t("localServer.test.offline", { error: sourceText(result.error ?? "") });
    const models = t("localServer.settings.models", { count: result.models.length });
    return result.kind
      ? t("localServer.test.onlineKind", { kind: t(KIND_KEYS[result.kind]), models })
      : t("localServer.test.online", { models });
  };

  return (
    <Dialog.Root open onOpenChange={(open) => !open && !form.saving && props.onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay class="status-detail-backdrop">
          <Dialog.Content as="section" class="status-detail local-server-dialog">
            <header class="status-detail-header">
              <div class="status-detail-heading">
                <Dialog.Title class="status-detail-title">
                  {props.initial.id === null
                    ? t("localServer.dialog.addTitle")
                    : t("localServer.dialog.editTitle", { name: props.initial.name })}
                </Dialog.Title>
                <Dialog.Description class="status-detail-description">
                  {t("localServer.dialog.description")}
                </Dialog.Description>
              </div>
              <IconButton label={t("statusBar.detail.close")} variant="ghost" onClick={() => props.onClose()}>
                <X />
              </IconButton>
            </header>
            <form
              class="status-detail-body local-server-form"
              onSubmit={(event) => {
                event.preventDefault();
                void save();
              }}
            >
              <Field label={t("localServer.field.name")} error={shown("name")} required>
                <Input
                  value={form.name}
                  placeholder={t("localServer.field.namePlaceholder")}
                  maxlength={160}
                  onInput={(event) =>
                    setForm((state) => {
                      state.name = event.currentTarget.value;
                    })
                  }
                />
              </Field>
              <Field label={t("localServer.field.baseUrl")} error={shown("baseUrl")} required>
                <Input
                  value={form.baseUrl}
                  placeholder={t("localServer.field.baseUrlPlaceholder")}
                  spellcheck={false}
                  onInput={(event) =>
                    setForm((state) => {
                      state.baseUrl = event.currentTarget.value;
                    })
                  }
                />
              </Field>
              <Field
                label={t("localServer.field.apiKey")}
                description={props.hasSavedKey ? t("localServer.field.apiKeyKept") : undefined}
              >
                <Input
                  type="password"
                  autocomplete="off"
                  value={form.apiKey}
                  spellcheck={false}
                  onInput={(event) =>
                    setForm((state) => {
                      state.apiKey = event.currentTarget.value;
                    })
                  }
                />
              </Field>
              <Field
                label={t("localServer.field.gpuUrl")}
                description={t("localServer.field.gpuUrlHelp")}
                error={shown("gpuUrl")}
              >
                <Input
                  value={form.gpuStatusUrl}
                  placeholder={t("localServer.field.gpuUrlPlaceholder")}
                  spellcheck={false}
                  onInput={(event) =>
                    setForm((state) => {
                      state.gpuStatusUrl = event.currentTarget.value;
                    })
                  }
                />
              </Field>
              <Show when={gpuUrl() !== ""}>
                <SwitchField
                  checked={form.gpuStatusUsesKey}
                  onChange={(checked) =>
                    setForm((state) => {
                      state.gpuStatusUsesKey = checked;
                    })
                  }
                  label={t("localServer.field.gpuUsesKey")}
                  description={shown("gpuKey") ?? t("localServer.field.gpuUsesKeyHelp")}
                />
              </Show>
              <SwitchField
                checked={form.monitored}
                onChange={(checked) =>
                  setForm((state) => {
                    state.monitored = checked;
                  })
                }
                label={t("localServer.field.monitored")}
                description={t("localServer.field.monitoredHelp")}
              />
              <div class="local-server-test">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={form.testing || form.saving}
                  onClick={() => void test()}
                >
                  {form.testing ? t("localServer.test.testing") : t("localServer.test.action")}
                </Button>
                <Show when={testSummary()}>
                  {(summary) => (
                    <Text
                      variant="caption"
                      tone={form.result?.online ? "success" : "danger"}
                      role="status"
                      class="local-server-test-result"
                    >
                      {summary()}
                    </Text>
                  )}
                </Show>
                <Show when={form.result?.online && form.result.gpus}>
                  {(gpus) => (
                    <Text variant="caption" tone="muted" role="status">
                      {t("localServer.test.gpuFound", {
                        count: t("localServer.test.gpuCount", { count: gpus().length }),
                      })}
                    </Text>
                  )}
                </Show>
                <Show when={form.result?.online && form.result.gpuError}>
                  {(error) => (
                    <Text variant="caption" tone="warning" role="status">
                      {t("localServer.test.gpuFailed", { error: sourceText(error()) })}
                    </Text>
                  )}
                </Show>
                <Show when={form.testError}>
                  {(message) => (
                    <Text variant="caption" tone="danger" role="alert">
                      {message()}
                    </Text>
                  )}
                </Show>
              </div>
              <Show when={form.error}>
                {(message) => (
                  <Text tone="danger" variant="caption" role="alert">
                    {message()}
                  </Text>
                )}
              </Show>
              <div class="local-server-actions">
                <Button type="button" variant="ghost" disabled={form.saving} onClick={() => props.onClose()}>
                  {t("common.cancel")}
                </Button>
                <Button type="submit" variant="default" disabled={form.saving}>
                  {form.saving ? t("localServer.dialog.saving") : t("common.save")}
                </Button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
