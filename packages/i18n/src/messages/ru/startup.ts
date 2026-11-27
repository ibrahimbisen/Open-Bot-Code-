import type { PartialTranslation } from "../../message";
import type { messages as source } from "../en/startup";

export const messages = {
  "startup.failedTitle": "OpenBot Code не удалось запустить",
  "startup.failedBody":
    "{message}\n\nЛокальные данные не сброшены и не перезаписаны. Шаги восстановления — в руководстве по устранению неполадок.",
  "startup.archiveChangedTitle": "Файлы OpenBot Code изменены",
  "startup.archiveChangedBody":
    "Другая программа изменила файл OpenBot Code app.asar. Сейчас OpenBot Code работает, но после выхода он больше не запустится.\n\nЧтобы исправить это, установите OpenBot Code заново. Ваши локальные данные сохранятся.",
  "startup.archiveChangedDownload": "Скачать OpenBot Code",
  "startup.filesDamagedBody":
    "Некоторые файлы OpenBot Code повреждены или отсутствуют.\n\nЧтобы исправить это, установите OpenBot Code заново. Ваши локальные данные сохранятся.",
  "startup.newerDataUpdatingTitle": "Обновление OpenBot Code",
  "startup.newerDataUpdatingBody":
    "Более новая версия OpenBot Code сохранила ваши данные. OpenBot Code устанавливает последнюю версию и затем откроется снова.\n\nВаши локальные данные не были сброшены или перезаписаны.",
  "startup.newerDataTitle": "Установите последнюю версию OpenBot Code",
  "startup.newerDataBody":
    "Более новая версия OpenBot Code сохранила ваши данные, и эта версия ({version}) не может их открыть. Установите последнюю версию, чтобы открыть данные.\n\nВаши локальные данные не были сброшены или перезаписаны.",
  "startup.newerDataDownload": "Скачать OpenBot Code",
  "startup.newerDataGuide": "Открыть руководство",
  "startup.newerDataQuit": "Выйти",
  "startup.newerDataLoopTitle": "Последняя версия OpenBot Code не открылась",
  "startup.newerDataLoopBody":
    "Более новая версия OpenBot Code сохранила ваши данные, и эта версия ({version}) не может их открыть. OpenBot Code {loopVersion} несколько раз подряд останавливался до открытия, поэтому он не будет установлен снова.\n\nУстановите версию новее {loopVersion}, когда она появится. Чтобы получить помощь, откройте руководство.\n\nВаши локальные данные не были сброшены или перезаписаны.",
  "startup.newerDataReleases": "Показать версии",
  "startup.recoveryWindowTitle": "Восстановление OpenBot Code",
  "startup.recoveryTitle": "OpenBot Code не открылся",
  "startup.recoveryBody": {
    one: "OpenBot Code {version} остановился до открытия {count} раз подряд. Ваши локальные данные не сброшены и не перезаписаны.",
    few: "OpenBot Code {version} остановился до открытия {count} раза подряд. Ваши локальные данные не сброшены и не перезаписаны.",
    many: "OpenBot Code {version} остановился до открытия {count} раз подряд. Ваши локальные данные не сброшены и не перезаписаны.",
    other:
      "OpenBot Code {version} остановился до открытия {count} раза подряд. Ваши локальные данные не сброшены и не перезаписаны.",
  },
  "startup.recoveryHint":
    "Попробуйте снова или установите последнюю версию, которая открывалась. Чтобы получить помощь, экспортируйте диагностику и отправьте файл вместе с отчётом.",
  "startup.recoveryHintLatest":
    "OpenBot Code не нашёл более раннюю версию, которая может открыть ваши данные. Попробуйте снова или установите последнюю версию. Чтобы получить помощь, экспортируйте диагностику и отправьте файл вместе с отчётом.",
  "startup.recoveryRetry": "Повторить",
  "startup.recoveryPreviousVersion": "Скачать прошлую версию",
  "startup.recoveryLatestVersion": "Скачать последнюю версию",
  "startup.recoveryExportDiagnostics": "Экспорт диагностики",
  "startup.recoveryOpenDataFolder": "Открыть папку данных",
  "startup.recoveryQuit": "Выйти",
  "startup.recoveryDiagnosticsSaved": "Файл диагностики сохранён.",
  "startup.recoveryActionFailed": "OpenBot Code не удалось выполнить это действие.",
} as const satisfies PartialTranslation<typeof source>;
