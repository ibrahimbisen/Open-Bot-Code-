import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/error/slash";

export const messages = {
  "error.slash.remoteFailed": "Sunucu bu komutu tamamlayamadı. Tekrar deneyin.",
  "error.slash.resumeEngineOff": "Motor çalışmıyor. Başlatıp tekrar deneyin.",
  "error.slash.resumeUnsupported": "Bu ajan, kayıtlı bir sohbeti motorundan sürdüremiyor.",
  "error.slash.serverUnsupported": "Bu sunucu eğik çizgi komutlarını listeleyemiyor. Sunucuyu güncelleyin.",
  "error.slash.sessionInUse": "OpenBot Code'daki bir sohbet bu kayıtlı sohbeti zaten kullanıyor.",
  "error.slash.sessionNotFound": "Bu kayıtlı sohbet artık yok. Listeyi yenileyin ve başka birini seçin.",
} as const satisfies PartialTranslation<typeof source>;
