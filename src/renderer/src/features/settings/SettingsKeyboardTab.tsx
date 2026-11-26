import { KeyboardShortcutsSettings } from "@codebot/ui/features/settings/KeyboardShortcutsSettings";
import type { JSX } from "@solidjs/web";
import {
  resetShortcuts,
  setShortcut,
  shortcutEnvironment,
  useShortcutOverrides,
} from "../../keyboard-shortcut-preference";

export function SettingsKeyboardTab(): JSX.Element {
  const overrides = useShortcutOverrides();
  return (
    <KeyboardShortcutsSettings
      environment={shortcutEnvironment()}
      overrides={overrides()}
      onChange={setShortcut}
      onResetAll={resetShortcuts}
    />
  );
}
