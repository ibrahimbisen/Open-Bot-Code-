import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/error/localServer";

export const messages = {
  "error.localServer.refused":
    "{host} adresindeki model sunucusu bağlantıyı reddetti. O makinede model sunucusunu başlatın.",
  "error.localServer.hostNotFound": "{host} adresi bulunamadı. Makinenin adını kontrol edin.",
  "error.localServer.timeout": "{host} adresindeki model sunucusu {seconds} saniye içinde yanıt vermedi.",
  "error.localServer.unreachable":
    "{host} adresindeki model sunucusuna ulaşılamıyor. Makinenin açık olduğundan ve ağınızda olduğundan emin olun.",
  "error.localServer.redirect":
    "{host} adresindeki model sunucusu bir yönlendirme gönderdi. OpenBot Code, API anahtarını güvende tutmak için yönlendirmeleri izlemez.",
  "error.localServer.keyNeeded":
    "{host} adresindeki model sunucusu bir API anahtarı istiyor. Bu makinenin anahtarını ekleyin.",
  "error.localServer.keyRefused":
    "{host} adresindeki model sunucusu API anahtarını reddetti. Bu makinenin anahtarını kontrol edin.",
  "error.localServer.http": "{host} adresindeki model sunucusu HTTP {status} durumuyla yanıt verdi.",
  "error.localServer.invalidAnswer": "{host} adresindeki model sunucusu OpenAI uyumlu bir model listesi göndermedi.",
  "error.localServer.tooLarge": "{host} adresindeki model sunucusunun yanıtı çok büyük.",
  "error.localServer.gpuUnreachable": "{host} GPU durum adresine ulaşılamıyor.",
  "error.localServer.gpuTimeout": "{host} GPU durum adresi {seconds} saniye içinde yanıt vermedi.",
  "error.localServer.gpuRedirect":
    "{host} GPU durum adresi bir yönlendirme gönderdi. OpenBot Code yönlendirmeleri izlemez.",
  "error.localServer.gpuHttp": "{host} GPU durum adresi HTTP {status} durumuyla yanıt verdi.",
  "error.localServer.gpuInvalid": "{host} GPU durum adresi, OpenBot Code'un okuyabileceği GPU değerleri göndermedi.",
  "error.localServer.gpuTooLarge": "{host} GPU durum adresinin yanıtı çok büyük.",
  "error.localServer.gpuUrlInvalid":
    "GPU durum URL'si, kullanıcı adı ve parola içermeyen bir http veya https adresi olmalıdır.",
  "error.localServer.gpuKeyOtherOrigin":
    "API anahtarı, GPU durum URL'sine yalnızca bu URL temel URL ile aynı kökene sahipse gönderilebilir.",
  "error.localServer.scanHostInvalid": "Bir ana makine adı, bir IP adresi veya bir http ya da https adresi girin.",
} as const satisfies PartialTranslation<typeof source>;
