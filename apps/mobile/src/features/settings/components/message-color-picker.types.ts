import type { AvatarColor } from "@codebot/contracts/ipc";

export interface MessageColorPickerProps {
  value: AvatarColor;
  disabled: boolean;
  dark: boolean;
  onChange: (value: AvatarColor) => void;
}
