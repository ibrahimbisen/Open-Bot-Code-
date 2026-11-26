import "./extension.css";
import { formatLocale, loadLocale, localeDirection, resolveLocale } from "@codebot/i18n";
import { TextProvider } from "@codebot/ui/text";
import { render } from "@solidjs/web";
import { App } from "./App";
import { MicrophonePage } from "./MicrophonePage";

const root = document.getElementById("root");
if (!root) throw new Error("The side panel has no root element.");
const microphonePage = document.body.dataset.page === "microphone";
const locale = resolveLocale("system", navigator.language);
document.documentElement.lang = locale;
document.documentElement.dir = localeDirection(locale);

const light = window.matchMedia("(prefers-color-scheme: light)");
const applyScheme = () =>
  light.matches
    ? document.documentElement.setAttribute("data-codebot-color-scheme", "light")
    : document.documentElement.removeAttribute("data-codebot-color-scheme");
applyScheme();
light.addEventListener("change", applyScheme);

await loadLocale(locale).catch(() => undefined);
render(
  () => (
    <TextProvider locale={locale} formatLocale={formatLocale("system", navigator.language)}>
      {microphonePage ? <MicrophonePage /> : <App />}
    </TextProvider>
  ),
  root,
);
