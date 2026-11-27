import type { PartialTranslation } from "../../message";
import type { messages as source } from "../en/serverMode";

export const messages = {
  "serverMode.switch.label": "Где работают агенты",
  "serverMode.switch.thisComputer": "Этот компьютер",
  "serverMode.switch.homeServer": "Домашний сервер",
  "serverMode.switch.homeServerNamed": "Запускать агентов на {name}",
  "serverMode.switch.noHomeServer": "Домашнего сервера пока нет. Выберите, чтобы подключиться к нему.",
  "serverMode.switch.useComputer": "Запускать агентов на этом компьютере",
  "serverMode.switch.useHomeServer": "Запускать агентов на домашнем сервере",
} as const satisfies PartialTranslation<typeof source>;
