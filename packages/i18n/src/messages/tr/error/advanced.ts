import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/error/advanced";

export const messages = {
  "error.advanced.featureOff":
    "Özellik kapalı olduğu için bu araç kullanılamıyor. Kullanıcı bunu Ayarlar > Gelişmiş özellikler bölümünden açabilir.",
  "error.advanced.invalidChange": "Gelişmiş özellik değişikliği geçerli değil.",
  "error.advanced.unsupported": "Bu sunucu gelişmiş özellik anahtarlarını desteklemiyor. Sunucuyu güncelleyin.",
} as const satisfies PartialTranslation<typeof source>;
