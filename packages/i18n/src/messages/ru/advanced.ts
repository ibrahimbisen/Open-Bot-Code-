import type { PartialTranslation } from "../../message";
import type { messages as source } from "../en/advanced";

export const messages = {
  "advanced.tab.title": "Расширенные функции",
  "advanced.tab.description": "Включите функции, которые по умолчанию скрыты.",
  "advanced.section.title": "Скрытые функции",
  "advanced.section.description":
    "Каждый переключатель показывает или скрывает функцию на {server}. У выключенной функции нет кнопок, настроек и инструментов агента. Ваши данные сохраняются.",
  "advanced.adminOnly": "Менять эти переключатели может только владелец или администратор этого сервера.",
  "advanced.loadFailed": "OpenBot Code не удалось прочитать переключатели этого сервера.",
  "advanced.saveFailed": "OpenBot Code не удалось сохранить переключатель.",
  "advanced.routines.title": "Рутины",
  "advanced.routines.description":
    "Задачи по расписанию и вебхуки. Добавляет Расписание на левую панель и Рутины в настройки агента.",
  "advanced.channels.title": "Каналы",
  "advanced.channels.description": "Много агентов в одном чате. Добавляет Каналы на левую панель.",
  "advanced.marketplace.title": "Marketplace",
  "advanced.marketplace.description": "Скиллы, агенты и плагины для установки. Добавляет кнопку Marketplace.",
  "advanced.chatApps.title": "Slack, Discord, Telegram и WhatsApp",
  "advanced.chatApps.description": "Подключайте агентов к чат-приложениям. Добавляет коннекторы чат-приложений.",
  "advanced.chatApps.open.title": "Подключения к чат-приложениям",
  "advanced.chatApps.open.description": "Подключите Slack, Discord, Telegram или WhatsApp.",
  "advanced.chatApps.open.action": "Открыть",
  "advanced.computerUse.title": "Computer Use",
  "advanced.computerUse.description":
    "Позволяет агенту видеть приложения на этом компьютере и управлять ими. Добавляет настройки Computer Use.",
  "advanced.remoteDesktop.title": "Удалённый рабочий стол",
  "advanced.remoteDesktop.description": "Управляйте экраном этого компьютера с другого устройства.",
} as const satisfies PartialTranslation<typeof source>;
