import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/error/explorer";

export const messages = {
  "error.explorer.outside": "Этого пути нет в папках проекта.",
  "error.explorer.notFound": "Файл или папка не существует.",
  "error.explorer.rootProtected": "Папку проекта нельзя здесь переименовать или удалить.",
  "error.explorer.invalidName": "Это имя недопустимо для файла или папки.",
  "error.explorer.notFile": "Этот путь не является файлом.",
  "error.explorer.notDirectory": "Этот путь не является папкой.",
  "error.explorer.exists": "В этой папке уже есть файл или папка с именем {name}.",
  "error.explorer.unknownAgent": "Агента этого дерева файлов не существует.",
  "error.explorer.gitTimeout": "Команда Git выполнялась слишком долго и была остановлена.",
  "error.explorer.gitFailed": "Git сообщил об ошибке: {detail}",
  "error.explorer.serverUnsupported": "Этот сервер не может показывать файлы. Обновите сервер.",
  "error.explorer.clientUnsupported": "Эта версия OpenBot Code не может показать файлы сервера.",
  "error.explorer.remoteFailed": "Серверу не удалось завершить это действие с файлом. Попробуйте ещё раз.",
} as const satisfies PartialTranslation<typeof source>;
