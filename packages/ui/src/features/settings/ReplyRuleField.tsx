import { Button, Textarea } from "@codebot/ui";
import type { JSX } from "@solidjs/web";
import { createEffect, createSignal, Show, untrack } from "solid-js";
import { useText } from "../../text";

export interface ReplyRuleFieldProps {
  value: string | null;
  defaultRule: string;
  maxLength: number;
  disabled?: boolean | undefined;
  onSave: (rule: string | null) => void | Promise<void>;
}

export function ReplyRuleField(props: ReplyRuleFieldProps): JSX.Element {
  const { t } = useText();
  const stored = () => props.value ?? props.defaultRule;
  const [draft, setDraft] = createSignal(untrack(stored));
  const [saving, setSaving] = createSignal(false);
  createEffect(stored, (rule) => {
    setDraft(rule);
  });
  const dirty = () => draft().trim() !== stored().trim();
  const save = async (rule: string | null) => {
    setSaving(true);
    try {
      await props.onSave(rule);
    } finally {
      setSaving(false);
    }
  };
  const submit = () => {
    const rule = draft().trim();
    return save(rule === props.defaultRule.trim() ? null : rule);
  };
  return (
    <div class="reply-rule-field">
      <Textarea
        class="reply-rule-input"
        rows={3}
        maxlength={props.maxLength}
        aria-label={t("reply.rule.label")}
        disabled={props.disabled}
        value={draft()}
        onValueChange={setDraft}
        dir="auto"
      />
      <div class="reply-rule-footer">
        <span class="reply-rule-hint">
          {draft().trim() === ""
            ? t("reply.rule.empty")
            : t("reply.rule.count", { count: draft().length, max: props.maxLength })}
        </span>
        <div class="reply-rule-actions">
          <Show when={props.value !== null}>
            <Button type="button" variant="ghost" size="sm" disabled={saving()} onClick={() => void save(null)}>
              {t("reply.rule.reset")}
            </Button>
          </Show>
          <Button
            type="button"
            size="sm"
            disabled={!dirty() || saving() || props.disabled}
            onClick={() => void submit()}
          >
            {t("reply.rule.save")}
          </Button>
        </div>
      </div>
    </div>
  );
}
