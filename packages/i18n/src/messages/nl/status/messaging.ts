import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/status/messaging";

export const messages = {
  "status.messaging.working": "Mee bezig…",
  "status.messaging.queued": "Even wachten tot een eerder verzoek klaar is. Het antwoord komt hier.",
  "status.messaging.busy": "Er wachten te veel verzoeken. Probeer het later opnieuw.",
  "status.messaging.failed": "OpenBot Code kon dit verzoek niet afronden. De OpenBot Code-host heeft de details.",
  "status.messaging.noAnswer": "OpenBot Code is klaar zonder geschreven antwoord.",
  "status.messaging.noAgent": "Er kan hier nog geen agent antwoorden. Voeg de Slack-orchestrator toe in OpenBot Code.",
  "status.messaging.delegated": "Een teamgenoot is ermee bezig. Het antwoord komt hier.",
  "status.messaging.stopped": "Gestopt.",
  "status.messaging.stop": "Stop",
  "status.messaging.approvalTitle": "OpenBot Code vraagt om goedkeuring om door te gaan.",
  "status.messaging.approvalTitleTeammate": "Teamgenoot {agent} vraagt om goedkeuring om door te gaan.",
  "status.messaging.approvalCommand": "Een opdracht uitvoeren",
  "status.messaging.approvalFileChange": "Bestanden wijzigen",
  "status.messaging.approvalPermissions": "Meer machtigingen krijgen",
  "status.messaging.approve": "Goedkeuren",
  "status.messaging.deny": "Weigeren",
  "status.messaging.approvedBy": "Goedgekeurd door {user}.",
  "status.messaging.deniedBy": "Geweigerd door {user}.",
  "status.messaging.answeredOnHost": "Beantwoord op de OpenBot Code-host.",
  "status.messaging.requestInactive": "Dit verzoek is niet meer actief.",
  "status.messaging.onlyRequester": "Alleen {user} kan dit doen. De OpenBot Code-host kan ook antwoorden.",
  "status.messaging.hostOnly": "Alleen de OpenBot Code-host kan dit verzoek beantwoorden.",
  "status.messaging.filesSkipped": "Sommige bestanden zijn niet verstuurd: {names}.",
  "status.messaging.orchestratorName": "Slack-orchestrator",
  "status.messaging.orchestratorTitle": "Antwoordt in Slack en vraagt het team",
  "status.messaging.discordNoAgent":
    "Er kan hier nog geen agent antwoorden. Voeg de Discord-orchestrator toe in OpenBot Code.",
  "status.messaging.discordOrchestratorName": "Discord-orchestrator",
  "status.messaging.discordOrchestratorTitle": "Antwoordt in Discord en vraagt het team",
  "status.messaging.integrationsSection": "Integraties",
  "status.messaging.signInReceived": "OpenBot Code heeft de Slack-installatie ontvangen. Je kunt dit tabblad sluiten.",
  "status.messaging.signInUnknown":
    "OpenBot Code heeft deze Slack-installatie niet gestart. Start hem opnieuw in OpenBot Code.",
  "status.messaging.telegramNoAgent":
    "Er kan hier nog geen agent antwoorden. Open in OpenBot Code Marktplaats > Apps > Telegram en klik op Agent toevoegen.",
  "status.messaging.telegramLinked":
    "OpenBot Code is verbonden met deze chat. Noem {bot} of reageer op een bericht van OpenBot Code om de agents iets te vragen.",
  "status.messaging.telegramNotLinked":
    "OpenBot Code is niet verbonden met deze chat. Open de OpenBot Code-app, ga naar Marktplaats → Apps → Telegram en kies 'Toevoegen aan een groep' of 'Open een directe chat' om te verbinden.",
  "status.messaging.telegramOrchestratorName": "Telegram-orchestrator",
  "status.messaging.telegramOrchestratorTitle": "Antwoordt in Telegram en vraagt het team",
  "status.messaging.whatsappNoAgent":
    "Er kan hier nog geen agent antwoorden. Voeg de WhatsApp-orchestrator toe in OpenBot Code.",
  "status.messaging.whatsappApprovalMenu": "Antwoord 1 om goed te keuren of 2 om te weigeren.",
  "status.messaging.whatsappStopMenu": "Antwoord “stop” om te stoppen.",
  "status.messaging.whatsappPairingCode":
    "Dit nummer antwoordt alleen mensen die de eigenaar heeft toegestaan. Geef de eigenaar deze code: {code}",
  "status.messaging.whatsappPairingApproved": "Je kunt nu verzoeken naar dit nummer sturen.",
  "status.messaging.whatsappOwnChat": "Bericht aan jezelf",
  "status.messaging.whatsappWelcomeOwn":
    "👋 *OpenBot Code is verbonden*\n\nSchrijf hier om je agents iets te vragen. De WhatsApp Orchestrator antwoordt, of geeft het werk aan de juiste agent.\n\nStuur *stop* om een verzoek te stoppen.",
  "status.messaging.whatsappWelcomeDedicated":
    "👋 *OpenBot Code is verbonden*\n\nDe mensen die je in OpenBot Code toestaat, kunnen nu naar dit nummer schrijven. Een nieuw persoon krijgt een code: keur die goed in OpenBot Code onder Verzoeken.\n\nStuur *stop* om een verzoek te stoppen.",
  "status.messaging.whatsappOtherCodeBot":
    "Er is nog een OpenBot Code aan dit WhatsApp-nummer gekoppeld, dus je kunt twee antwoorden krijgen. Open om dit op te lossen Gekoppelde apparaten in WhatsApp op je telefoon en log uit bij de OpenBot Code die je niet gebruikt.",
  "status.messaging.whatsappPaused":
    "OpenBot Code antwoordt hier 10 minuten niet: er kwamen te veel berichten in korte tijd. Als er nog een OpenBot Code aan dit nummer is gekoppeld, open dan Gekoppelde apparaten in WhatsApp op je telefoon en log uit bij de OpenBot Code die je niet gebruikt.",
  "status.messaging.whatsappNotDelivered":
    "WhatsApp heeft dit antwoord niet geaccepteerd, dus de persoon heeft het niet ontvangen.",
  "status.messaging.whatsappPartlyDelivered":
    "WhatsApp heeft dit antwoord niet volledig geaccepteerd, dus de persoon heeft maar een deel ontvangen.",
  "status.messaging.whatsappOrchestratorName": "WhatsApp-orchestrator",
  "status.messaging.whatsappOrchestratorTitle": "Antwoordt in WhatsApp en vraagt het team",
} as const satisfies PartialTranslation<typeof source>;
