import type { PartialTranslation } from "../../message";
import type { messages as source } from "../en/advanced";

export const messages = {
  "advanced.tab.title": "Fonctions avancées",
  "advanced.tab.description": "Active les fonctions masquées par défaut.",
  "advanced.section.title": "Fonctions masquées",
  "advanced.section.description":
    "Chaque interrupteur affiche ou masque une fonction sur {server}. Une fonction désactivée n'a ni boutons, ni réglages, ni outils d'agent. Tes données restent.",
  "advanced.adminOnly": "Seul un propriétaire ou un administrateur de ce serveur peut modifier ces interrupteurs.",
  "advanced.loadFailed": "OpenBot Code n'a pas pu lire les interrupteurs de ce serveur.",
  "advanced.saveFailed": "OpenBot Code n'a pas pu enregistrer l'interrupteur.",
  "advanced.routines.title": "Routines",
  "advanced.routines.description":
    "Tâches planifiées et webhooks. Ajoute Planification à la barre de gauche et Routines aux réglages de l'agent.",
  "advanced.channels.title": "Canaux",
  "advanced.channels.description": "Plusieurs agents dans une seule discussion. Ajoute Canaux à la barre de gauche.",
  "advanced.marketplace.title": "Marketplace",
  "advanced.marketplace.description": "Skills, agents et plugins à installer. Ajoute le bouton Marketplace.",
  "advanced.chatApps.title": "Slack, Discord, Telegram et WhatsApp",
  "advanced.chatApps.description":
    "Connecte des agents à des applications de messagerie. Ajoute les connecteurs d'applications de messagerie.",
  "advanced.chatApps.open.title": "Connexions aux applications de messagerie",
  "advanced.chatApps.open.description": "Connecte Slack, Discord, Telegram ou WhatsApp.",
  "advanced.chatApps.open.action": "Ouvrir",
  "advanced.computerUse.title": "Computer Use",
  "advanced.computerUse.description":
    "Permet à un agent de voir et de contrôler les applications de cet ordinateur. Ajoute les réglages de Computer Use.",
  "advanced.remoteDesktop.title": "Bureau à distance",
  "advanced.remoteDesktop.description": "Contrôle l'écran de cet ordinateur depuis un autre appareil.",
} as const satisfies PartialTranslation<typeof source>;
