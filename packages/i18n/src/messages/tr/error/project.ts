import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/error/project";

export const messages = {
  "error.project.serverTooOld":
    "Bu sunucu projeleri desteklemiyor. Sunucuyu çalıştıran bilgisayarda OpenBot Code'u güncelleyin.",
  "error.project.remoteFailed": "Sunucu bu proje eylemini tamamlayamadı. Tekrar deneyin.",
  "error.project.replyUnsupported": "Bu sunucu yanıt ayarlarını paylaşamıyor. Sunucuyu güncelleyin.",
  "error.project.replyFailed": "Sunucu yanıt kuralını kaydedemedi. Tekrar deneyin.",
  "error.project.notFound": "Bu proje artık yok.",
  "error.project.archived": "Bu proje arşivlenmiş. Önce geri yükleyin.",
  "error.project.nameRequired": "Projeye bir ad verin.",
  "error.project.limit": "En fazla proje sayısına ({limit}) ulaştınız. Önce bir projeyi silin.",
  "error.project.agentLimit": "Bir projede en fazla {limit} ajan olabilir.",
  "error.project.agentRequired": "Bir projenin en az bir ajana ihtiyacı vardır.",
  "error.project.agentNotFound": "Bu ajan projenin parçası değil.",
  "error.project.agentNameRequired": "Ajana bir ad verin.",
  "error.project.runtimeProviderMismatch":
    "Bir sohbet, ajanının sağlayıcısının başka bir modelini kullanabilir. Başka bir sağlayıcı için sohbeti o sağlayıcının bir ajanıyla başlatın.",
  "error.project.chatNotFound": "Bu sohbet artık yok.",
  "error.project.cursorInvalid": "Sohbet listesinin bu bölümü artık geçerli değil. Sohbetleri yeniden yükleyin.",
  "error.project.folderMissing": "Bu klasör yok.",
  "error.project.folderProtected": "OpenBot Code bu klasörü kullanamıyor. Başka bir klasör seçin.",
  "error.project.mainFolderMissing":
    "Bu projenin ana klasörü eksik: {path}. Klasörü geri yükleyin veya yeni bir ana klasör seçin.",
  "error.project.ownerOnly": "Bu projeyi yalnızca onu oluşturan kişi kullanabilir.",
  "error.project.memberFolder": "Bu sunucudaki kendi proje alanınızda bir klasör kullanın.",
  "error.project.memberOpenAccess": "Bir projeye bu bilgisayara tam erişimi yalnızca sahip veya yönetici verebilir.",
} as const satisfies PartialTranslation<typeof source>;
