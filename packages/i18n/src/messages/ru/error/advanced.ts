import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/error/advanced";

export const messages = {
  "error.advanced.unsupported": "Этот сервер не поддерживает переключатели расширенных функций. Обновите сервер.",
  "error.advanced.invalidChange": "Изменение расширенной функции недопустимо.",
  "error.advanced.featureOff":
    "Этот инструмент недоступен, потому что функция выключена. Пользователь может включить её в Настройки > Расширенные функции.",
} as const satisfies PartialTranslation<typeof source>;
