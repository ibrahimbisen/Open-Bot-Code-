import type { AppThemePalette } from "./app-appearance";

export const CODEBOT_DARK_PALETTE: AppThemePalette = {
  id: "codebot-dark",
  name: "OpenBot Code Dark",
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
  name: "OpenBot Code Light",
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

export const CODEBOT_DARK_MODERN_PALETTE: AppThemePalette = {
  id: "codebot-dark-modern",
  name: "OpenBot Code Dark Modern",
  scheme: "dark",
  colors: {
    canvas: "#1e1f24",
    frame: "#16171b",
    sidebar: "#191a1f",
    surface: "#25272d",
    text: "#e6e7ea",
    textMuted: "#a3a6ae",
    border: "#3d4048",
    accent: "#5aa9ff",
    accentForeground: "#07192e",
    success: "#4cc38a",
    warning: "#e0a64a",
    danger: "#ff7b7b",
  },
};

export const CODEBOT_LIGHT_MODERN_PALETTE: AppThemePalette = {
  id: "codebot-light-modern",
  name: "OpenBot Code Light Modern",
  scheme: "light",
  colors: {
    canvas: "#fafafb",
    frame: "#ececf0",
    sidebar: "#f1f1f4",
    surface: "#ffffff",
    text: "#1b1c20",
    textMuted: "#4d5059",
    border: "#a9adb8",
    accent: "#1d5fc4",
    accentForeground: "#ffffff",
    success: "#17743f",
    warning: "#8f5600",
    danger: "#c4262e",
  },
};

export const CODEBOT_HIGH_CONTRAST_PALETTE: AppThemePalette = {
  id: "codebot-high-contrast",
  name: "OpenBot Code High Contrast",
  scheme: "dark",
  colors: {
    canvas: "#000000",
    frame: "#000000",
    sidebar: "#000000",
    surface: "#0a0a0a",
    text: "#ffffff",
    textMuted: "#e8e8e8",
    border: "#c0c0c0",
    accent: "#ffd60a",
    accentForeground: "#000000",
    success: "#5dff9a",
    warning: "#ffb347",
    danger: "#ff8080",
  },
};

export const CODEBOT_WARM_DARK_PALETTE: AppThemePalette = {
  id: "codebot-dark-warm",
  name: "OpenBot Code Warm Dark",
  scheme: "dark",
  colors: {
    canvas: "#231f1b",
    frame: "#191613",
    sidebar: "#1d1a16",
    surface: "#2c2722",
    text: "#efe6da",
    textMuted: "#b3a595",
    border: "#4a4137",
    accent: "#e8a05a",
    accentForeground: "#2a1807",
    success: "#8cc86a",
    warning: "#f0c060",
    danger: "#f0806f",
  },
};

export const CODEBOT_BLUE_DARK_PALETTE: AppThemePalette = {
  id: "codebot-dark-blue",
  name: "OpenBot Code Blue Dark",
  scheme: "dark",
  colors: {
    canvas: "#10192a",
    frame: "#0a111e",
    sidebar: "#0d1524",
    surface: "#17233a",
    text: "#e3ebf7",
    textMuted: "#93a6c4",
    border: "#2b3d5c",
    accent: "#4cc2ff",
    accentForeground: "#04202e",
    success: "#4fd6a0",
    warning: "#f2c35a",
    danger: "#ff7a90",
  },
};

export const BUILT_IN_THEME_PALETTES: readonly AppThemePalette[] = [
  CODEBOT_DARK_PALETTE,
  CODEBOT_LIGHT_PALETTE,
  CODEBOT_DARK_MODERN_PALETTE,
  CODEBOT_LIGHT_MODERN_PALETTE,
  CODEBOT_HIGH_CONTRAST_PALETTE,
  CODEBOT_WARM_DARK_PALETTE,
  CODEBOT_BLUE_DARK_PALETTE,
];

export function builtInThemePalette(scheme: "light" | "dark"): AppThemePalette {
  return scheme === "light" ? CODEBOT_LIGHT_PALETTE : CODEBOT_DARK_PALETTE;
}
