import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/error/appUpdate";

export const messages = {
  "error.appUpdate.noServer": "Сервер обновлений не задан. Введите URL сервера обновлений в Настройки > Обновления.",
  "error.appUpdate.urlInvalid": "URL сервера обновлений недопустим. Используйте URL, который начинается с https://.",
  "error.appUpdate.urlCredentials": "Удалите имя пользователя и пароль из URL сервера обновлений.",
  "error.appUpdate.urlInsecure":
    "Используйте https:// для URL сервера обновлений. http:// допускается только для компьютера в вашей собственной сети.",
  "error.appUpdate.urlNotSaved": "OpenBot Code не удалось сохранить URL сервера обновлений. Попробуйте ещё раз.",
} as const satisfies PartialTranslation<typeof source>;
