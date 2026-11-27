import type { AccountServiceSettings, CentralAuthState } from "@codebot/contracts/ipc";
import {
  Button,
  Input,
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
  SettingsSection,
} from "@codebot/ui";
import { createEffect, createSignal, Show } from "solid-js";
import { useText } from "../../text";

export interface AccountServiceModel {
  state: CentralAuthState;
  settings: AccountServiceSettings | null;
  onSaveUrl: (url: string | null) => Promise<void>;
  onSignIn: () => Promise<void>;
  onCancelSignIn: () => Promise<void>;
}

interface AccountServiceCardProps {
  model: AccountServiceModel;
}

export function AccountServiceCard(props: AccountServiceCardProps) {
  const { t, errorMessage } = useText();
  const [address, setAddress] = createSignal("");
  const [saving, setSaving] = createSignal(false);
  const [problem, setProblem] = createSignal<string | null>(null);

  createEffect(
    () => props.model.settings?.url ?? "",
    (url) => {
      setAddress(url);
    },
  );

  const savedUrl = () => props.model.settings?.url ?? null;
  const fixed = () => props.model.settings?.fixedByEnvironment === true;
  const changed = () => address().trim() !== (savedUrl() ?? "");
  const signedIn = () => props.model.state.status === "signed_in";
  const waiting = () => props.model.state.status === "browser_sign_in" && props.model.state.issue === undefined;
  const issue = () => {
    const state = props.model.state;
    return state.status === "browser_sign_in" || state.status === "error" ? state.issue : undefined;
  };

  async function run(
    action: () => Promise<void>,
    fallbackKey: "account.service.saveFailed" | "account.service.signInFailed",
  ) {
    setProblem(null);
    try {
      await action();
    } catch (cause) {
      setProblem(errorMessage(cause, t(fallbackKey)));
    }
  }

  async function save() {
    if (saving()) return;
    setSaving(true);
    await run(
      () => props.model.onSaveUrl(address().trim() === "" ? null : address().trim()),
      "account.service.saveFailed",
    );
    setSaving(false);
  }

  return (
    <SettingsSection title={t("account.service.title")} description={t("account.service.description")}>
      <ItemGroup class="settings-modal-card">
        <Item data-settings-row="account.service.address.title">
          <ItemContent>
            <ItemTitle>{t("account.service.address.title")}</ItemTitle>
            <ItemDescription>
              {fixed() ? t("account.service.address.fixed") : t("account.service.address.description")}
            </ItemDescription>
            <Input
              type="url"
              size="sm"
              autocomplete="off"
              spellcheck={false}
              aria-label={t("account.service.address.title")}
              placeholder={t("account.service.address.placeholder")}
              value={address()}
              disabled={fixed() || signedIn()}
              onInput={(event) => setAddress(event.currentTarget.value)}
            />
          </ItemContent>
          <ItemActions>
            <Button
              variant="outline"
              size="sm"
              disabled={fixed() || signedIn() || saving() || !changed()}
              onClick={() => void save()}
            >
              {t("account.service.address.save")}
            </Button>
          </ItemActions>
        </Item>
        <Show when={!signedIn()}>
          <Item data-settings-row="account.service.signIn.title">
            <ItemContent>
              <ItemTitle>{t("account.service.signIn.title")}</ItemTitle>
              <ItemDescription>
                {waiting() ? t("account.service.signIn.waiting") : t("account.service.signIn.description")}
              </ItemDescription>
              <Show when={issue()}>{(shown) => <ItemDescription role="alert">{shown().message}</ItemDescription>}</Show>
              <Show when={problem()}>{(message) => <ItemDescription role="alert">{message()}</ItemDescription>}</Show>
            </ItemContent>
            <ItemActions>
              <Show
                when={waiting()}
                fallback={
                  <Button
                    size="sm"
                    disabled={savedUrl() === null || changed()}
                    onClick={() => void run(props.model.onSignIn, "account.service.signInFailed")}
                  >
                    {t("account.service.signIn.action")}
                  </Button>
                }
              >
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void run(props.model.onCancelSignIn, "account.service.signInFailed")}
                >
                  {t("account.service.signIn.cancel")}
                </Button>
              </Show>
            </ItemActions>
          </Item>
        </Show>
      </ItemGroup>
    </SettingsSection>
  );
}
