import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/error/slash";

export const messages = {
  "error.slash.resumeUnsupported": "Этот агент не может возобновить сохранённый чат из своего движка.",
  "error.slash.resumeEngineOff": "Движок не запущен. Запустите его и попробуйте ещё раз.",
  "error.slash.sessionNotFound": "Этого сохранённого чата больше нет. Обновите список и выберите другой.",
  "error.slash.sessionInUse": "Чат в OpenBot Code уже использует этот сохранённый чат.",
  "error.slash.remoteFailed": "Серверу не удалось выполнить эту команду. Попробуйте ещё раз.",
  "error.slash.serverUnsupported": "Этот сервер не может показать слэш-команды. Обновите сервер.",
} as const satisfies PartialTranslation<typeof source>;
