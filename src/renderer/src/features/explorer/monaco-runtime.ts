import { currentEditorTheme, onEditorTheme } from "../../editor-theme";
import type { monaco as MonacoApi } from "./monaco-setup";

export type Monaco = typeof MonacoApi;

export const MONACO_THEME = "codebot";

let loading: Promise<Monaco> | undefined;

export function loadMonaco(): Promise<Monaco> {
  loading ??= import("./monaco-setup").then(
    (module) => module.monaco,
    (error: unknown) => {
      loading = undefined;
      throw error;
    },
  );
  return loading;
}

const THEME_TOKENS = {
  "editor.background": "--codebot-bg-canvas",
  "editor.foreground": "--codebot-text-primary",
  "editorLineNumber.foreground": "--codebot-text-dim",
  "editorLineNumber.activeForeground": "--codebot-text-secondary",
  "editor.lineHighlightBackground": "--codebot-hover",
  "editor.lineHighlightBorder": "--codebot-transparent",
  "editor.selectionBackground": "--codebot-accent-soft",
  "editor.inactiveSelectionBackground": "--codebot-bg-control",
  "editor.selectionHighlightBackground": "--codebot-bg-control",
  "editor.wordHighlightBackground": "--codebot-bg-control",
  "editor.findMatchBackground": "--codebot-warning-soft",
  "editor.findMatchHighlightBackground": "--codebot-bg-control-hover",
  "editorCursor.foreground": "--codebot-text-primary",
  "editorIndentGuide.background1": "--codebot-border",
  "editorIndentGuide.activeBackground1": "--codebot-border-strong",
  "editorWhitespace.foreground": "--codebot-border",
  "editorGutter.background": "--codebot-bg-canvas",
  "editorWidget.background": "--codebot-bg-surface-raised",
  "editorWidget.border": "--codebot-border",
  "editorSuggestWidget.background": "--codebot-bg-surface-raised",
  "editorSuggestWidget.border": "--codebot-border",
  "editorSuggestWidget.selectedBackground": "--codebot-bg-control-hover",
  "editorHoverWidget.background": "--codebot-bg-surface-raised",
  "editorHoverWidget.border": "--codebot-border",
  "input.background": "--codebot-bg-control",
  "input.border": "--codebot-border",
  "input.foreground": "--codebot-text-primary",
  focusBorder: "--codebot-border-focus",
  "scrollbarSlider.background": "--codebot-bg-control-hover",
  "scrollbarSlider.hoverBackground": "--codebot-bg-control-active",
  "scrollbarSlider.activeBackground": "--codebot-bg-control-active",
  "diffEditor.insertedTextBackground": "--codebot-success-soft",
  "diffEditor.insertedLineBackground": "--codebot-success-wash",
  "diffEditor.removedTextBackground": "--codebot-danger-soft",
  "diffEditor.removedLineBackground": "--codebot-danger-soft",
  "diffEditor.diagonalFill": "--codebot-border",
  "diffEditorGutter.insertedLineBackground": "--codebot-success-soft",
  "diffEditorGutter.removedLineBackground": "--codebot-danger-soft",
  "editorOverviewRuler.border": "--codebot-transparent",
} as const;

let probe: CanvasRenderingContext2D | null | undefined;

function colorOf(token: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
  probe ??= document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  if (!probe || value === "") return "#00000000";
  probe.clearRect(0, 0, 1, 1);
  probe.fillStyle = "#000000";
  probe.fillStyle = value;
  probe.fillRect(0, 0, 1, 1);
  const [red = 0, green = 0, blue = 0, alpha = 0] = probe.getImageData(0, 0, 1, 1).data;
  const hex = (part: number) => part.toString(16).padStart(2, "0");
  return `#${hex(red)}${hex(green)}${hex(blue)}${hex(alpha)}`;
}

let followingTheme = false;

export function applyMonacoTheme(monaco: Monaco): void {
  const theme = currentEditorTheme();
  const colors: Record<string, string> = {};
  for (const [name, token] of Object.entries(THEME_TOKENS)) colors[name] = colorOf(token);
  monaco.editor.defineTheme(MONACO_THEME, {
    base: theme.base,
    inherit: true,
    rules: theme.rules,
    colors: { ...colors, ...theme.colors },
  });
  monaco.editor.setTheme(MONACO_THEME);
  if (followingTheme) return;
  followingTheme = true;
  onEditorTheme(() => requestAnimationFrame(() => applyMonacoTheme(monaco)));
}

const LANGUAGE_BY_NAME: Readonly<Record<string, string>> = {
  dockerfile: "dockerfile",
  makefile: "makefile",
  ".gitignore": "ini",
  ".env": "ini",
  ".editorconfig": "ini",
};

const LANGUAGE_BY_EXTENSION: Readonly<Record<string, string>> = {
  tsx: "typescript",
  mts: "typescript",
  cts: "typescript",
  jsx: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  jsonc: "json",
  json5: "json",
  md: "markdown",
  mdx: "markdown",
  yml: "yaml",
  sh: "shell",
  bash: "shell",
  zsh: "shell",
  ps1: "powershell",
  py: "python",
  rs: "rust",
  rb: "ruby",
  kt: "kotlin",
  kts: "kotlin",
  cs: "csharp",
  h: "cpp",
  hpp: "cpp",
  cc: "cpp",
  cxx: "cpp",
  htm: "html",
  vue: "html",
  svelte: "html",
  svg: "xml",
  toml: "ini",
  conf: "ini",
  cfg: "ini",
  env: "ini",
  txt: "plaintext",
  log: "plaintext",
};

export function monacoLanguageFor(monaco: Monaco, name: string): string {
  const lower = name.toLowerCase();
  const exact = LANGUAGE_BY_NAME[lower];
  if (exact) return exact;
  const dot = lower.lastIndexOf(".");
  const extension = dot === -1 ? "" : lower.slice(dot + 1);
  const mapped = LANGUAGE_BY_EXTENSION[extension];
  if (mapped) return mapped;
  const found = monaco.languages
    .getLanguages()
    .find((language: MonacoApi.languages.ILanguageExtensionPoint) => language.extensions?.includes(`.${extension}`));
  return found?.id ?? "plaintext";
}
