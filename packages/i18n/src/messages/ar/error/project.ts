import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/error/project";

export const messages = {
  "error.project.serverTooOld": "لا يدعم هذا الخادم المشاريع. حدّث OpenBot Code على الكمبيوتر الذي يشغّله.",
  "error.project.remoteFailed": "تعذّر على الخادم إكمال إجراء المشروع هذا. حاول مرة أخرى.",
  "error.project.replyUnsupported": "لا يستطيع هذا الخادم مشاركة إعدادات الرد. حدّث الخادم.",
  "error.project.replyFailed": "تعذّر على الخادم حفظ قاعدة الرد. حاول مرة أخرى.",
  "error.project.notFound": "هذا المشروع لم يعد موجودًا.",
  "error.project.archived": "هذا المشروع مؤرشف. استعده أولًا.",
  "error.project.nameRequired": "أعطِ المشروع اسمًا.",
  "error.project.limit": "وصلت إلى الحد الأقصى لعدد المشاريع ({limit}). احذف مشروعًا أولًا.",
  "error.project.agentLimit": "يمكن أن يضم المشروع {limit} وكلاء على الأكثر.",
  "error.project.agentRequired": "يحتاج المشروع إلى وكيل واحد على الأقل.",
  "error.project.agentNotFound": "هذا الوكيل ليس جزءًا من المشروع.",
  "error.project.agentNameRequired": "أعطِ الوكيل اسمًا.",
  "error.project.runtimeProviderMismatch":
    "يمكن للمحادثة استخدام نموذج آخر من مزوّد وكيلها. لمزوّد آخر، ابدأ المحادثة بوكيل من ذلك المزوّد.",
  "error.project.chatNotFound": "هذه المحادثة لم تعد موجودة.",
  "error.project.cursorInvalid": "هذا الجزء من قائمة المحادثات لم يعد صالحًا. حمّل المحادثات مرة أخرى.",
  "error.project.folderMissing": "هذا المجلد غير موجود.",
  "error.project.folderProtected": "لا يستطيع OpenBot Code استخدام هذا المجلد. اختر مجلدًا آخر.",
  "error.project.mainFolderMissing":
    "المجلد الرئيسي لهذا المشروع مفقود: {path}. استعد المجلد أو اختر مجلدًا رئيسيًا جديدًا.",
  "error.project.ownerOnly": "يمكن فقط للشخص الذي أنشأ هذا المشروع استخدامه.",
  "error.project.memberFolder": "استخدم مجلدًا في مساحة مشاريعك الخاصة على هذا الخادم.",
  "error.project.memberOpenAccess": "يمكن فقط للمالك أو المسؤول منح مشروع وصولًا كاملًا إلى هذا الكمبيوتر.",
} as const satisfies PartialTranslation<typeof source>;
