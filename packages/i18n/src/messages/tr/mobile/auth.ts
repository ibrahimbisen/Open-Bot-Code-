import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/mobile/auth";

export const messages = {
  "mobile.auth.logo.animate": "OpenBot Code logosunu hareketlendir",
  "mobile.auth.logo.animateHint": "Logonun göz kırpmasını sağlar",
  "mobile.auth.scanQrCode": "QR kodunu tara",
  "mobile.auth.closeScanner": "Tarayıcıyı kapat",
  "mobile.auth.scanner.connectFailed": "Bağlanılamadı",
  "mobile.auth.scanner.codeFailed": "Bu kod kullanılamadı",
  "mobile.auth.scanner.scanAgain": "Tekrar tara",
  "mobile.auth.scanner.connecting": "Telefonunuz bağlanıyor…",
  "mobile.auth.scanner.readingInvitation": "Davet okunuyor…",
  "mobile.auth.scanner.scanDesktop": "Masaüstü kodunu tarayın",
  "mobile.auth.scanner.scanInvitation": "Davet kodunu tarayın",
  "mobile.auth.scanner.verifying": "Tek kullanımlık kod doğrulanıyor.",
  "mobile.auth.scanner.checkingServer": "Sunucu kimliği kontrol ediliyor.",
  "mobile.auth.scanner.keepCentered": "QR kodunu çerçevenin içinde ortalanmış tutun.",
  "mobile.auth.scanner.connectFallback": "OpenBot Code bu telefonu bağlayamadı.",
  "mobile.auth.scanner.cameraFailed": "Kamera başlatılamadı. Tekrar deneyin.",
  "mobile.auth.camera.title": "Kamera erişimi gerekli",
  "mobile.auth.camera.pairingReason":
    "OpenBot Code kamerayı yalnızca masaüstü uygulamasında gösterilen tek kullanımlık QR kodunu taramak için kullanır.",
  "mobile.auth.camera.invitationReason": "OpenBot Code kamerayı yalnızca davet QR kodunu taramak için kullanır.",
  "mobile.auth.camera.blocked":
    "Kamera erişimi engellendi. Cihaz ayarlarından OpenBot Code için kamerayı etkinleştirin, ardından kodu taramak için buraya dönün.",
  "mobile.auth.camera.allow": "Kamera erişimine izin ver",
  "mobile.auth.camera.openSettings": "Ayarları aç",
  "mobile.auth.signIn.title": "Ajanlarınız, her yerde.",
  "mobile.auth.signIn.subtitle": "Bilgisayarınızdaki OpenBot Code'a bağlanın.",
  "mobile.auth.signIn.helpTitle": "QR kodu nerede?",
  "mobile.auth.signIn.helpStep1": "1. Bilgisayarınızda OpenBot Code'u açın.",
  "mobile.auth.signIn.helpStep2": "2. Ayarlar → Mobil Bağlantı bölümüne gidin.",
  "mobile.auth.signIn.helpStep3":
    "3. “Telefon ekle” → “Evet, oturum aç” seçeneğini seçin, ardından kodu buradan tarayın.",
  "mobile.auth.done.title": "Bağlandı",
  "mobile.auth.done.body": "Oturum açtınız.",
  "mobile.auth.error.sessionEnded": "Oturumunuz sona erdi. Tekrar oturum açın.",
  "mobile.auth.error.connectionInProgress": "Başka bir bağlantı işlemi sürüyor. Bitmesini bekleyin.",
  "mobile.auth.error.invalidCode": "Bu geçerli bir OpenBot Code Mobile Connect kodu değil.",
  "mobile.auth.error.codeOutdated": "Güncellenmiş bir masaüstü uygulamasında yeni bir Mobile Connect kodu oluşturun.",
  "mobile.auth.error.alreadySignedIn": "Zaten oturum açtınız. Başka bir hesap bağlamadan önce oturumu kapatın.",
  "mobile.auth.error.desktopUnreachable":
    "OpenBot Code masaüstünüze ulaşamadı. Her iki cihazı da aynı Wi-Fi ağında tutun ve Yerel Ağ erişimine izin verin.",
  "mobile.auth.error.accountServiceUnreachable":
    "OpenBot Code hesap hizmetine ulaşamadı. Bağlantınızı kontrol edip tekrar deneyin.",
  "mobile.auth.error.codeExpired": "Bu Mobile Connect kodu geçersiz veya süresi dolmuş.",
  "mobile.auth.error.revokePreviousFailed":
    "Önceki mobil oturum iptal edilemedi. Bağlantınızı kontrol edin ve tekrar tarayın.",
  "mobile.auth.error.verifyFailed": "OpenBot Code bu mobil oturumu doğrulayamadı.",
  "mobile.auth.error.sessionsLoadFailed": "Hesap oturumları yüklenemedi. Tekrar deneyin.",
  "mobile.auth.error.useSignOut": "Bu cihazın bağlantısını kesmek için “Oturumu kapat” seçeneğini kullanın.",
  "mobile.auth.error.desktopSession": "Masaüstü oturumlarının bağlantısı mobilden kesilemez.",
  "mobile.auth.error.disconnectFailed": "Bu oturumun bağlantısı kesilemedi. Yenileyin ve tekrar deneyin.",
  "mobile.auth.error.nameLength": "3 ile 20 karakter arasında bir görünen ad girin.",
  "mobile.auth.error.photoTooLarge": "512 KB'tan küçük bir fotoğraf seçin.",
  "mobile.auth.error.photoInvalid": "Seçilen fotoğraf geçersiz. Başka bir görsel seçin.",
  "mobile.auth.error.tooManyChanges": "Çok fazla değişiklik. Bir süre bekleyip tekrar deneyin.",
  "mobile.auth.error.photoConflict": "Fotoğrafınız başka bir cihazda değiştirildi. Tekrar deneyin.",
  "mobile.auth.error.profileSaveFailed": "Profiliniz kaydedilemedi. Bağlantınızı kontrol edip tekrar deneyin.",
  "mobile.auth.error.signOutUnconfirmed":
    "Oturumun kapatıldığı doğrulanamadı. Bağlantınızı kontrol edip tekrar deneyin.",
} as const satisfies PartialTranslation<typeof source>;
