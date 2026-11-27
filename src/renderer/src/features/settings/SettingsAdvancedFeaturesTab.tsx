import { ADVANCED_FEATURE_IDS, type AdvancedFeatureId } from "@codebot/contracts/ipc";
import {
  Button,
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
  SettingsSection,
  SwitchField,
  toast,
} from "@codebot/ui";
import { useText } from "@codebot/ui/text";
import { createSignal, For, Show } from "solid-js";
import { useI18n } from "../../i18n-context";
import { ADVANCED_FEATURE_TEXT } from "../advanced/advanced-feature-text";
import { useAdvancedFeatures } from "../advanced/advanced-features-context";
import { useServers } from "../servers/servers-context";
import { useSettings } from "./settings-context";

export function SettingsAdvancedFeaturesTab() {
  const i18n = useI18n();
  const { errorMessage } = useText();
  const advanced = useAdvancedFeatures();
  const { activeServer } = useServers();
  const { setPendingPluginConnect, setPendingPluginSlug, setSkillsMarketplaceOpen } = useSettings();
  const [pending, setPending] = createSignal<AdvancedFeatureId | null>(null);

  async function change(feature: AdvancedFeatureId, enabled: boolean): Promise<void> {
    setPending(feature);
    try {
      await advanced.change(feature, enabled);
    } catch (error) {
      toast.error(errorMessage(error, i18n.t("advanced.saveFailed")), { error });
    } finally {
      setPending(null);
    }
  }

  function openChatApps(): void {
    setPendingPluginConnect(false);
    setPendingPluginSlug("slack");
    setSkillsMarketplaceOpen(true);
  }

  const unavailable = () => advanced.settings() === undefined;
  const locked = () => unavailable() || !advanced.canChange();

  return (
    <SettingsSection
      title={i18n.t("advanced.section.title")}
      description={i18n.t("advanced.section.description", { server: activeServer()?.name ?? "" })}
    >
      <Show when={advanced.loadFailed()}>
        <p class="settings-modal-note" role="alert">
          {i18n.t("advanced.loadFailed")}
        </p>
      </Show>
      <Show when={!unavailable() && !advanced.canChange()}>
        <p class="settings-modal-note">{i18n.t("advanced.adminOnly")}</p>
      </Show>
      <ItemGroup class="settings-modal-card">
        <For each={ADVANCED_FEATURE_IDS}>
          {(feature) => (
            <>
              <SwitchField
                data-settings-row={ADVANCED_FEATURE_TEXT[feature].title}
                checked={advanced.enabled(feature)}
                disabled={locked() || pending() !== null}
                onChange={(enabled) => void change(feature, enabled)}
                label={i18n.t(ADVANCED_FEATURE_TEXT[feature].title)}
                description={i18n.t(ADVANCED_FEATURE_TEXT[feature].description)}
              />
              <Show when={feature === "chatApps" && advanced.enabled("chatApps")}>
                <Item class="settings-modal-row">
                  <ItemContent>
                    <ItemTitle>{i18n.t("advanced.chatApps.open.title")}</ItemTitle>
                    <ItemDescription>{i18n.t("advanced.chatApps.open.description")}</ItemDescription>
                  </ItemContent>
                  <ItemActions>
                    <Button type="button" variant="outline" size="sm" onClick={openChatApps}>
                      {i18n.t("advanced.chatApps.open.action")}
                    </Button>
                  </ItemActions>
                </Item>
              </Show>
            </>
          )}
        </For>
      </ItemGroup>
    </SettingsSection>
  );
}
