import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/error/explorer";

export const messages = {
  "error.explorer.outside": "Bu yol projenin klasörlerinde değil.",
  "error.explorer.notFound": "Dosya veya klasör yok.",
  "error.explorer.rootProtected": "Bir proje klasörü burada yeniden adlandırılamaz veya silinemez.",
  "error.explorer.invalidName": "Bu ad bir dosya veya klasör için geçerli değil.",
  "error.explorer.notFile": "Bu yol bir dosya değil.",
  "error.explorer.notDirectory": "Bu yol bir klasör değil.",
  "error.explorer.exists": "Bu klasörde {name} adında bir dosya veya klasör zaten var.",
  "error.explorer.unknownAgent": "Bu dosya ağacının ajanı yok.",
  "error.explorer.gitTimeout": "Bir Git komutu çok uzun sürdü ve durduruldu.",
  "error.explorer.gitFailed": "Git bir hata bildirdi: {detail}",
  "error.explorer.serverUnsupported": "Bu sunucu dosyaları gösteremiyor. Sunucuyu güncelleyin.",
  "error.explorer.clientUnsupported": "OpenBot Code'un bu sürümü bir sunucunun dosyalarını gösteremiyor.",
  "error.explorer.remoteFailed": "Sunucu bu dosya eylemini tamamlayamadı. Tekrar deneyin.",
} as const satisfies PartialTranslation<typeof source>;
