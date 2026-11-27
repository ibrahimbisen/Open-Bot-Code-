import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/error/lock";

export const messages = {
  "error.lock.claudeStrictNoSandbox":
    "Tryb Ścisły wymaga piaskownicy Claude, której Claude nie może uruchomić na tym komputerze: {reason}. Wybierz Normalny lub Otwarty w ustawieniach projektu albo wybierz innego dostawcę.",
  "error.lock.claudeNoSandboxStrict":
    "Tryb Ścisły wymaga piaskownicy Claude, której Claude nie może uruchomić na tym komputerze. Wybierz Normalny lub Otwarty w ustawieniach projektu albo wybierz innego dostawcę.",
  "error.lock.providerNeedsMacOrLinux":
    "{provider} nie potrafi utrzymać agenta w folderach projektu na tym komputerze, więc OpenBot Code nie uruchamia go w trybie {level}. Wybierz Otwarty w ustawieniach projektu albo wybierz Claude lub Codex.",
  "error.lock.providerToolMissing":
    "{level} wymaga {tool}, czego OpenBot Code nie znalazł. Zainstaluj to albo wybierz Otwarty w ustawieniach projektu.",
  "error.lock.containerMissing":
    "Tryb Ścisły z kontenerem wymaga Dockera lub Podmana, a OpenBot Code żadnego nie znalazł. Zainstaluj jeden z nich albo wybierz Normalny w ustawieniach projektu.",
  "error.lock.containerFailed":
    "Kontener tego projektu nie wystartował: {reason}. Wybierz Normalny w ustawieniach projektu albo napraw narzędzie kontenerowe.",
  "error.lock.codexStrictNeedsSandbox":
    "Tryb Ścisły wymaga piaskownicy Codex, której Codex nie może uruchomić na tym komputerze. Wybierz Normalny lub Otwarty w ustawieniach projektu albo wybierz innego dostawcę.",
  "error.lock.commandAsk":
    "Piaskownica systemu operacyjnego jest niedostępna dla tego agenta, więc to polecenie wymaga Twojej zgody.",
} as const satisfies PartialTranslation<typeof source>;
