import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/error/appUpdate";

export const messages = {
  "error.appUpdate.noServer":
    "Güncelleme sunucusu ayarlanmamış. Güncelleme sunucusu URL'sini Ayarlar > Güncellemeler bölümüne girin.",
  "error.appUpdate.urlInvalid": "Güncelleme sunucusu URL'si geçerli değil. https:// ile başlayan bir URL kullanın.",
  "error.appUpdate.urlCredentials": "Güncelleme sunucusu URL'sinden kullanıcı adını ve parolayı kaldırın.",
  "error.appUpdate.urlInsecure":
    "Güncelleme sunucusu URL'si için https:// kullanın. http:// yalnızca kendi ağınızdaki bir bilgisayar için izinlidir.",
  "error.appUpdate.urlNotSaved": "OpenBot Code güncelleme sunucusu URL'sini kaydedemedi. Tekrar deneyin.",
  "error.appUpdate.manualDownload":
    "Bu Mac sürümü imzalı değil, bu yüzden OpenBot Code güncellemeleri kendisi yükleyemez. İndirme sayfasını açmak için İndir'i seç, ardından yeni sürümü elle yükle.",
} as const satisfies PartialTranslation<typeof source>;
