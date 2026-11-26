import { DEFAULT_REPLY_RULE, PROJECT_LIMITS, type ReplyRuleSettings } from "@codebot/contracts/ipc";
import { Item, ItemContent, ItemDescription, ItemTitle, toast } from "@codebot/ui";
import { ReplyRuleField } from "@codebot/ui/features/settings/ReplyRuleField";
import { useText } from "@codebot/ui/text";
import { createSignal, onSettled } from "solid-js";
import { settingsPort } from "./settings-port";

export function ReplyRuleSetting() {
  const { t } = useText();
  const [settings, setSettings] = createSignal<ReplyRuleSettings>({ rule: null });
  const [loaded, setLoaded] = createSignal(false);
  onSettled(() => {
    let active = true;
    void settingsPort()
      .replies.getRule()
      .then((current) => {
        if (!active) return;
        setSettings(current);
        setLoaded(true);
      });
    return () => {
      active = false;
    };
  });
  const save = async (rule: string | null) => {
    setSettings(await settingsPort().replies.setRule({ rule }));
    toast.success(t("reply.rule.saved"));
  };
  return (
    <Item data-settings-row="reply.rule.title" class="settings-modal-row reply-rule-row">
      <ItemContent>
        <ItemTitle>{t("reply.rule.title")}</ItemTitle>
        <ItemDescription>{t("reply.rule.description")}</ItemDescription>
        <ReplyRuleField
          value={settings().rule}
          defaultRule={DEFAULT_REPLY_RULE}
          maxLength={PROJECT_LIMITS.replyRule}
          disabled={!loaded()}
          onSave={save}
        />
      </ItemContent>
    </Item>
  );
}
