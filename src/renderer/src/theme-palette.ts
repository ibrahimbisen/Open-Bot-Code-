import type { AppThemePalette } from "@codebot/contracts/app-appearance";

function clear(color: string, percent: number): string {
  return `color-mix(in srgb, ${color} ${percent}%, transparent)`;
}

function mix(color: string, other: string, percent: number): string {
  return `color-mix(in srgb, ${color}, ${other} ${percent}%)`;
}

function paletteTokens({ scheme, colors }: AppThemePalette): Record<string, string> {
  const raised = scheme === "light" ? mix(colors.canvas, "#ffffff", 70) : colors.surface;
  const tabsBar = scheme === "light" ? mix(colors.canvas, colors.surface, 30) : colors.surface;
  return {
    "--codebot-bg-canvas": colors.canvas,
    "--codebot-bg-canvas-clear": clear(colors.canvas, 0),
    "--codebot-bg-frame": colors.frame,
    "--codebot-bg-sidebar": colors.sidebar,
    "--codebot-bg-native-sidebar": colors.sidebar,
    "--codebot-bg-sheet": raised,
    "--codebot-bg-sheet-inset": colors.frame,
    "--codebot-bg-grouped": raised,
    "--codebot-bg-surface": raised,
    "--codebot-bg-surface-raised": mix(raised, colors.text, 3),
    "--codebot-bg-control": raised,
    "--codebot-bg-control-hover": mix(raised, colors.text, 4),
    "--codebot-bg-control-active": mix(raised, colors.text, 8),
    "--codebot-tabs-bar-bg": tabsBar,
    "--codebot-tabs-pill-bg": scheme === "light" ? raised : mix(colors.surface, colors.text, 8),
    "--codebot-marketplace-detail-bg": colors.frame,
    "--codebot-bg-overlay": clear(colors.canvas, 92),
    "--codebot-bg-glass": clear(raised, 76),
    "--codebot-scroll-edge-overlay": clear(colors.canvas, 72),

    "--codebot-border": clear(colors.border, 35),
    "--codebot-border-strong": clear(colors.border, 50),
    "--codebot-border-grouped": colors.border,
    "--codebot-dialog-ring": clear(colors.border, 70),
    "--codebot-image-outline": clear(colors.border, 60),
    "--codebot-hover": clear(colors.text, 5),

    "--codebot-text-primary": colors.text,
    "--codebot-text-secondary": mix(colors.text, colors.textMuted, 25),
    "--codebot-text-muted": colors.textMuted,
    "--codebot-text-dim": mix(colors.textMuted, colors.canvas, 30),
    "--codebot-text-placeholder": colors.textMuted,
    "--codebot-text-readable": colors.textMuted,
    "--codebot-text-grouped-secondary": colors.textMuted,
    "--codebot-settings-text-muted": colors.textMuted,

    "--codebot-surface-light": colors.text,
    "--codebot-text-on-light": colors.canvas,
    "--codebot-text-muted-on-light": clear(colors.canvas, 64),
    "--codebot-text-dim-on-light": clear(colors.canvas, 40),
    "--codebot-border-on-light": clear(colors.canvas, 16),

    "--codebot-accent": colors.accent,
    "--codebot-accent-hover": mix(colors.accent, colors.text, 15),
    "--codebot-accent-text": colors.accent,
    "--codebot-accent-soft": clear(colors.accent, 16),
    "--codebot-accent-strong": clear(colors.accent, 34),
    "--codebot-text-on-accent": colors.accentForeground,

    "--codebot-success": colors.success,
    "--codebot-success-text": colors.success,
    "--codebot-success-soft": clear(colors.success, 14),
    "--codebot-success-wash": clear(colors.success, 6),
    "--codebot-warning": colors.warning,
    "--codebot-warning-text": colors.warning,
    "--codebot-warning-soft": clear(colors.warning, 14),
    "--codebot-danger": colors.danger,
    "--codebot-danger-hover": mix(colors.danger, colors.text, 15),
    "--codebot-danger-text": colors.danger,
    "--codebot-danger-soft": clear(colors.danger, 14),
    "--codebot-danger-soft-hover": clear(colors.danger, 22),
    "--codebot-danger-focus": clear(colors.danger, 36),
    "--codebot-danger-border": clear(colors.danger, 45),
  };
}

let applied: string[] = [];

export function applyThemePalette(palette: AppThemePalette | null): void {
  const style = document.documentElement.style;
  for (const name of applied) style.removeProperty(name);
  applied = [];
  if (palette === null) return;
  for (const [name, value] of Object.entries(paletteTokens(palette))) {
    style.setProperty(name, value);
    applied.push(name);
  }
}
