import { CHAT_MERMAID_FONT_FAMILY, mermaidImageUrl } from "@codebot/contracts/chat-preview";
import type { DocumentColorScheme } from "../../document-color-scheme";

type Mermaid = typeof import("mermaid")["default"];

let mermaid: Promise<Mermaid> | undefined;

function loadMermaid(): Promise<Mermaid> {
  mermaid ??= import("mermaid").then(
    ({ default: api }) => {
      initializeMermaid(api, "dark", null);
      return api;
    },
    (error: unknown) => {
      mermaid = undefined;
      throw error;
    },
  );
  return mermaid;
}

const PALETTE_TOKENS = {
  background: "--codebot-editor-bg",
  text: "--codebot-editor-fg",
  node: "--codebot-editor-widget-bg",
  line: "--codebot-editor-guide",
  accent: "--codebot-syntax-keyword",
} as const;

type PaletteColors = Record<keyof typeof PALETTE_TOKENS, string>;

const HEX_COLOR = /^#[0-9a-f]{6}$/iu;

function readPaletteColors(): PaletteColors | null {
  if (typeof document === "undefined") return null;
  const style = getComputedStyle(document.documentElement);
  const read = (name: string) => style.getPropertyValue(name).trim();
  const colors: PaletteColors = {
    background: read(PALETTE_TOKENS.background),
    text: read(PALETTE_TOKENS.text),
    node: read(PALETTE_TOKENS.node),
    line: read(PALETTE_TOKENS.line),
    accent: read(PALETTE_TOKENS.accent),
  };
  return Object.values(colors).every((value) => HEX_COLOR.test(value)) ? colors : null;
}

function paletteKey(colors: PaletteColors | null): string {
  return colors === null ? "" : Object.values(colors).join(",");
}

function initializeMermaid(api: Mermaid, scheme: DocumentColorScheme, colors: PaletteColors | null): void {
  api.initialize({
    startOnLoad: false,
    securityLevel: "strict",
    theme: colors === null ? (scheme === "light" ? "neutral" : "dark") : "base",
    themeVariables:
      colors === null
        ? { dropShadow: "none" }
        : {
            dropShadow: "none",
            darkMode: scheme === "dark",
            background: colors.background,
            primaryColor: colors.node,
            primaryTextColor: colors.text,
            primaryBorderColor: colors.line,
            secondaryColor: colors.node,
            tertiaryColor: colors.background,
            lineColor: colors.text,
            textColor: colors.text,
            mainBkg: colors.node,
            nodeBorder: colors.line,
            clusterBkg: colors.background,
            clusterBorder: colors.line,
            edgeLabelBackground: colors.background,
            noteBkgColor: colors.node,
            noteTextColor: colors.text,
            noteBorderColor: colors.accent,
          },
    fontFamily: CHAT_MERMAID_FONT_FAMILY,
    htmlLabels: false,
    suppressErrorRendering: true,
  });
}

export type MermaidDiagram =
  | { status: "ready"; url: string }
  | { status: "unavailable" }
  | { status: "invalid"; message: string };

const DIAGRAM_CACHE_LIMIT = 100;
const diagramCache = new Map<string, Promise<MermaidDiagram>>();
let diagramCount = 0;
let drawing: Promise<unknown> = Promise.resolve();

export function mermaidDiagram(source: string, scheme: DocumentColorScheme): Promise<MermaidDiagram> {
  const key = `${scheme}\n${paletteKey(readPaletteColors())}\n${source}`;
  const cached = diagramCache.get(key);
  if (cached) return cached;
  diagramCount += 1;
  const id = `codebot-mermaid-${diagramCount}`;
  const diagram = drawing.then(() => drawDiagram(id, key, source, scheme));
  drawing = diagram;
  if (diagramCache.size >= DIAGRAM_CACHE_LIMIT) {
    const oldest = diagramCache.keys().next();
    if (!oldest.done) diagramCache.delete(oldest.value);
  }
  diagramCache.set(key, diagram);
  return diagram;
}

async function drawDiagram(
  id: string,
  key: string,
  source: string,
  scheme: DocumentColorScheme,
): Promise<MermaidDiagram> {
  let api: Mermaid;
  try {
    api = await loadMermaid();
  } catch {
    diagramCache.delete(key);
    return { status: "unavailable" };
  }
  try {
    initializeMermaid(api, scheme, readPaletteColors());
    const { svg } = await api.render(id, source);
    return { status: "ready", url: mermaidImageUrl(svg) };
  } catch (error) {
    return { status: "invalid", message: mermaidErrorMessage(error) };
  }
}

function mermaidErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  return message.trim().split("\n").slice(0, 6).join("\n");
}
