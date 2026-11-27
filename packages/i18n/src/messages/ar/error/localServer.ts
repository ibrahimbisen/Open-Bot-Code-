import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/error/localServer";

export const messages = {
  "error.localServer.refused": "رفض خادم النماذج على {host} الاتصال. شغّل خادم النماذج على ذلك الجهاز.",
  "error.localServer.hostNotFound": "لم يُعثر على العنوان {host}. تحقق من اسم الجهاز.",
  "error.localServer.timeout": "لم يردّ خادم النماذج على {host} خلال {seconds} ثانية.",
  "error.localServer.unreachable": "تعذّر الوصول إلى خادم النماذج على {host}. تأكد من أن الجهاز يعمل وموجود على شبكتك.",
  "error.localServer.redirect":
    "أرسل خادم النماذج على {host} إعادة توجيه. لا يتبع OpenBot Code إعادة التوجيه، للحفاظ على أمان مفتاح API.",
  "error.localServer.keyNeeded": "يحتاج خادم النماذج على {host} إلى مفتاح API. أضف مفتاح هذا الجهاز.",
  "error.localServer.keyRefused": "رفض خادم النماذج على {host} مفتاح API. تحقق من مفتاح هذا الجهاز.",
  "error.localServer.http": "ردّ خادم النماذج على {host} برمز الحالة HTTP {status}.",
  "error.localServer.invalidAnswer": "لم يرسل خادم النماذج على {host} قائمة نماذج متوافقة مع OpenAI.",
  "error.localServer.tooLarge": "ردّ خادم النماذج على {host} كبير جدًا.",
  "error.localServer.gpuUnreachable": "تعذّر الوصول إلى عنوان حالة وحدة GPU {host}.",
  "error.localServer.gpuTimeout": "لم يردّ عنوان حالة وحدة GPU {host} خلال {seconds} ثانية.",
  "error.localServer.gpuRedirect": "أرسل عنوان حالة وحدة GPU {host} إعادة توجيه. لا يتبع OpenBot Code إعادة التوجيه.",
  "error.localServer.gpuHttp": "ردّ عنوان حالة وحدة GPU {host} برمز الحالة HTTP {status}.",
  "error.localServer.gpuInvalid": "لم يرسل عنوان حالة وحدة GPU {host} قيم GPU يستطيع OpenBot Code قراءتها.",
  "error.localServer.gpuTooLarge": "ردّ عنوان حالة وحدة GPU {host} كبير جدًا.",
  "error.localServer.gpuUrlInvalid":
    "يجب أن يكون عنوان URL لحالة GPU عنوان http أو https بلا اسم مستخدم وبلا كلمة مرور.",
  "error.localServer.gpuKeyOtherOrigin":
    "لا يمكن إرسال مفتاح API إلى عنوان URL لحالة GPU إلا إذا كان له نفس المصدر (origin) الخاص بعنوان URL الأساسي.",
  "error.localServer.scanHostInvalid": "أدخل اسم مضيف أو عنوان IP أو عنوان http أو https.",
} as const satisfies PartialTranslation<typeof source>;
