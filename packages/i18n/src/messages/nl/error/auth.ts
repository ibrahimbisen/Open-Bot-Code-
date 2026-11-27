import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/error/auth";

export const messages = {
  "error.auth.serviceUnavailable":
    "OpenBot Code kan de accountservice niet bereiken. Controleer of de API draait en probeer het opnieuw.",
  "error.auth.sessionTimeout":
    "OpenBot Code reageerde niet op tijd. Controleer je internetverbinding en probeer het daarna opnieuw.",
  "error.auth.networkBlocked":
    "Een firewall of proxy op dit netwerk blokkeert de verbinding van OpenBot Code met {host}. Vraag je netwerkbeheerder om {host} toe te staan en probeer het opnieuw.",
  "error.auth.signInFirst": "Log eerst in bij OpenBot Code.",
  "error.auth.signInRequired": "Inloggen is verplicht.",
  "error.auth.chatColorUnavailable": "De accountservice ondersteunt nog geen chatkleuren. Probeer het later opnieuw.",
  "error.auth.accountChangedDuringRegister":
    "Het ingelogde account is gewijzigd terwijl deze server werd geregistreerd.",
  "error.auth.hostCredentialUnavailable":
    "De inloggegevens van de externe host zijn niet beschikbaar. Registreer de host opnieuw.",
  "error.auth.serviceError": "De accountservice gaf een fout.",
  "error.auth.serviceUnreachable":
    "OpenBot Code kan de accountservice niet bereiken. Controleer je verbinding en probeer het opnieuw.",
  "error.auth.serviceTimeout": "De accountservice reageerde niet op tijd. Probeer het opnieuw.",
  "error.auth.serviceStatus": "De accountservice gaf een fout ({status}). Probeer het later opnieuw.",
  "error.auth.deliveryTimeout":
    "OpenBot Code kon de bezorging niet op tijd bevestigen. De code kan nog aankomen; controleer de bezorging voordat je opnieuw verstuurt.",
} as const satisfies PartialTranslation<typeof source>;
