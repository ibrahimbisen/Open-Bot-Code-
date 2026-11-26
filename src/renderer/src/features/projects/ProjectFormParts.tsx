import { type AvatarColor, PROJECT_ACCESS_LEVELS, type ProjectAccessLevel } from "@codebot/contracts/ipc";
import type { AppTextKey } from "@codebot/i18n";
import { Button, Check, RadioGroup } from "@codebot/ui";
import { useText } from "@codebot/ui/text";
import { For, Show } from "solid-js";
import { PROJECT_COLORS } from "./project-colors";

const LEVEL_LABEL = {
  strict: "project.access.strict",
  normal: "project.access.normal",
  open: "project.access.open",
} as const satisfies Record<ProjectAccessLevel, AppTextKey>;

const LEVEL_HINT = {
  strict: "project.access.strictHint",
  normal: "project.access.normalHint",
  open: "project.access.openHint",
} as const satisfies Record<ProjectAccessLevel, AppTextKey>;

export function AccessLevelPicker(props: {
  value: ProjectAccessLevel;
  disabled?: boolean;
  onChange: (level: ProjectAccessLevel) => void;
}) {
  const { t } = useText();
  return (
    <RadioGroup.Root
      class="project-access-picker"
      aria-label={t("project.field.access")}
      value={props.value}
      disabled={props.disabled}
      onChange={(value) => {
        const level = PROJECT_ACCESS_LEVELS.find((entry) => entry === value);
        if (level) props.onChange(level);
      }}
    >
      <For each={PROJECT_ACCESS_LEVELS}>
        {(level) => (
          <RadioGroup.Item class="project-access-option" value={level}>
            <RadioGroup.ItemInput />
            <RadioGroup.ItemControl class="project-access-card">
              <span class="project-access-dot" aria-hidden="true" />
              <span class="project-access-text">
                <RadioGroup.ItemLabel class="project-access-name">{t(LEVEL_LABEL[level])}</RadioGroup.ItemLabel>
                <RadioGroup.ItemDescription class="project-access-hint">
                  {t(LEVEL_HINT[level])}
                </RadioGroup.ItemDescription>
              </span>
            </RadioGroup.ItemControl>
          </RadioGroup.Item>
        )}
      </For>
    </RadioGroup.Root>
  );
}

export function ProjectColorPicker(props: {
  value: AvatarColor | null;
  disabled?: boolean;
  onChange: (color: AvatarColor | null) => void;
}) {
  const { t } = useText();
  return (
    <fieldset class="project-color-picker" aria-label={t("project.field.color")}>
      <Button
        variant="ghost"
        class="project-color-swatch"
        data-none=""
        aria-pressed={props.value === null ? "true" : "false"}
        aria-label={t("project.field.colorNone")}
        title={t("project.field.colorNone")}
        disabled={props.disabled}
        onClick={() => props.onChange(null)}
      >
        <Show when={props.value === null}>
          <Check />
        </Show>
      </Button>
      <For each={PROJECT_COLORS}>
        {(color) => (
          <Button
            variant="ghost"
            class="project-color-swatch"
            style={{ "background-color": color }}
            aria-pressed={props.value === color ? "true" : "false"}
            aria-label={color}
            title={color}
            disabled={props.disabled}
            onClick={() => props.onChange(color)}
          >
            <Show when={props.value === color}>
              <Check />
            </Show>
          </Button>
        )}
      </For>
    </fieldset>
  );
}
