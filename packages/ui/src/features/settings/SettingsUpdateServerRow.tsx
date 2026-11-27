import type { AppUpdateFeed } from "@codebot/contracts/ipc";
import { Button, Input, Item, ItemContent, ItemDescription, ItemTitle } from "@codebot/ui";
import { createEffect, createStore, Show } from "solid-js";
import { useText } from "../../text";

interface SettingsUpdateServerRowProps {
  feed: AppUpdateFeed | null;
  loadFailed?: boolean | undefined;
  onSave: (url: string | null) => Promise<AppUpdateFeed>;
}

interface UpdateServerRowState {
  draft: string;
  edited: boolean;
  saving: boolean;
  error: string | null;
}

export function SettingsUpdateServerRow(props: SettingsUpdateServerRowProps) {
  const { t, errorMessage } = useText();
  const [state, setState] = createStore<UpdateServerRowState>({
    draft: "",
    edited: false,
    saving: false,
    error: null,
  });

  createEffect(
    () => props.feed?.savedUrl ?? "",
    (savedUrl) => {
      setState((draft) => {
        if (!draft.edited) draft.draft = savedUrl;
      });
    },
  );

  const source = () => {
    const feed = props.feed;
    if (!feed) return props.loadFailed ? t("appUpdate.server.loadFailed") : null;
    if (feed.source === "settings") return t("appUpdate.server.source.settings");
    if (feed.source === "environment") return t("appUpdate.server.source.environment", { url: feed.url ?? "" });
    if (feed.source === "build") return t("appUpdate.server.source.build", { url: feed.url ?? "" });
    return t("appUpdate.server.source.none");
  };
  const savedUrl = () => props.feed?.savedUrl ?? "";
  const unchanged = () => state.draft.trim() === savedUrl();

  async function save(url: string | null): Promise<void> {
    if (state.saving) return;
    setState((draft) => {
      draft.saving = true;
      draft.error = null;
    });
    try {
      const feed = await props.onSave(url);
      setState((draft) => {
        draft.draft = feed.savedUrl ?? "";
        draft.edited = false;
      });
    } catch (failure) {
      const message = errorMessage(failure, t("appUpdate.server.saveFailed"));
      setState((draft) => {
        draft.error = message;
      });
    } finally {
      setState((draft) => {
        draft.saving = false;
      });
    }
  }

  return (
    <Item data-settings-row="appUpdate.server.title" class="settings-modal-row settings-modal-update-server-row">
      <ItemContent>
        <ItemTitle>{t("appUpdate.server.title")}</ItemTitle>
        <ItemDescription>{t("appUpdate.server.description")}</ItemDescription>
        <form
          class="settings-modal-update-server-form"
          novalidate
          onSubmit={(event) => {
            event.preventDefault();
            const url = state.draft.trim();
            void save(url === "" ? null : url);
          }}
        >
          <Input
            type="url"
            size="sm"
            inputmode="url"
            autocomplete="off"
            spellcheck={false}
            class="settings-modal-update-server-input"
            aria-label={t("appUpdate.server.urlLabel")}
            placeholder={t("appUpdate.server.placeholder")}
            invalid={state.error !== null}
            disabled={props.feed === null}
            value={state.draft}
            onValueChange={(value) =>
              setState((draft) => {
                draft.draft = value;
                draft.edited = true;
                draft.error = null;
              })
            }
          />
          <Button
            type="submit"
            variant="outline"
            size="sm"
            loading={state.saving}
            loadingLabel={t("common.saving")}
            disabled={props.feed === null || unchanged()}
          >
            {t("common.save")}
          </Button>
          <Show when={savedUrl() !== ""}>
            <Button type="button" variant="ghost" size="sm" disabled={state.saving} onClick={() => void save(null)}>
              {t("common.remove")}
            </Button>
          </Show>
        </form>
        <Show
          when={state.error}
          fallback={
            <Show when={source()}>
              {(text) => <ItemDescription class="settings-modal-update-server-source">{text()}</ItemDescription>}
            </Show>
          }
        >
          {(error) => (
            <ItemDescription class="settings-modal-error" role="alert">
              {error()}
            </ItemDescription>
          )}
        </Show>
      </ItemContent>
    </Item>
  );
}
