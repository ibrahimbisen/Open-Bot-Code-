import type { AppThemePalette } from "./app-appearance";

export const CODEBOT_DARK_PALETTE: AppThemePalette = {
  id: "codebot-dark",
  name: "CodeBot Dark",
  scheme: "dark",
  colors: {
    canvas: "#1a1a1a",
    frame: "#0d0d0d",
    sidebar: "#1a1a1a",
    surface: "#212121",
    text: "#ffffff",
    textMuted: "#979797",
    border: "#3a3a3a",
    accent: "#007cf7",
    accentForeground: "#ffffff",
    success: "#31cf76",
    warning: "#ff9412",
    danger: "#fd2f3b",
  },
};

export const CODEBOT_LIGHT_PALETTE: AppThemePalette = {
  id: "codebot-light",
  name: "CodeBot Light",
  scheme: "light",
  colors: {
    canvas: "#f5f5f6",
    frame: "#e8e8eb",
    sidebar: "#f5f5f6",
    surface: "#ffffff",
    text: "#141414",
    textMuted: "#6b6b70",
    border: "#c4c4ca",
    accent: "#007cf7",
    accentForeground: "#ffffff",
    success: "#1fa85a",
    warning: "#f08a00",
    danger: "#e8222d",
  },
};

export const BUILT_IN_THEME_PALETTES: readonly AppThemePalette[] = [CODEBOT_DARK_PALETTE, CODEBOT_LIGHT_PALETTE];

export function builtInThemePalette(scheme: "light" | "dark"): AppThemePalette {
  return scheme === "light" ? CODEBOT_LIGHT_PALETTE : CODEBOT_DARK_PALETTE;
}
