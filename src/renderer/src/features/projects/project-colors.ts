import { AVATAR_HUES, type AvatarColor } from "@codebot/contracts/ipc";

const SATURATION = 0.62;
const LIGHTNESS = 0.55;

function channel(hue: number, offset: number): string {
  const amount = SATURATION * Math.min(LIGHTNESS, 1 - LIGHTNESS);
  const position = (offset + hue / 30) % 12;
  const value = LIGHTNESS - amount * Math.max(-1, Math.min(position - 3, 9 - position, 1));
  return Math.round(value * 255)
    .toString(16)
    .padStart(2, "0");
}

export function projectColorFromHue(hue: number): AvatarColor {
  return `#${channel(hue, 0)}${channel(hue, 8)}${channel(hue, 4)}`;
}

export const PROJECT_COLORS: readonly AvatarColor[] = AVATAR_HUES.map(projectColorFromHue);

export function folderBaseName(path: string): string {
  const parts = path.split(/[/]/u).filter((part) => part.length > 0);
  return parts.at(-1) ?? "";
}
