import type { PartialTranslation } from "../../message";
import type { messages as source } from "../en/appUpdate";

export const messages = {
  "appUpdate.server.title": "Güncelleme sunucusu",
  "appUpdate.server.description":
    "Sunucunuzda OpenBot Code yükleyicilerinin ve güncelleme dosyalarının bulunduğu klasör.",
  "appUpdate.server.urlLabel": "Güncelleme sunucusu URL'si",
  "appUpdate.server.placeholder": "https://example.com/codebot-updates/",
  "appUpdate.server.source.settings": "OpenBot Code güncellemeleri bu URL'den alır.",
  "appUpdate.server.source.environment":
    "OpenBot Code güncellemeleri {url} adresinden alır. Bu URL, CODEBOT_UPDATE_URL ortam değişkeninden gelir.",
  "appUpdate.server.source.build":
    "OpenBot Code güncellemeleri {url} adresinden alır. Bu URL, OpenBot Code'un bu derlemesinden gelir.",
  "appUpdate.server.source.none": "Güncelleme sunucusu ayarlanmamış. OpenBot Code güncellemeleri denetlemez.",
  "appUpdate.server.saveFailed": "OpenBot Code güncelleme sunucusu URL'sini kaydedemedi.",
  "appUpdate.server.loadFailed": "OpenBot Code güncelleme sunucusu URL'sini okuyamadı.",
  "appUpdate.autoRestart.title": "Boştayken otomatik olarak yeniden başlat",
  "appUpdate.autoRestart.description":
    "Hiçbir ajan çalışmadığında OpenBot Code, indirilen bir güncellemeyi yüklemek için yeniden başlar. Sunucularınızın üyelerinin bağlantısı kısa süreliğine kesilir.",
} as const satisfies PartialTranslation<typeof source>;
