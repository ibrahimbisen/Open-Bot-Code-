import { createSignal } from "solid-js";

export type DocumentColorScheme = "light" | "dark";

const ATTRIBUTE = "data-codebot-color-scheme";

function read(): DocumentColorScheme {
  return document.documentElement.getAttribute(ATTRIBUTE) === "light" ? "light" : "dark";
}

let scheme: (() => DocumentColorScheme) | undefined;

export function documentColorScheme(): DocumentColorScheme {
  if (!scheme) {
    const [current, setCurrent] = createSignal<DocumentColorScheme>(read());
    new MutationObserver(() => setCurrent(read())).observe(document.documentElement, {
      attributeFilter: [ATTRIBUTE],
    });
    scheme = current;
  }
  return scheme();
}

function readThemeStamp(): string {
  const style = document.documentElement.style;
  return [
    read(),
    style.getPropertyValue("--codebot-editor-bg"),
    style.getPropertyValue("--codebot-syntax-keyword"),
  ].join(",");
}

let stamp: (() => string) | undefined;

export function documentThemeStamp(): string {
  if (!stamp) {
    const [current, setCurrent] = createSignal<string>(readThemeStamp());
    new MutationObserver(() => setCurrent(readThemeStamp())).observe(document.documentElement, {
      attributeFilter: [ATTRIBUTE, "style"],
    });
    stamp = current;
  }
  return stamp();
}
