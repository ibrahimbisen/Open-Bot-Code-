import type { PartialTranslation } from "../../message";
import type { messages as source } from "../en/localServer";

export const messages = {
  "localServer.settings.title": "Локальные серверы",
  "localServer.settings.description":
    "Машины с моделями в вашей сети, например DGX Spark. Каждая машина — отдельная запись.",
  "localServer.settings.add": "Добавить машину",
  "localServer.settings.empty":
    "Локальных машин пока нет. Добавьте адрес сервера моделей, чтобы использовать его в проекте или чате.",
  "localServer.settings.edit": "Изменить {name}",
  "localServer.settings.remove": "Удалить {name}",
  "localServer.settings.refresh": "Проверить сейчас",
  "localServer.settings.statusOff": "Состояние выключено",
  "localServer.settings.models": {
    one: "{count} модель",
    few: "{count} модели",
    many: "{count} моделей",
    other: "{count} модели",
  },
  "localServer.scan.title": "Найти машину",
  "localServer.scan.description":
    "Введите имя хоста или IP-адрес. OpenBot Code ищет Ollama, LM Studio и vLLM на их обычных портах.",
  "localServer.scan.host": "Хост или адрес",
  "localServer.scan.placeholder": "spark-1.local",
  "localServer.scan.action": "Сканировать",
  "localServer.scan.scanning": "Сканирование",
  "localServer.scan.none": "На этом хосте сервер моделей не найден.",
  "localServer.scan.needsKey": "Нужен ключ API",
  "localServer.scan.add": "Добавить {name}",
  "localServer.dialog.addTitle": "Добавить локальную машину",
  "localServer.dialog.editTitle": "Изменить {name}",
  "localServer.dialog.description":
    "OpenBot Code читает список моделей и состояние по адресу машины, совместимому с OpenAI.",
  "localServer.field.name": "Имя",
  "localServer.field.namePlaceholder": "DGX Spark 1",
  "localServer.field.baseUrl": "Адрес сервера",
  "localServer.field.baseUrlPlaceholder": "http://192.168.1.41:8000/v1",
  "localServer.field.apiKey": "Ключ API (необязательно)",
  "localServer.field.apiKeyKept": "Сохранён. Оставьте пустым, чтобы сохранить его.",
  "localServer.field.gpuUrl": "Адрес состояния GPU (необязательно)",
  "localServer.field.gpuUrlPlaceholder": "http://192.168.1.41:9101/gpu",
  "localServer.field.gpuUrlHelp":
    "Адрес JSON, экспортёра nvidia-smi или экспортёра DCGM, который показывает загрузку и память GPU.",
  "localServer.field.gpuUsesKey": "Отправлять ключ API на адрес состояния GPU",
  "localServer.field.gpuUsesKeyHelp": "Только для адреса с тем же источником (origin), что и у адреса сервера.",
  "localServer.field.monitored": "Показывать состояние этой машины",
  "localServer.field.monitoredHelp":
    "OpenBot Code время от времени проверяет машину и показывает результат в строке состояния.",
  "localServer.error.nameRequired": "Введите имя.",
  "localServer.error.gpuUrlInvalid": "Введите адрес http или https без имени пользователя и пароля.",
  "localServer.error.gpuKeyOtherOrigin":
    "У адреса состояния GPU должен быть тот же источник (origin), что и у адреса сервера.",
  "localServer.test.action": "Проверить",
  "localServer.test.testing": "Проверка",
  "localServer.test.online": "В сети. Найдено: {models}.",
  "localServer.test.onlineKind": "{kind} в сети. Найдено: {models}.",
  "localServer.test.gpuFound": "Состояние GPU прочитано: {count}",
  "localServer.test.gpuCount": { one: "{count} GPU", few: "{count} GPU", many: "{count} GPU", other: "{count} GPU" },
  "localServer.test.offline": "Не в сети. {error}",
  "localServer.test.gpuFailed": "Не удалось получить состояние GPU: {error}",
  "localServer.dialog.saving": "Сохранение",
  "localServer.dialog.saveFailed": "OpenBot Code не удалось сохранить эту машину.",
  "localServer.remove.title": "Удалить {name}?",
  "localServer.remove.description":
    "OpenBot Code перестаёт использовать эту машину. Проектам и чатам, которые используют её модели, нужна другая модель.",
  "localServer.remove.failed": "OpenBot Code не удалось удалить эту машину.",
} as const satisfies PartialTranslation<typeof source>;
