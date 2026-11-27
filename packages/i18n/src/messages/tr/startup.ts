import type { PartialTranslation } from "../../message";
import type { messages as source } from "../en/startup";

export const messages = {
  "startup.failedTitle": "OpenBot Code başlatılamadı",
  "startup.failedBody":
    "{message}\n\nYerel verileriniz sıfırlanmadı veya üzerine yazılmadı. Kurtarma adımları için sorun giderme kılavuzuna bakın.",
  "startup.archiveChangedTitle": "OpenBot Code dosyaları değiştirildi",
  "startup.archiveChangedBody":
    "Başka bir program OpenBot Code’un app.asar dosyasını değiştirdi. OpenBot Code şu an çalışıyor, ancak kapattıktan sonra açılmayacak.\n\nOnarmak için OpenBot Code’u yeniden yükleyin. Yerel verileriniz korunur.",
  "startup.archiveChangedDownload": "OpenBot Code’u indir",
  "startup.filesDamagedBody":
    "Bazı OpenBot Code dosyaları hasarlı veya eksik.\n\nOnarmak için OpenBot Code’u yeniden yükleyin. Yerel verileriniz korunur.",
  "startup.newerDataUpdatingTitle": "OpenBot Code güncelleniyor",
  "startup.newerDataUpdatingBody":
    "OpenBot Code’un daha yeni bir sürümü verilerinizi kaydetti. OpenBot Code en son sürümü yüklüyor ve ardından yeniden açılacak.\n\nYerel verileriniz sıfırlanmadı veya üzerine yazılmadı.",
  "startup.newerDataTitle": "En son OpenBot Code’u yükleyin",
  "startup.newerDataBody":
    "OpenBot Code’un daha yeni bir sürümü verilerinizi kaydetti ve bu sürüm ({version}) onları açamıyor. Verilerinizi açmak için en son sürümü yükleyin.\n\nYerel verileriniz sıfırlanmadı veya üzerine yazılmadı.",
  "startup.newerDataDownload": "OpenBot Code’u indir",
  "startup.newerDataGuide": "Kılavuzu aç",
  "startup.newerDataQuit": "Çık",
  "startup.newerDataLoopTitle": "En son OpenBot Code açılmadı",
  "startup.newerDataLoopBody":
    "OpenBot Code’un daha yeni bir sürümü verilerinizi kaydetti ve bu sürüm ({version}) onları açamıyor. OpenBot Code {loopVersion} art arda birkaç kez açılmadan durdu, bu yüzden yeniden yüklenmiyor.\n\n{loopVersion} sürümünden daha yeni bir sürüm çıktığında onu yükleyin. Yardım almak için kılavuzu açın.\n\nYerel verileriniz sıfırlanmadı veya üzerine yazılmadı.",
  "startup.newerDataReleases": "Sürümleri göster",
  "startup.recoveryWindowTitle": "OpenBot Code kurtarma",
  "startup.recoveryTitle": "OpenBot Code açılmadı",
  "startup.recoveryBody": {
    one: "OpenBot Code {version}, açılmadan önce art arda {count} kez durdu. Yerel verileriniz sıfırlanmadı veya üzerine yazılmadı.",
    other:
      "OpenBot Code {version}, açılmadan önce art arda {count} kez durdu. Yerel verileriniz sıfırlanmadı veya üzerine yazılmadı.",
  },
  "startup.recoveryHint":
    "Yeniden deneyin veya açılan son sürümü yükleyin. Yardım almak için tanılamayı dışa aktarın ve dosyayı raporunuzla gönderin.",
  "startup.recoveryHintLatest":
    "OpenBot Code verilerinizi açabilen daha eski bir sürüm bulamadı. Yeniden deneyin veya en son sürümü yükleyin. Yardım almak için tanılamayı dışa aktarın ve dosyayı raporunuzla gönderin.",
  "startup.recoveryRetry": "Yeniden dene",
  "startup.recoveryPreviousVersion": "Önceki sürümü indir",
  "startup.recoveryLatestVersion": "En son sürümü indir",
  "startup.recoveryExportDiagnostics": "Tanılamayı dışa aktar",
  "startup.recoveryOpenDataFolder": "Veri klasörünü aç",
  "startup.recoveryQuit": "Çık",
  "startup.recoveryDiagnosticsSaved": "Tanılama dosyası kaydedildi.",
  "startup.recoveryActionFailed": "OpenBot Code bu işlemi yapamadı.",
} as const satisfies PartialTranslation<typeof source>;
