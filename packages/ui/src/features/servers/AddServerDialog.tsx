import { Button, Dialog, Heading, IconButton, Link2, Monitor, Text, X } from "@codebot/ui";
import { motionDuration, prefersReducedMotion } from "@codebot/ui/utils";
import type { JSX } from "@solidjs/web";
import { createSignal, For, onCleanup, onSettled, Show } from "solid-js";
import { useText } from "../../text";

interface AddServerDialogProps {
  onClose: () => void;
  onJoinWithInvite?: (() => void) | undefined;
  onCreateLocal?: (() => void) | undefined;
}

interface AddServerOption {
  id: string;
  icon: () => JSX.Element;
  title: string;
  description: string;
  onSelect: () => void;
}

export function AddServerDialog(props: AddServerDialogProps) {
  const { t } = useText();
  const [rendered, setRendered] = createSignal(true);
  const [opened, setOpened] = createSignal(false);
  const [closing, setClosing] = createSignal(false);
  let closeTimer: number | undefined;

  onSettled(() => {
    const frame = window.requestAnimationFrame(() => setOpened(true));
    return () => window.cancelAnimationFrame(frame);
  });

  onCleanup(() => {
    if (closeTimer !== undefined) window.clearTimeout(closeTimer);
  });

  function requestClose(then?: () => void): void {
    if (closing()) return;
    setClosing(true);
    setOpened(false);
    closeTimer = window.setTimeout(
      () => {
        closeTimer = undefined;
        setRendered(false);
        props.onClose();
        then?.();
      },
      prefersReducedMotion() ? 0 : motionDuration("--modal-close-dur", 150),
    );
  }

  const options = (): AddServerOption[] => {
    const items: AddServerOption[] = [];
    const createLocal = props.onCreateLocal;
    const join = props.onJoinWithInvite;
    if (createLocal)
      items.push({
        id: "local",
        icon: () => <Monitor aria-hidden="true" />,
        title: t("server.local.createTitle"),
        description: t("server.local.createDescription"),
        onSelect: createLocal,
      });
    if (join)
      items.push({
        id: "join",
        icon: () => <Link2 aria-hidden="true" />,
        title: t("server.add.join.action"),
        description: t("server.add.join.description"),
        onSelect: join,
      });
    return items;
  };

  return (
    <Dialog.Root open={rendered()} onOpenChange={(open) => !open && requestClose()}>
      <Dialog.Portal>
        <Dialog.Overlay class="join-server-backdrop" data-motion={closing() ? "closing" : "open"}>
          <Dialog.Content
            as="section"
            class={`join-server-dialog add-server-dialog t-modal${closing() ? " is-closing" : opened() ? " is-open" : ""}`}
          >
            <Dialog.Title class="sr-only">{t("server.add.title")}</Dialog.Title>
            <Dialog.Description class="sr-only">{t("server.add.description")}</Dialog.Description>

            <IconButton
              class="join-server-close"
              label={t("common.close")}
              tooltip={t("common.close")}
              variant="ghost"
              data-cuelume-tap="close"
              onClick={() => requestClose()}
            >
              <X />
            </IconButton>

            <div class="join-server-content">
              <div class="add-server-step">
                <header class="join-server-header add-server-intro">
                  <Heading as="h2" size="lg">
                    {t("server.add.title")}
                  </Heading>
                  <Text as="p" tone="muted">
                    {t("server.add.description")}
                  </Text>
                </header>
                <ul class="add-server-options">
                  <For each={options()} keyed={(option) => option.id}>
                    {(option) => (
                      <li>
                        <Button
                          variant="ghost"
                          type="button"
                          class="add-server-option"
                          onClick={() => requestClose(option().onSelect)}
                        >
                          <span class="add-server-option-icon">{option().icon()}</span>
                          <span class="add-server-option-text">
                            <span class="add-server-option-title">{option().title}</span>
                            <span class="add-server-option-description">{option().description}</span>
                          </span>
                        </Button>
                      </li>
                    )}
                  </For>
                </ul>
                <Show when={options().length === 0}>
                  <Text as="p" tone="muted">
                    {t("server.add.none")}
                  </Text>
                </Show>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
