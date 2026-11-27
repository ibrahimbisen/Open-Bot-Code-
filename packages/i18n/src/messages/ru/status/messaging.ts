import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/status/messaging";

export const messages = {
  "status.messaging.working": "Уже работаю…",
  "status.messaging.queued": "Ожидание: предыдущий запрос ещё выполняется. Ответ придёт сюда.",
  "status.messaging.busy": "В очереди слишком много запросов. Повторите попытку позже.",
  "status.messaging.failed": "OpenBot Code не смог завершить этот запрос. Подробности — на хосте OpenBot Code.",
  "status.messaging.noAnswer": "OpenBot Code завершил работу без письменного ответа.",
  "status.messaging.noAgent":
    "Пока нет агента, который мог бы здесь ответить. Добавьте Оркестратора Slack в OpenBot Code.",
  "status.messaging.delegated": "Над этим работает один из агентов. Ответ придёт сюда.",
  "status.messaging.stopped": "Остановлено.",
  "status.messaging.stop": "Остановить",
  "status.messaging.approvalTitle": "OpenBot Code просит подтверждения, чтобы продолжить.",
  "status.messaging.approvalTitleTeammate": "Агент {agent} просит подтверждения, чтобы продолжить.",
  "status.messaging.approvalCommand": "Выполнить команду",
  "status.messaging.approvalFileChange": "Изменить файлы",
  "status.messaging.approvalPermissions": "Получить дополнительные разрешения",
  "status.messaging.approve": "Одобрить",
  "status.messaging.deny": "Отклонить",
  "status.messaging.approvedBy": "Одобрено: {user}.",
  "status.messaging.deniedBy": "Отклонено: {user}.",
  "status.messaging.answeredOnHost": "Отвечено на хосте OpenBot Code.",
  "status.messaging.requestInactive": "Этот запрос больше не активен.",
  "status.messaging.onlyRequester": "Это может сделать только {user}. Ответить также может хост OpenBot Code.",
  "status.messaging.hostOnly": "На этот запрос может ответить только хост OpenBot Code.",
  "status.messaging.filesSkipped": "Некоторые файлы не отправлены: {names}.",
  "status.messaging.orchestratorName": "Оркестратор Slack",
  "status.messaging.orchestratorTitle": "Отвечает в Slack и обращается к команде",
  "status.messaging.discordNoAgent":
    "Пока нет агента, который мог бы здесь ответить. Добавьте Оркестратора Discord в OpenBot Code.",
  "status.messaging.discordOrchestratorName": "Оркестратор Discord",
  "status.messaging.discordOrchestratorTitle": "Отвечает в Discord и обращается к команде",
  "status.messaging.integrationsSection": "Интеграции",
  "status.messaging.signInReceived": "OpenBot Code получил установку Slack. Эту вкладку можно закрыть.",
  "status.messaging.signInUnknown": "OpenBot Code не начинал эту установку Slack. Начните её заново в OpenBot Code.",
  "status.messaging.telegramNoAgent":
    "Пока нет агента, который мог бы здесь ответить. В OpenBot Code откройте Маркетплейс > Приложения > Telegram и нажмите «Добавить агента».",
  "status.messaging.telegramLinked":
    "OpenBot Code подключён к этому чату. Упомяните {bot} или ответьте на сообщение OpenBot Code, чтобы обратиться к агентам.",
  "status.messaging.telegramNotLinked":
    "OpenBot Code не подключён к этому чату. Чтобы подключить его, откройте приложение OpenBot Code, перейдите в Каталог → Приложения → Telegram и выберите «Добавить в группу» или «Открыть личный чат».",
  "status.messaging.telegramOrchestratorName": "Оркестратор Telegram",
  "status.messaging.telegramOrchestratorTitle": "Отвечает в Telegram и обращается к команде",
  "status.messaging.whatsappNoAgent":
    "Пока нет агента, который мог бы здесь ответить. Добавьте Оркестратора WhatsApp в OpenBot Code.",
  "status.messaging.whatsappApprovalMenu": "Ответьте 1, чтобы одобрить, или 2, чтобы отклонить.",
  "status.messaging.whatsappStopMenu": "Ответьте «stop», чтобы остановить.",
  "status.messaging.whatsappPairingCode":
    "Этот номер отвечает только людям, которым разрешил владелец. Передайте владельцу этот код: {code}",
  "status.messaging.whatsappPairingApproved": "Теперь вы можете отправлять запросы на этот номер.",
  "status.messaging.whatsappOwnChat": "Сообщение себе",
  "status.messaging.whatsappWelcomeOwn":
    "👋 *OpenBot Code подключён*\n\nПишите сюда, чтобы обратиться к своим агентам. WhatsApp Orchestrator отвечает сам или передаёт работу нужному агенту.\n\nОтправьте *stop*, чтобы остановить запрос.",
  "status.messaging.whatsappWelcomeDedicated":
    "👋 *OpenBot Code подключён*\n\nЛюди, которым вы разрешите в OpenBot Code, теперь могут писать на этот номер. Новый человек получит код: одобрите его в OpenBot Code в разделе «Запросы».\n\nОтправьте *stop*, чтобы остановить запрос.",
  "status.messaging.whatsappOtherCodeBot":
    "К этому номеру WhatsApp привязан ещё один OpenBot Code, поэтому вы можете получать два ответа. Чтобы это исправить, откройте «Связанные устройства» в WhatsApp на телефоне и выйдите из OpenBot Code, которым вы не пользуетесь.",
  "status.messaging.whatsappPaused":
    "OpenBot Code перестал отвечать здесь на 10 минут: за короткое время пришло слишком много сообщений. Если к этому номеру привязан ещё один OpenBot Code, откройте «Связанные устройства» в WhatsApp на телефоне и выйдите из OpenBot Code, которым вы не пользуетесь.",
  "status.messaging.whatsappNotDelivered": "WhatsApp не принял этот ответ, поэтому человек его не получил.",
  "status.messaging.whatsappPartlyDelivered":
    "WhatsApp принял этот ответ не полностью, поэтому человек получил только его часть.",
  "status.messaging.whatsappOrchestratorName": "Оркестратор WhatsApp",
  "status.messaging.whatsappOrchestratorTitle": "Отвечает в WhatsApp и обращается к команде",
} as const satisfies PartialTranslation<typeof source>;
