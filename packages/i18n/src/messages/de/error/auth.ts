import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/error/auth";

export const messages = {
  "error.auth.serviceUnavailable":
    "OpenBot Code konnte den Kontodienst nicht erreichen. Prüfe, ob die API läuft, und versuche es erneut.",
  "error.auth.sessionTimeout":
    "OpenBot Code hat nicht rechtzeitig geantwortet. Prüfe deine Internetverbindung und versuche es dann erneut.",
  "error.auth.networkBlocked":
    "Eine Firewall oder ein Proxy in diesem Netzwerk hat den Zugriff von OpenBot Code auf {host} blockiert. Bitte deinen Netzwerkadministrator, {host} zu erlauben, und versuche es erneut.",
  "error.auth.signInFirst": "Melde dich zuerst bei OpenBot Code an.",
  "error.auth.signInRequired": "Eine Anmeldung ist erforderlich.",
  "error.auth.chatColorUnavailable": "Der Kontodienst unterstützt noch keine Chatfarben. Versuche es später erneut.",
  "error.auth.accountChangedDuringRegister":
    "Das angemeldete Konto wurde während der Registrierung dieses Servers geändert.",
  "error.auth.hostCredentialUnavailable":
    "Die Zugangsdaten des entfernten Hosts sind nicht verfügbar. Registriere den Host erneut.",
  "error.auth.serviceError": "Der Kontodienst hat einen Fehler zurückgegeben.",
  "error.auth.serviceUnreachable":
    "OpenBot Code konnte den Kontodienst nicht erreichen. Prüfe deine Verbindung und versuche es erneut.",
  "error.auth.serviceTimeout": "Der Kontodienst hat nicht rechtzeitig geantwortet. Versuche es erneut.",
  "error.auth.serviceStatus": "Der Kontodienst hat einen Fehler zurückgegeben ({status}). Versuche es später erneut.",
  "error.auth.deliveryTimeout":
    "OpenBot Code konnte die Zustellung nicht rechtzeitig bestätigen. Der Code kann noch eintreffen. Prüfe die Zustellung, bevor du ihn erneut sendest.",
} as const satisfies PartialTranslation<typeof source>;
