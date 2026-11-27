import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/error/slash";

export const messages = {
  "error.slash.resumeUnsupported": "Ten agent nie może wznowić zapisanego czatu ze swojego silnika.",
  "error.slash.resumeEngineOff": "Silnik nie działa. Uruchom go i spróbuj ponownie.",
  "error.slash.sessionNotFound": "Ten zapisany czat już nie istnieje. Odśwież listę i wybierz inny.",
  "error.slash.sessionInUse": "Czat w OpenBot Code już używa tego zapisanego czatu.",
  "error.slash.remoteFailed": "Serwer nie mógł dokończyć tego polecenia. Spróbuj ponownie.",
  "error.slash.serverUnsupported": "Ten serwer nie może wyświetlić poleceń ukośnika. Zaktualizuj serwer.",
} as const satisfies PartialTranslation<typeof source>;
