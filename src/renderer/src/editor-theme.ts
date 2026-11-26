import {
  type AppAppearancePreference,
  type AppThemePalette,
  selectedThemePalette,
} from "@codebot/contracts/app-appearance";
import { builtInThemePalette } from "@codebot/contracts/app-theme-defaults";

interface Rgb {
  r: number;
  g: number;
  b: number;
}

function parseHex(color: string): Rgb {
  const value = Number.parseInt(color.slice(1, 7), 16);
  return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 };
}

function channel(value: number): string {
  return Math.round(Math.min(255, Math.max(0, value)))
    .toString(16)
    .padStart(2, "0");
}

function mix(color: string, other: string, percentOther: number): string {
  const a = parseHex(color);
  const b = parseHex(other);
  const weight = percentOther / 100;
  return `#${channel(a.r + (b.r - a.r) * weight)}${channel(a.g + (b.g - a.g) * weight)}${channel(a.b + (b.b - a.b) * weight)}`;
}

function alpha(color: string, percent: number): string {
  return `${color.slice(0, 7)}${channel((percent / 100) * 255)}`;
}

export interface EditorTokens {
  background: string;
  foreground: string;
  gutterForeground: string;
  gutterActiveForeground: string;
  selection: string;
  selectionInactive: string;
  lineHighlight: string;
  cursor: string;
  guide: string;
  widgetBackground: string;
  widgetBorder: string;
  scrollbar: string;
  insertedBackground: string;
  removedBackground: string;
  error: string;
  warning: string;
  syntaxComment: string;
  syntaxKeyword: string;
  syntaxString: string;
  syntaxNumber: string;
  syntaxType: string;
  syntaxFunction: string;
  syntaxVariable: string;
  syntaxOperator: string;
  syntaxRegexp: string;
}

export function editorTokens({ colors }: AppThemePalette): EditorTokens {
  return {
    background: colors.canvas,
    foreground: colors.text,
    gutterForeground: colors.textMuted,
    gutterActiveForeground: colors.text,
    selection: alpha(colors.accent, 32),
    selectionInactive: alpha(colors.accent, 18),
    lineHighlight: alpha(colors.text, 6),
    cursor: colors.accent,
    guide: colors.border,
    widgetBackground: colors.surface,
    widgetBorder: colors.border,
    scrollbar: alpha(colors.text, 20),
    insertedBackground: alpha(colors.success, 20),
    removedBackground: alpha(colors.danger, 20),
    error: colors.danger,
    warning: colors.warning,
    syntaxComment: colors.textMuted,
    syntaxKeyword: colors.accent,
    syntaxString: colors.success,
    syntaxNumber: colors.warning,
    syntaxType: mix(colors.warning, colors.text, 30),
    syntaxFunction: mix(colors.accent, colors.text, 30),
    syntaxVariable: colors.text,
    syntaxOperator: mix(colors.text, colors.textMuted, 40),
    syntaxRegexp: mix(colors.danger, colors.text, 20),
  };
}

export function editorCssTokens(palette: AppThemePalette): Record<string, string> {
  const t = editorTokens(palette);
  return {
    "--codebot-editor-bg": t.background,
    "--codebot-editor-fg": t.foreground,
    "--codebot-editor-gutter-fg": t.gutterForeground,
    "--codebot-editor-gutter-active-fg": t.gutterActiveForeground,
    "--codebot-editor-selection": t.selection,
    "--codebot-editor-selection-inactive": t.selectionInactive,
    "--codebot-editor-line-highlight": t.lineHighlight,
    "--codebot-editor-cursor": t.cursor,
    "--codebot-editor-guide": t.guide,
    "--codebot-editor-widget-bg": t.widgetBackground,
    "--codebot-editor-widget-border": t.widgetBorder,
    "--codebot-editor-scrollbar": t.scrollbar,
    "--codebot-editor-inserted-bg": t.insertedBackground,
    "--codebot-editor-removed-bg": t.removedBackground,
    "--codebot-editor-error": t.error,
    "--codebot-editor-warning": t.warning,
    "--codebot-syntax-comment": t.syntaxComment,
    "--codebot-syntax-keyword": t.syntaxKeyword,
    "--codebot-syntax-string": t.syntaxString,
    "--codebot-syntax-number": t.syntaxNumber,
    "--codebot-syntax-type": t.syntaxType,
    "--codebot-syntax-function": t.syntaxFunction,
    "--codebot-syntax-variable": t.syntaxVariable,
    "--codebot-syntax-operator": t.syntaxOperator,
    "--codebot-syntax-regexp": t.syntaxRegexp,
  };
}

