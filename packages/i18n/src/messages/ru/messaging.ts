import type { PartialTranslation } from "../../message";
import type { messages as source } from "../en/messaging";

export const messages = {
  "messaging.help.invalid_token":
    "Slack больше не принимает OpenBot Code в этом рабочем пространстве. Возможно, приложение удалили. Подключите рабочее пространство заново.",
  "messaging.help.secret_storage_unavailable":
    "OpenBot Code не может прочитать сохранённые токены на этом компьютере. Отключите рабочее пространство и подключите его снова.",
  "messaging.help.relay_unavailable":
    "OpenBot Code не может получать события Slack на этом компьютере. Войдите в аккаунт, задайте компьютеру имя в настройках сервера и не закрывайте OpenBot Code.",
  "messaging.help.not_linked":
    "Это рабочее пространство не связано с этим сервером. Выберите «Переподключить», чтобы связать его.",
  "messaging.discordHelp.invalid_token":
    "Discord больше не принимает OpenBot Code на этом сервере Discord. Возможно, приложение удалили. Подключите сервер Discord заново.",
  "messaging.discordHelp.secret_storage_unavailable":
    "OpenBot Code не может прочитать сохранённые токены на этом компьютере. Отключите сервер Discord и подключите его снова.",
  "messaging.discordHelp.relay_unavailable":
    "OpenBot Code не может получать события Discord на этом компьютере. Войдите в аккаунт, задайте компьютеру имя в настройках сервера и не закрывайте OpenBot Code.",
  "messaging.discordHelp.not_linked":
    "Этот сервер Discord не связан с этим сервером OpenBot Code. Выберите «Переподключить», чтобы связать его.",
} as const satisfies PartialTranslation<typeof source>;
