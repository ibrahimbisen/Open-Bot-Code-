import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/status/host";

export const messages = {
  "status.host.registered": "Questo OpenBot Code è stato registrato per l'accesso WebRTC.",
  "status.host.keyRotated": "Chiave del server cambiata. I dispositivi associati restano associati.",
  "status.host.identityUpdated": "Identità del server aggiornata.",
  "status.host.starting": "Avvio dell'host WebRTC…",
  "status.host.ready": "Questo OpenBot Code è pronto per le connessioni WebRTC.",
  "status.host.signalLost": "Gli altri dispositivi non possono raggiungere questo OpenBot Code ora. Si ricollega.",
  "status.host.stopping": "Questo OpenBot Code sta diventando privato…",
  "status.host.private": "Questo OpenBot Code è privato.",
  "status.host.removed": "Questo OpenBot Code è stato rimosso dal tuo account. Pubblicalo di nuovo per condividerlo.",
} as const satisfies PartialTranslation<typeof source>;
