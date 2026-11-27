import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/error/auth";

export const messages = {
  "error.auth.serviceUnavailable":
    "OpenBot Code hesap hizmetine ulaşamadı. API'nin çalıştığını kontrol edin, ardından tekrar deneyin.",
  "error.auth.sessionTimeout":
    "OpenBot Code zamanında yanıt vermedi. İnternet bağlantınızı kontrol edin, ardından yeniden deneyin.",
  "error.auth.networkBlocked":
    "Bu ağdaki bir güvenlik duvarı veya proxy, OpenBot Code'un {host} adresine ulaşmasını engelledi. Ağ yöneticinizden {host} adresine izin vermesini isteyin, ardından tekrar deneyin.",
  "error.auth.signInFirst": "Önce OpenBot Code'da oturum açın.",
  "error.auth.accountServiceNotConfigured": "Önce hesap hizmetinizin adresini girin.",
  "error.auth.accountServiceUrlInvalid": "Hesap hizmeti adresi https:// ile başlamalı ve yol içermemelidir.",
  "error.auth.accountServiceFixed":
    "Hesap hizmetini CODEBOT_AUTH_API_URL ortam değişkeni belirler. Adresi burada değiştirmek için onu kaldırın.",
  "error.auth.signInFailed": "Oturum açma tamamlanmadı. Tekrar deneyin.",
  "error.auth.signInCancelled": "Oturum açma iptal edildi veya reddedildi.",
  "error.auth.signInTimeout": "Oturum açma çok uzun sürdü. Yeniden başlatın.",
  "error.auth.signInBrowserFailed": "OpenBot Code oturum açmak için tarayıcınızı açamadı.",
  "error.auth.signInUnavailable": "Bu OpenBot Code oturum açmak için tarayıcı açamıyor.",
  "error.auth.signInRequired": "Oturum açılması gerekiyor.",
  "error.auth.chatColorUnavailable": "Hesap hizmeti henüz sohbet renklerini desteklemiyor. Daha sonra yeniden deneyin.",
  "error.auth.accountChangedDuringRegister": "Bu sunucu kaydedilirken oturum açmış olan hesap değişti.",
  "error.auth.hostCredentialUnavailable":
    "Uzak ana makine kimlik bilgisi kullanılamıyor. Ana makineyi tekrar kaydedin.",
  "error.auth.serviceError": "Hesap hizmeti bir hata döndürdü.",
  "error.auth.serviceUnreachable":
    "OpenBot Code hesap hizmetine ulaşamadı. Bağlantınızı kontrol edin, ardından tekrar deneyin.",
  "error.auth.serviceTimeout": "Hesap hizmeti zamanında yanıt vermedi. Tekrar deneyin.",
  "error.auth.serviceStatus": "Hesap hizmeti bir hata döndürdü ({status}). Daha sonra tekrar deneyin.",
  "error.auth.deliveryTimeout":
    "OpenBot Code teslimatı zamanında onaylayamadı. Kod yine de gelebilir; tekrar göndermeden önce teslimatı kontrol edin.",
} as const satisfies PartialTranslation<typeof source>;
