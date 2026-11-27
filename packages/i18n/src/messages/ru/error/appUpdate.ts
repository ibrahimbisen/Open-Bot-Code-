import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/error/appUpdate";

export const messages = {
  "error.appUpdate.noServer": "Сервер обновлений не задан. Введите URL сервера обновлений в Настройки > Обновления.",
  "error.appUpdate.urlInvalid": "URL сервера обновлений недопустим. Используйте URL, который начинается с https://.",
  "error.appUpdate.urlCredentials": "Удалите имя пользователя и пароль из URL сервера обновлений.",
  "error.appUpdate.urlInsecure":
    "Используйте https:// для URL сервера обновлений. http:// допускается только для компьютера в вашей собственной сети.",
  "error.appUpdate.urlNotSaved": "OpenBot Code не удалось сохранить URL сервера обновлений. Попробуйте ещё раз.",
  "error.appUpdate.manualDownload":
    "Эта сборка для Mac не подписана, поэтому OpenBot Code не может сам устанавливать обновления. Нажми «Скачать», чтобы открыть страницу загрузки, и установи новую версию вручную.",
} as const satisfies PartialTranslation<typeof source>;
