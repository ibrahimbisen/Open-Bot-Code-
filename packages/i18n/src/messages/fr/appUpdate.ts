import type { PartialTranslation } from "../../message";
import type { messages as source } from "../en/appUpdate";

export const messages = {
  "appUpdate.server.title": "Serveur de mises à jour",
  "appUpdate.server.description":
    "Le dossier de ton serveur qui contient les installateurs d'OpenBot Code et les fichiers de mise à jour.",
  "appUpdate.server.urlLabel": "URL du serveur de mises à jour",
  "appUpdate.server.placeholder": "https://example.com/codebot-updates/",
  "appUpdate.server.source.settings": "OpenBot Code reçoit ses mises à jour depuis cette URL.",
  "appUpdate.server.source.environment":
    "OpenBot Code reçoit ses mises à jour depuis {url}. Cette URL vient de la variable d'environnement CODEBOT_UPDATE_URL.",
  "appUpdate.server.source.build":
    "OpenBot Code reçoit ses mises à jour depuis {url}. Cette URL vient de cette version d'OpenBot Code.",
  "appUpdate.server.source.none":
    "Aucun serveur de mises à jour n'est défini. OpenBot Code ne cherche pas de mises à jour.",
  "appUpdate.server.saveFailed": "OpenBot Code n'a pas pu enregistrer l'URL du serveur de mises à jour.",
  "appUpdate.server.loadFailed": "OpenBot Code n'a pas pu lire l'URL du serveur de mises à jour.",
  "appUpdate.autoRestart.title": "Redémarrer automatiquement au repos",
  "appUpdate.autoRestart.description":
    "OpenBot Code redémarre pour installer une mise à jour téléchargée quand aucun agent ne travaille. Les membres de tes serveurs sont déconnectés brièvement.",
} as const satisfies PartialTranslation<typeof source>;