export interface EditorThemeData {
  base: "vs" | "vs-dark";
  inherit: boolean;
  rules: { token: string; foreground?: string; fontStyle?: string }[];
  colors: Record<string, string>;
}

function bare(color: string): string {
  return color.slice(1, 7);
}

export function monacoThemeData(palette: AppThemePalette): EditorThemeData {
  const t = editorTokens(palette);
  return {
    base: palette.scheme === "dark" ? "vs-dark" : "vs",
    inherit: true,
    rules: [
      { token: "", foreground: bare(t.foreground) },
      { token: "comment", foreground: bare(t.syntaxComment), fontStyle: "italic" },
      { token: "keyword", foreground: bare(t.syntaxKeyword) },
      { token: "string", foreground: bare(t.syntaxString) },
      { token: "number", foreground: bare(t.syntaxNumber) },
      { token: "type", foreground: bare(t.syntaxType) },
      { token: "function", foreground: bare(t.syntaxFunction) },
      { token: "variable", foreground: bare(t.syntaxVariable) },
      { token: "operator", foreground: bare(t.syntaxOperator) },
      { token: "delimiter", foreground: bare(t.syntaxOperator) },
      { token: "regexp", foreground: bare(t.syntaxRegexp) },
    ],
    colors: {
      "editor.background": t.background,
      "editor.foreground": t.foreground,
      "editorLineNumber.foreground": t.gutterForeground,
      "editorLineNumber.activeForeground": t.gutterActiveForeground,
      "editor.selectionBackground": t.selection,
      "editor.inactiveSelectionBackground": t.selectionInactive,
      "editor.lineHighlightBackground": t.lineHighlight,
      "editorCursor.foreground": t.cursor,
      "editorIndentGuide.background1": t.guide,
      "editorWhitespace.foreground": t.guide,
      "editorGutter.background": t.background,
      "editorWidget.background": t.widgetBackground,
      "editorWidget.border": t.widgetBorder,
      "editorSuggestWidget.background": t.widgetBackground,
      "editorSuggestWidget.border": t.widgetBorder,
      "scrollbarSlider.background": t.scrollbar,
      "diffEditor.insertedTextBackground": t.insertedBackground,
      "diffEditor.removedTextBackground": t.removedBackground,
      "editorError.foreground": t.error,
      "editorWarning.foreground": t.warning,
      "minimap.background": t.background,
    },
  };
}

export function effectivePalette(preference: AppAppearancePreference, systemScheme: "light" | "dark"): AppThemePalette {
  const selected = selectedThemePalette(preference);
  if (selected !== null) return selected;
  return builtInThemePalette(preference.appearance === "system" ? systemScheme : preference.appearance);
}

export const EDITOR_THEME_NAME = "codebot";

type EditorThemeListener = (theme: EditorThemeData) => void;

const listeners = new Set<EditorThemeListener>();

let currentTheme: EditorThemeData = monacoThemeData(builtInThemePalette("dark"));

export function currentEditorTheme(): EditorThemeData {
  return currentTheme;
}

export function onEditorTheme(listener: EditorThemeListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

let applied: string[] = [];

export function applyEditorTheme(palette: AppThemePalette): void {
  const style = document.documentElement.style;
  for (const name of applied) style.removeProperty(name);
  applied = [];
  for (const [name, value] of Object.entries(editorCssTokens(palette))) {
    style.setProperty(name, value);
    applied.push(name);
  }
  currentTheme = monacoThemeData(palette);
  for (const listener of listeners) listener(currentTheme);
}
