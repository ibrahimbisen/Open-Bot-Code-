import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/error/project";

export const messages = {
  "error.project.serverTooOld":
    "Этот сервер не поддерживает проекты. Обновите OpenBot Code на компьютере, на котором он работает.",
  "error.project.remoteFailed": "Серверу не удалось завершить это действие с проектом. Попробуйте ещё раз.",
  "error.project.replyUnsupported": "Этот сервер не может делиться настройками ответов. Обновите сервер.",
  "error.project.replyFailed": "Серверу не удалось сохранить правило ответов. Попробуйте ещё раз.",
  "error.project.notFound": "Этого проекта больше нет.",
  "error.project.archived": "Этот проект в архиве. Сначала восстановите его.",
  "error.project.nameRequired": "Дайте проекту имя.",
  "error.project.limit": "Достигнуто максимальное число проектов ({limit}). Сначала удалите проект.",
  "error.project.agentLimit": "В проекте может быть не больше {limit} агентов.",
  "error.project.agentRequired": "В проекте нужен хотя бы один агент.",
  "error.project.agentNotFound": "Этот агент не входит в проект.",
  "error.project.agentNameRequired": "Дайте агенту имя.",
  "error.project.runtimeProviderMismatch":
    "Чат может использовать другую модель провайдера своего агента. Для другого провайдера начните чат с агентом этого провайдера.",
  "error.project.chatNotFound": "Этого чата больше нет.",
  "error.project.cursorInvalid": "Эта часть списка чатов больше недействительна. Загрузите чаты снова.",
  "error.project.folderMissing": "Этой папки не существует.",
  "error.project.folderProtected": "OpenBot Code не может использовать эту папку. Выберите другую папку.",
  "error.project.mainFolderMissing":
    "Основная папка этого проекта отсутствует: {path}. Восстановите папку или выберите новую основную папку.",
  "error.project.ownerOnly": "Пользоваться этим проектом может только тот, кто его создал.",
  "error.project.memberFolder": "Используйте папку в своём пространстве проектов на этом сервере.",
  "error.project.memberOpenAccess":
    "Дать проекту полный доступ к этому компьютеру может только владелец или администратор.",
} as const satisfies PartialTranslation<typeof source>;
