import type { PartialTranslation } from "../../message";
import type { messages as source } from "../en/appUpdate";

export const messages = {
  "appUpdate.server.title": "Сервер обновлений",
  "appUpdate.server.description": "Папка на вашем сервере с установщиками и файлами обновлений OpenBot Code.",
  "appUpdate.server.urlLabel": "URL сервера обновлений",
  "appUpdate.server.placeholder": "https://example.com/codebot-updates/",
  "appUpdate.server.source.settings": "OpenBot Code получает обновления с этого URL.",
  "appUpdate.server.source.environment":
    "OpenBot Code получает обновления с {url}. Этот URL взят из переменной среды CODEBOT_UPDATE_URL.",
  "appUpdate.server.source.build":
    "OpenBot Code получает обновления с {url}. Этот URL взят из этой сборки OpenBot Code.",
  "appUpdate.server.source.none": "Сервер обновлений не задан. OpenBot Code не проверяет обновления.",
  "appUpdate.server.saveFailed": "OpenBot Code не удалось сохранить URL сервера обновлений.",
  "appUpdate.server.loadFailed": "OpenBot Code не удалось прочитать URL сервера обновлений.",
  "appUpdate.autoRestart.title": "Перезапускать автоматически в простое",
  "appUpdate.autoRestart.description":
    "OpenBot Code перезапускается, чтобы установить загруженное обновление, когда ни один агент не работает. Участники ваших серверов ненадолго отключаются.",
} as const satisfies PartialTranslation<typeof source>;
