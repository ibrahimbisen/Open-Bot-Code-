import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/mobile/auth";

export const messages = {
  "mobile.auth.logo.animate": "OpenBot Code-Logo animieren",
  "mobile.auth.logo.animateHint": "Lässt das Logo zwinkern",
  "mobile.auth.scanQrCode": "QR-Code scannen",
  "mobile.auth.closeScanner": "Scanner schließen",
  "mobile.auth.scanner.connectFailed": "Verbindung fehlgeschlagen",
  "mobile.auth.scanner.codeFailed": "Dieser Code kann nicht verwendet werden",
  "mobile.auth.scanner.scanAgain": "Erneut scannen",
  "mobile.auth.scanner.connecting": "Dein Telefon wird verbunden…",
  "mobile.auth.scanner.readingInvitation": "Einladung wird gelesen…",
  "mobile.auth.scanner.scanDesktop": "Scanne den Code vom Desktop",
  "mobile.auth.scanner.scanInvitation": "Scanne den Einladungscode",
  "mobile.auth.scanner.verifying": "Der Einmalcode wird überprüft.",
  "mobile.auth.scanner.checkingServer": "Die Identität des Servers wird geprüft.",
  "mobile.auth.scanner.keepCentered": "Halte den QR-Code mittig im Rahmen.",
  "mobile.auth.scanner.connectFallback": "OpenBot Code konnte dieses Telefon nicht verbinden.",
  "mobile.auth.scanner.cameraFailed": "Die Kamera konnte nicht gestartet werden. Versuche es erneut.",
  "mobile.auth.camera.title": "Kamerazugriff erforderlich",
  "mobile.auth.camera.pairingReason":
    "OpenBot Code verwendet die Kamera nur, um den einmaligen QR-Code aus der Desktop-App zu scannen.",
  "mobile.auth.camera.invitationReason":
    "OpenBot Code verwendet die Kamera nur, um den QR-Code der Einladung zu scannen.",
  "mobile.auth.camera.blocked":
    "Der Kamerazugriff ist blockiert. Aktiviere ihn für OpenBot Code in den Geräteeinstellungen und kehre dann hierher zurück, um den Code zu scannen.",
  "mobile.auth.camera.allow": "Kamerazugriff erlauben",
  "mobile.auth.camera.openSettings": "Einstellungen öffnen",
  "mobile.auth.signIn.title": "Deine Agenten, überall.",
  "mobile.auth.signIn.subtitle": "Verbinde dich mit OpenBot Code auf deinem Computer.",
  "mobile.auth.signIn.helpTitle": "Wo ist der QR-Code?",
  "mobile.auth.signIn.helpStep1": "1. Öffne OpenBot Code auf deinem Computer.",
  "mobile.auth.signIn.helpStep2": "2. Gehe zu Einstellungen → Mobilverbindung.",
  "mobile.auth.signIn.helpStep3": "3. Wähle „Telefon hinzufügen“ → „Ja, anmelden“ und scanne den Code dann hier.",
  "mobile.auth.signIn.accountButton": "Mit Nextcloud anmelden",
  "mobile.auth.account.title": "Mit Nextcloud anmelden",
  "mobile.auth.account.description":
    "Gib die Adresse deines OpenBot Code-Kontodienstes ein. Nextcloud fragt dann nach deinem Benutzernamen und Passwort.",
  "mobile.auth.account.label": "Adresse des Kontodienstes",
  "mobile.auth.account.placeholder": "account.example.com",
  "mobile.auth.account.signalLabel": "Signal-Adresse (optional)",
  "mobile.auth.account.signalPlaceholder": "Signal-Adresse (optional)",
  "mobile.auth.account.continue": "Mit Nextcloud fortfahren",
  "mobile.auth.account.waiting": "Warten auf Nextcloud…",
  "mobile.auth.account.tryAgainIn": "Versuche es in {time} erneut",
  "mobile.auth.account.useQrCode": "Stattdessen einen QR-Code scannen",
  "mobile.auth.account.error.invalidAddress":
    "Gib die Adresse deines Kontodienstes ein, zum Beispiel account.example.com.",
  "mobile.auth.account.error.invalidSignal":
    "Gib eine Signal-Adresse ein, die mit wss:// beginnt, oder lass das Feld leer.",
  "mobile.auth.account.error.notAccountService": "Diese Adresse ist kein OpenBot Code-Kontodienst.",
  "mobile.auth.account.error.startFailed": "Der Kontodienst konnte die Anmeldung nicht starten. Versuche es erneut.",
  "mobile.auth.account.error.loginFailed": "Die Anmeldung wurde nicht abgeschlossen. Versuche es erneut.",
  "mobile.auth.account.error.wait": "Zu viele Anmeldeversuche. Warte, bevor du es erneut versuchst.",
  "mobile.auth.account.error.providerUnreachable":
    "Der Kontodienst konnte Nextcloud nicht erreichen. Versuche es später erneut.",
  "mobile.auth.account.error.refused": "Nextcloud hat diese Anmeldung nicht erlaubt.",
  "mobile.auth.done.title": "Verbunden",
  "mobile.auth.done.body": "Du bist angemeldet.",
  "mobile.auth.error.sessionEnded": "Deine Sitzung ist beendet. Melde dich erneut an.",
  "mobile.auth.error.connectionInProgress":
    "Eine andere Verbindung wird gerade hergestellt. Warte, bis sie abgeschlossen ist.",
  "mobile.auth.error.invalidCode": "Dies ist kein gültiger Code für die OpenBot Code-Mobilverbindung.",
  "mobile.auth.error.codeOutdated":
    "Erstelle in einer aktualisierten Desktop-App einen neuen Code für die Mobilverbindung.",
  "mobile.auth.error.alreadySignedIn":
    "Du bist bereits angemeldet. Melde dich ab, bevor du ein anderes Konto verbindest.",
  "mobile.auth.error.desktopUnreachable":
    "OpenBot Code konnte deinen Desktop nicht erreichen. Halte beide Geräte im selben WLAN und erlaube den Zugriff auf das lokale Netzwerk.",
  "mobile.auth.error.accountServiceUnreachable":
    "OpenBot Code konnte den Kontodienst nicht erreichen. Prüfe deine Verbindung und versuche es erneut.",
  "mobile.auth.error.codeExpired": "Dieser Code für die Mobilverbindung ist ungültig oder abgelaufen.",
  "mobile.auth.error.revokePreviousFailed":
    "Die vorherige mobile Sitzung konnte nicht widerrufen werden. Prüfe deine Verbindung und scanne erneut.",
  "mobile.auth.error.verifyFailed": "OpenBot Code konnte diese mobile Sitzung nicht überprüfen.",
  "mobile.auth.error.sessionsLoadFailed": "Die Kontositzungen konnten nicht geladen werden. Versuche es erneut.",
  "mobile.auth.error.useSignOut": "Verwende „Abmelden“, um dieses Gerät zu trennen.",
  "mobile.auth.error.desktopSession": "Desktop-Sitzungen können nicht vom Mobilgerät aus getrennt werden.",
  "mobile.auth.error.disconnectFailed":
    "Diese Sitzung konnte nicht getrennt werden. Aktualisiere und versuche es erneut.",
  "mobile.auth.error.nameLength": "Gib einen Anzeigenamen mit 3 bis 20 Zeichen ein.",
  "mobile.auth.error.photoTooLarge": "Wähle ein Foto, das kleiner als 512 KB ist.",
  "mobile.auth.error.photoInvalid": "Das ausgewählte Foto ist ungültig. Wähle ein anderes Bild.",
  "mobile.auth.error.tooManyChanges": "Zu viele Änderungen. Warte einen Moment und versuche es erneut.",
  "mobile.auth.error.photoConflict": "Dein Foto wurde auf einem anderen Gerät geändert. Versuche es erneut.",
  "mobile.auth.error.profileSaveFailed":
    "Dein Profil konnte nicht gespeichert werden. Prüfe deine Verbindung und versuche es erneut.",
  "mobile.auth.error.signOutUnconfirmed":
    "Die Abmeldung konnte nicht bestätigt werden. Prüfe deine Verbindung und versuche es erneut.",
} as const satisfies PartialTranslation<typeof source>;
