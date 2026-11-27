import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/error/lock";

export const messages = {
  "error.lock.claudeNoSandboxStrict":
    "Katı mod, Claude'un bu bilgisayarda başlatamadığı Claude sandbox'ını gerektirir. Proje ayarlarında Normal veya Açık'ı seçin ya da başka bir sağlayıcı seçin.",
  "error.lock.claudeStrictNoSandbox":
    "Katı mod, Claude'un bu bilgisayarda başlatamadığı Claude sandbox'ını gerektirir: {reason}. Proje ayarlarında Normal veya Açık'ı seçin ya da başka bir sağlayıcı seçin.",
  "error.lock.codexStrictNeedsSandbox":
    "Katı mod, Codex'in bu bilgisayarda başlatamadığı Codex sandbox'ını gerektirir. Proje ayarlarında Normal veya Açık'ı seçin ya da başka bir sağlayıcı seçin.",
  "error.lock.commandAsk":
    "İşletim sistemi sandbox'ı bu ajan için kullanılamıyor, bu yüzden bu komut onayınızı gerektirir.",
  "error.lock.containerFailed":
    "Bu projenin konteyneri başlamadı: {reason}. Proje ayarlarında Normal'i seçin veya konteyner aracını düzeltin.",
  "error.lock.containerMissing":
    "Konteynerli Katı mod, OpenBot Code'un bulamadığı Docker veya Podman'ı gerektirir. Birini yükleyin veya proje ayarlarında Normal'i seçin.",
  "error.lock.providerNeedsMacOrLinux":
    "{provider}, bu bilgisayarda bir ajanı proje klasörlerinin içinde tutamıyor, bu yüzden OpenBot Code onu {level} modunda başlatmaz. Proje ayarlarında Açık'ı seçin veya Claude ya da Codex'i seçin.",
  "error.lock.providerToolMissing":
    "{level} modu, OpenBot Code'un bulamadığı {tool} aracını gerektirir. Onu yükleyin veya proje ayarlarında Açık'ı seçin.",
} as const satisfies PartialTranslation<typeof source>;
