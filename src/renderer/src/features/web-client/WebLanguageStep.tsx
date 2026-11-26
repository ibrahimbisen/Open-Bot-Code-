import type { AppLanguage } from "@codebot/contracts/app-language";
import type { AppVariant } from "@codebot/contracts/ipc";
import { formatLocale, resolveLocale, type TranslatedLocale } from "@codebot/i18n";
import { LanguageWheel } from "@codebot/ui/features/account/LanguageWheel";
import { createSignal } from "solid-js";
import { StaticI18nProvider } from "../../i18n-context";

export function WebLanguageStep(props: {
  variant: AppVariant;
  language: AppLanguage;
  onChangeLanguage: (language: AppLanguage) => void;
  onDone: () => void;
}) {
  const saved = () => resolveLocale(props.language, navigator.language);
  const [chosen, setChosen] = createSignal<TranslatedLocale | null>(null);
  const shown = () => chosen() ?? saved();
  function finish(): void {
    if (shown() !== saved()) props.onChangeLanguage(shown());
    props.onDone();
  }
  return (
    <StaticI18nProvider
      locale={shown()}
      formatLocale={formatLocale(shown() === saved() ? props.language : shown(), navigator.language)}
    >
      <LanguageWheel
        variant={props.variant}
        systemLocale={navigator.language}
        language={shown()}
        onChange={setChosen}
        onContinue={finish}
      />
    </StaticI18nProvider>
  );
}
