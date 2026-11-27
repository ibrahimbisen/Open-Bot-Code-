import type { PartialTranslation } from "../../message";
import type { messages as source } from "../en/advanced";

export const messages = {
  "advanced.tab.title": "Gelişmiş özellikler",
  "advanced.tab.description": "Varsayılan olarak gizli olan özellikleri açın.",
  "advanced.section.title": "Gizli özellikler",
  "advanced.section.description":
    "Her anahtar, {server} üzerinde bir özelliği gösterir veya gizler. Kapalı bir özelliğin düğmesi, ayarı ve ajan aracı yoktur. Verileriniz korunur.",
  "advanced.adminOnly": "Bu anahtarları yalnızca bu sunucunun sahibi veya yöneticisi değiştirebilir.",
  "advanced.loadFailed": "OpenBot Code bu sunucunun anahtarlarını okuyamadı.",
  "advanced.saveFailed": "OpenBot Code anahtarı kaydedemedi.",
  "advanced.routines.title": "Rutinler",
  "advanced.routines.description":
    "Zamanlanmış görevler ve webhook'lar. Sol çubuğa Zamanlama'yı, ajan ayarlarına Rutinler'i ekler.",
  "advanced.channels.title": "Kanallar",
  "advanced.channels.description": "Tek sohbette birçok ajan. Sol çubuğa Kanallar ekler.",
  "advanced.marketplace.title": "Marketplace",
  "advanced.marketplace.description": "Yüklenecek skill'ler, ajanlar ve eklentiler. Marketplace düğmesini ekler.",
  "advanced.chatApps.title": "Slack, Discord, Telegram ve WhatsApp",
  "advanced.chatApps.description": "Ajanları sohbet uygulamalarına bağlayın. Sohbet uygulaması bağlayıcılarını ekler.",
  "advanced.chatApps.open.title": "Sohbet uygulaması bağlantıları",
  "advanced.chatApps.open.description": "Slack, Discord, Telegram veya WhatsApp'a bağlanın.",
  "advanced.chatApps.open.action": "Aç",
  "advanced.computerUse.title": "Computer Use",
  "advanced.computerUse.description":
    "Bir ajanın bu bilgisayardaki uygulamaları görmesine ve kontrol etmesine izin verir. Computer Use ayarlarını ekler.",
  "advanced.remoteDesktop.title": "Uzak masaüstü",
  "advanced.remoteDesktop.description": "Bu bilgisayarın ekranını başka bir cihazdan kontrol edin.",
} as const satisfies PartialTranslation<typeof source>;
