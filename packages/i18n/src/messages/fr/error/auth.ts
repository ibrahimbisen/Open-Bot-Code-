import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/error/auth";

export const messages = {
  "error.auth.serviceUnavailable":
    "OpenBot Code n’a pas pu joindre le service de compte. Vérifiez que l’API fonctionne, puis réessayez.",
  "error.auth.sessionTimeout":
    "OpenBot Code n’a pas répondu à temps. Vérifiez votre connexion internet, puis réessayez.",
  "error.auth.networkBlocked":
    "Un pare-feu ou un proxy de ce réseau a empêché OpenBot Code de joindre {host}. Demandez à votre administrateur réseau d’autoriser {host}, puis réessayez.",
  "error.auth.signInFirst": "Connectez-vous d’abord à OpenBot Code.",
  "error.auth.signInRequired": "Une connexion est requise.",
  "error.auth.chatColorUnavailable":
    "Le service de compte ne prend pas encore en charge les couleurs de discussion. Réessayez plus tard.",
  "error.auth.accountChangedDuringRegister": "Le compte connecté a changé pendant l’enregistrement de ce serveur.",
  "error.auth.hostCredentialUnavailable":
    "L’identifiant de l’hôte distant n’est pas disponible. Enregistrez à nouveau l’hôte.",
  "error.auth.serviceError": "Le service de compte a renvoyé une erreur.",
  "error.auth.serviceUnreachable":
    "OpenBot Code n’a pas pu joindre le service de compte. Vérifiez votre connexion, puis réessayez.",
  "error.auth.serviceTimeout": "Le service de compte n’a pas répondu à temps. Réessayez.",
  "error.auth.serviceStatus": "Le service de compte a renvoyé une erreur ({status}). Réessayez plus tard.",
  "error.auth.deliveryTimeout":
    "OpenBot Code n’a pas pu confirmer l’envoi à temps. Le code peut encore arriver ; vérifiez sa réception avant de le renvoyer.",
} as const satisfies PartialTranslation<typeof source>;
