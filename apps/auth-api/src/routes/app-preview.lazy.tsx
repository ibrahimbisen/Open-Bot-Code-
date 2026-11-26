import { DEFAULT_APP_LANGUAGE } from "@codebot/contracts/app-language";
import { loadLocale, resolveLocale } from "@codebot/i18n";
import { createLazyFileRoute } from "@tanstack/solid-router";
import { createSignal, lazy, onSettled, Show } from "solid-js";

const CodeBotPlayground = lazy(() =>
  Promise.all([
    import("@codebot/renderer-preview"),
    loadLocale(resolveLocale(DEFAULT_APP_LANGUAGE, navigator.language)).catch(() => undefined),
  ]).then(([module]) => ({ default: module.CodeBotPlayground })),
);

export const Route = createLazyFileRoute("/app-preview")({ component: AppPreviewPage });

export function AppPreviewPage() {
  const [mounted, setMounted] = createSignal(false);
  onSettled(() => {
    setMounted(true);
  });

  return (
    <div id="root" class="codebot-playground-root" data-preview-variant="landing">
      <Show
        when={mounted()}
        fallback={<div class="codebot-playground-loading" role="status" aria-label="Loading CodeBot preview" />}
      >
        <CodeBotPlayground variant="landing" />
      </Show>
    </div>
  );
}
