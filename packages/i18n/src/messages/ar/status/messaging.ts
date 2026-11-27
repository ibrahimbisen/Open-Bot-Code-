import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/status/messaging";

export const messages = {
  "status.messaging.working": "جارٍ العمل على ذلك…",
  "status.messaging.queued": "في الانتظار حتى ينتهي طلب سابق. ستصل الإجابة هنا.",
  "status.messaging.busy": "هناك طلبات كثيرة جدًا في الانتظار. أعد المحاولة لاحقًا.",
  "status.messaging.failed": "تعذّر على OpenBot Code إنهاء هذا الطلب. التفاصيل لدى مضيف OpenBot Code.",
  "status.messaging.noAnswer": "انتهى OpenBot Code دون إجابة مكتوبة.",
  "status.messaging.noAgent": "لا يوجد وكيل يستطيع الإجابة هنا بعد. أضف Slack Orchestrator في OpenBot Code.",
  "status.messaging.delegated": "يعمل زميل على ذلك. ستصل الإجابة هنا.",
  "status.messaging.stopped": "تم الإيقاف.",
  "status.messaging.stop": "إيقاف",
  "status.messaging.approvalTitle": "يطلب OpenBot Code الموافقة للمتابعة.",
  "status.messaging.approvalTitleTeammate": "يطلب الزميل {agent} الموافقة للمتابعة.",
  "status.messaging.approvalCommand": "تشغيل أمر",
  "status.messaging.approvalFileChange": "تغيير الملفات",
  "status.messaging.approvalPermissions": "الحصول على أذونات إضافية",
  "status.messaging.approve": "موافقة",
  "status.messaging.deny": "رفض",
  "status.messaging.approvedBy": "وافق عليه {user}.",
  "status.messaging.deniedBy": "رفضه {user}.",
  "status.messaging.answeredOnHost": "تمت الإجابة على مضيف OpenBot Code.",
  "status.messaging.requestInactive": "لم يعد هذا الطلب نشطًا.",
  "status.messaging.onlyRequester": "لا يستطيع فعل ذلك إلا {user}. يستطيع مضيف OpenBot Code أيضًا الإجابة.",
  "status.messaging.hostOnly": "لا يستطيع الإجابة على هذا الطلب إلا مضيف OpenBot Code.",
  "status.messaging.filesSkipped": "لم تُرسَل بعض الملفات: {names}.",
  "status.messaging.orchestratorName": "Slack Orchestrator",
  "status.messaging.orchestratorTitle": "يجيب في Slack ويسأل الفريق",
  "status.messaging.discordNoAgent": "لا يوجد وكيل يستطيع الإجابة هنا بعد. أضف Discord Orchestrator في OpenBot Code.",
  "status.messaging.discordOrchestratorName": "Discord Orchestrator",
  "status.messaging.discordOrchestratorTitle": "يجيب في Discord ويسأل الفريق",
  "status.messaging.integrationsSection": "التكاملات",
  "status.messaging.signInReceived": "استلم OpenBot Code تثبيت Slack. يمكنك إغلاق علامة التبويب هذه.",
  "status.messaging.signInUnknown": "لم يبدأ OpenBot Code تثبيت Slack هذا. ابدأه مرة أخرى في OpenBot Code.",
  "status.messaging.telegramNoAgent":
    "لا يوجد وكيل يستطيع الإجابة هنا بعد. في OpenBot Code، افتح المتجر > التطبيقات > Telegram وانقر على إضافة وكيل.",
  "status.messaging.telegramLinked":
    "OpenBot Code متصل بهذه الدردشة. اذكر {bot} أو ردّ على رسالة من OpenBot Code لسؤال الوكلاء.",
  "status.messaging.telegramNotLinked":
    "OpenBot Code غير متصل بهذه الدردشة. لربطه، افتح تطبيق OpenBot Code وانتقل إلى المتجر ← التطبيقات ← Telegram، ثم اختر «إضافة إلى مجموعة» أو «فتح دردشة مباشرة».",
  "status.messaging.telegramOrchestratorName": "Telegram Orchestrator",
  "status.messaging.telegramOrchestratorTitle": "يجيب في Telegram ويسأل الفريق",
  "status.messaging.whatsappNoAgent": "لا يوجد وكيل يستطيع الإجابة هنا بعد. أضف WhatsApp Orchestrator في OpenBot Code.",
  "status.messaging.whatsappApprovalMenu": "أرسل 1 للموافقة أو 2 للرفض.",
  "status.messaging.whatsappStopMenu": "أرسل stop للإيقاف.",
  "status.messaging.whatsappPairingCode":
    "يجيب هذا الرقم عن الأشخاص الذين سمح لهم مالكه فقط. أعطِ المالك هذا الرمز: {code}",
  "status.messaging.whatsappPairingApproved": "يمكنك الآن إرسال الطلبات إلى هذا الرقم.",
  "status.messaging.whatsappOwnChat": "مراسلة نفسك",
  "status.messaging.whatsappWelcomeOwn":
    "👋 *OpenBot Code متصل*\n\nاكتب هنا لتسأل وكلاءك. يجيب WhatsApp Orchestrator، أو يسند العمل إلى الوكيل المناسب.\n\nأرسل *stop* لإيقاف طلب.",
  "status.messaging.whatsappWelcomeDedicated":
    "👋 *OpenBot Code متصل*\n\nيستطيع الأشخاص الذين تسمح لهم في OpenBot Code الكتابة الآن إلى هذا الرقم. يحصل الشخص الجديد على رمز: وافق عليه في OpenBot Code ضمن الطلبات.\n\nأرسل *stop* لإيقاف طلب.",
  "status.messaging.whatsappOtherCodeBot":
    "يوجد OpenBot Code آخر مرتبط برقم واتساب هذا، لذلك قد تصلك إجابتان. لإصلاح ذلك، افتح الأجهزة المرتبطة في واتساب على هاتفك وسجّل الخروج من OpenBot Code الذي لا تستخدمه.",
  "status.messaging.whatsappPaused":
    "توقّف OpenBot Code عن الرد هنا لمدة 10 دقائق: وصلت رسائل كثيرة جدًا في وقت قصير. إذا كان OpenBot Code آخر مرتبطًا بهذا الرقم، فافتح الأجهزة المرتبطة في واتساب على هاتفك وسجّل الخروج من OpenBot Code الذي لا تستخدمه.",
  "status.messaging.whatsappNotDelivered": "لم يقبل واتساب هذه الإجابة، لذلك لم يستلمها الشخص.",
  "status.messaging.whatsappPartlyDelivered": "لم يقبل واتساب هذه الإجابة كاملة، لذلك استلم الشخص جزءًا منها فقط.",
  "status.messaging.whatsappOrchestratorName": "WhatsApp Orchestrator",
  "status.messaging.whatsappOrchestratorTitle": "يجيب في WhatsApp ويسأل الفريق",
} as const satisfies PartialTranslation<typeof source>;
