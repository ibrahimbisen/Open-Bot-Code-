import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@codebot/ui";
import type { JSX } from "@solidjs/web";
import { useText } from "../../text";

export const REPLY_VIEWS = ["short", "detailed"] as const;
export type ReplyView = (typeof REPLY_VIEWS)[number];

const options = [...REPLY_VIEWS];

const REPLY_VIEW_LABEL = {
  short: "reply.view.short",
  detailed: "reply.view.detailed",
} as const satisfies Record<ReplyView, string>;

export function replyViewOf(showSteps: boolean): ReplyView {
  return showSteps ? "detailed" : "short";
}

export function ReplyViewSelect(props: {
  value: ReplyView;
  onChange: (value: ReplyView) => void;
  mount?: HTMLElement | undefined;
}): JSX.Element {
  const { t } = useText();
  return (
    <Select<ReplyView>
      class="settings-modal-select"
      options={options}
      value={props.value}
      onChange={(view) => view && props.onChange(view)}
      placement="bottom-end"
      itemComponent={(itemProps) => (
        <SelectItem item={itemProps.item}>{t(REPLY_VIEW_LABEL[itemProps.item.rawValue])}</SelectItem>
      )}
    >
      <SelectTrigger size="sm" aria-label={t("reply.view.title")}>
        <SelectValue<ReplyView>>{(state) => t(REPLY_VIEW_LABEL[state.selectedOption()])}</SelectValue>
      </SelectTrigger>
      <SelectContent mount={props.mount} />
    </Select>
  );
}
