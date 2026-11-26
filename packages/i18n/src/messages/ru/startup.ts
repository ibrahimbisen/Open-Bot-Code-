import type { PartialTranslation } from "../../message";
import type { messages as source } from "../en/startup";

export const messages = {
  "startup.failedTitle": "CodeBot не удалось запустить",
  "startup.failedBody":
    "{message}\n\nЛокальные данные не сброшены и не перезаписаны. Шаги восстановления — в руководстве по устранению неполадок.",
  "startup.archiveChangedTitle": "Файлы CodeBot изменены",
  "startup.archiveChangedBody":
    "Другая программа изменила файл CodeBot app.asar. Сейчас CodeBot работает, но после выхода он больше не запустится.\n\nЧтобы исправить это, установите CodeBot заново. Ваши локальные данные сохранятся.",
  "startup.archiveChangedDownload": "Скачать CodeBot",
  "startup.filesDamagedBody":
    "Некоторые файлы CodeBot повреждены или отсутствуют.\n\nЧтобы исправить это, установите CodeBot заново. Ваши локальные данные сохранятся.",
  "startup.newerDataUpdatingTitle": "Обновление CodeBot",
  "startup.newerDataUpdatingBody":
    "Более новая версия CodeBot сохранила ваши данные. CodeBot устанавливает последнюю версию и затем откроется снова.\n\nВаши локальные данные не были сброшены или перезаписаны.",
  "startup.newerDataTitle": "Установите последнюю версию CodeBot",
  "startup.newerDataBody":
    "Более новая версия CodeBot сохранила ваши данные, и эта версия ({version}) не может их открыть. Установите последнюю версию, чтобы открыть данные.\n\nВаши локальные данные не были сброшены или перезаписаны.",
  "startup.newerDataDownload": "Скачать CodeBot",
  "startup.newerDataGuide": "Открыть руководство",
  "startup.newerDataQuit": "Выйти",
  "startup.newerDataLoopTitle": "Последняя версия CodeBot не открылась",
  "startup.newerDataLoopBody":
    "Более новая версия CodeBot сохранила ваши данные, и эта версия ({version}) не может их открыть. CodeBot {loopVersion} несколько раз подряд останавливался до открытия, поэтому он не будет установлен снова.\n\nУстановите версию новее {loopVersion}, когда она появится. Чтобы получить помощь, откройте руководство.\n\nВаши локальные данные не были сброшены или перезаписаны.",
  "startup.newerDataReleases": "Показать версии",
  "startup.recoveryWindowTitle": "Восстановление CodeBot",
  "startup.recoveryTitle": "CodeBot не открылся",
  "startup.recoveryBody": {
    one: "CodeBot {version} остановился до открытия {count} раз подряд. Ваши локальные данные не сброшены и не перезаписаны.",
    few: "CodeBot {version} остановился до открытия {count} раза подряд. Ваши локальные данные не сброшены и не перезаписаны.",
    many: "CodeBot {version} остановился до открытия {count} раз подряд. Ваши локальные данные не сброшены и не перезаписаны.",
    other:
      "CodeBot {version} остановился до открытия {count} раза подряд. Ваши локальные данные не сброшены и не перезаписаны.",
  },
  "startup.recoveryHint":
    "Попробуйте снова или установите последнюю версию, которая открывалась. Чтобы получить помощь, экспортируйте диагностику и отправьте файл вместе с отчётом.",
  "startup.recoveryHintLatest":
    "CodeBot не нашёл более раннюю версию, которая может открыть ваши данные. Попробуйте снова или установите последнюю версию. Чтобы получить помощь, экспортируйте диагностику и отправьте файл вместе с отчётом.",
  "startup.recoveryRetry": "Повторить",
  "startup.recoveryPreviousVersion": "Скачать прошлую версию",
  "startup.recoveryLatestVersion": "Скачать последнюю версию",
  "startup.recoveryExportDiagnostics": "Экспорт диагностики",
  "startup.recoveryOpenDataFolder": "Открыть папку данных",
  "startup.recoveryQuit": "Выйти",
  "startup.recoveryDiagnosticsSaved": "Файл диагностики сохранён.",
  "startup.recoveryActionFailed": "CodeBot не удалось выполнить это действие.",
} as const satisfies PartialTranslation<typeof source>;
