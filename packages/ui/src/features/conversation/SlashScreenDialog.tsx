import { Button, Check, Dialog, IconButton, LoaderCircle, X } from "@codebot/ui";
import { For, Show } from "solid-js";
import { useText } from "../../text";

export interface SlashScreenOption {
  id: string;
  label: string;
  description?: string | undefined;
  meta?: string | undefined;
  badge?: string | undefined;
  current: boolean;
  disabled?: boolean | undefined;
}

export interface SlashScreenDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  options: readonly SlashScreenOption[];
  status: "loading" | "ready" | "failed";
  emptyText: string;
  failedText: string;
  busyId: string | null;
  error: string | null;
  onChoose: (id: string) => void;
  onRetry?: (() => void) | undefined;
}

export function SlashScreenDialog(props: SlashScreenDialogProps) {
  const { t } = useText();
  return (
    <Dialog.Root open={props.open} onOpenChange={props.onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay class="custom-provider-backdrop provider-more-backdrop">
          <Dialog.Content as="section" class="custom-provider-dialog provider-more-dialog slash-screen">
            <header class="provider-more-header">
              <Dialog.Title as="h2" class="provider-more-title">
                {props.title}
              </Dialog.Title>
              <IconButton
                label={t("slash.screen.close")}
                variant="ghost"
                data-cuelume-tap="close"
                onClick={() => props.onOpenChange(false)}
              >
                <X />
              </IconButton>
            </header>
            <Dialog.Description as="p" class="slash-screen-description">
              {props.description}
            </Dialog.Description>
            <Show when={props.error}>
              {(message) => (
                <p class="slash-screen-error" role="alert">
                  {message()}
                </p>
              )}
            </Show>
            <div class="provider-more-list slash-screen-list">
              <Show when={props.status === "loading"}>
                <p class="provider-more-empty slash-screen-status" role="status">
                  <LoaderCircle class="slash-screen-spinner" aria-hidden="true" />
                  {t("slash.screen.loading")}
                </p>
              </Show>
              <Show when={props.status === "failed"}>
                <div class="slash-screen-failed">
                  <p class="provider-more-empty">{props.failedText}</p>
                  <Show when={props.onRetry}>
                    {(retry) => (
                      <Button type="button" variant="outline" size="sm" onClick={() => retry()()}>
                        {t("slash.resume.retry")}
                      </Button>
                    )}
                  </Show>
                </div>
              </Show>
              <Show when={props.status === "ready" && props.options.length === 0}>
                <p class="provider-more-empty">{props.emptyText}</p>
              </Show>
              <Show when={props.status === "ready"}>
                <For each={props.options} keyed={false}>
                  {(option) => (
                    <Button
                      type="button"
                      variant="ghost"
                      class="provider-more-row slash-screen-row"
                      data-cuelume-tap="select"
                      aria-current={option().current ? "true" : undefined}
                      disabled={option().disabled || props.busyId !== null}
                      onClick={() => props.onChoose(option().id)}
                    >
                      <span class="slash-screen-mark" aria-hidden="true">
                        <Show when={option().current}>
                          <Check />
                        </Show>
                        <Show when={props.busyId === option().id}>
                          <LoaderCircle class="slash-screen-spinner" />
                        </Show>
                      </span>
                      <span class="provider-picker-identity">
                        <span class="provider-picker-name">{option().label}</span>
                        <Show when={option().description}>
                          {(description) => <small class="provider-picker-email">{description()}</small>}
                        </Show>
                        <Show when={option().meta}>
                          {(meta) => <small class="provider-picker-email slash-screen-meta">{meta()}</small>}
                        </Show>
                      </span>
                      <Show when={option().badge}>{(badge) => <span class="slash-screen-badge">{badge()}</span>}</Show>
                    </Button>
                  )}
                </For>
              </Show>
            </div>
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
