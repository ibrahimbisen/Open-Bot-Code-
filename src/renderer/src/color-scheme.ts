import type { AppAppearance } from "@codebot/contracts/app-appearance";

const LIGHT_QUERY = "(prefers-color-scheme: light)";

function applyColorScheme(scheme: "light" | "dark"): void {
  document.documentElement.dataset.codebotColorScheme = scheme;
}

export function syncColorScheme(choice: () => AppAppearance) {
  const query = window.matchMedia(LIGHT_QUERY);
  const refresh = () => {
    const appearance = choice();
    applyColorScheme(appearance === "system" ? (query.matches ? "light" : "dark") : appearance);
  };
  refresh();
  query.addEventListener("change", refresh);
  return {
    refresh,
    stop() {
      query.removeEventListener("change", refresh);
      delete document.documentElement.dataset.codebotColorScheme;
    },
  };
}
