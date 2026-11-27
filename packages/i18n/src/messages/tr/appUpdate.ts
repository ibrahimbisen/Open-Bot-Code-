import type { PartialTranslation } from "../../message";
import type { messages as source } from "../en/appUpdate";

export const messages = {
  "appUpdate.autoRestart.description":
    "Hiçbir ajan çalışmadığında OpenBot Code, indirilen bir güncellemeyi yüklemek için yeniden başlar. Sunucularınızın üyelerinin bağlantısı kısa süreliğine kesilir.",
  "appUpdate.autoRestart.title": "Boştayken otomatik olarak yeniden başlat",
  "appUpdate.server.description":
    "Sunucunuzda OpenBot Code yükleyicilerinin ve güncelleme dosyalarının bulunduğu klasör.",
  "appUpdate.server.loadFailed": "OpenBot Code güncelleme sunucusu URL'sini okuyamadı.",
  "appUpdate.server.placeholder": "https://example.com/codebot-updates/",
  "appUpdate.server.saveFailed": "OpenBot Code güncelleme sunucusu URL'sini kaydedemedi.",
  "appUpdate.server.source.build":
    "OpenBot Code güncellemeleri {url} adresinden alır. Bu URL, OpenBot Code'un bu derlemesinden gelir.",
  "appUpdate.server.source.environment":
    "OpenBot Code güncellemeleri {url} adresinden alır. Bu URL, CODEBOT_UPDATE_URL ortam değişkeninden gelir.",
  "appUpdate.server.source.none": "Güncelleme sunucusu ayarlanmamış. OpenBot Code güncellemeleri denetlemez.",
  "appUpdate.server.source.settings": "OpenBot Code güncellemeleri bu URL'den alır.",
  "appUpdate.server.title": "Güncelleme sunucusu",
  "appUpdate.server.urlLabel": "Güncelleme sunucusu URL'si",
} as const satisfies PartialTranslation<typeof source>;
