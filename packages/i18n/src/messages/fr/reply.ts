import type { PartialTranslation } from "../../message";
import type { messages as source } from "../en/reply";

export const messages = {
  "reply.summary.edited": { one: "a modifié {count} fichier", other: "a modifié {count} fichiers" },
  "reply.summary.ran": { one: "a exécuté {count} commande", other: "a exécuté {count} commandes" },
  "reply.summary.read": { one: "a lu {count} fichier", other: "a lu {count} fichiers" },
  "reply.summary.searched": { one: "a cherché {count} fois", other: "a cherché {count} fois" },
  "reply.summary.browsed": { one: "a ouvert {count} page", other: "a ouvert {count} pages" },
  "reply.summary.delegated": { one: "a confié {count} tâche", other: "a confié {count} tâches" },
  "reply.summary.worked": { one: "a utilisé {count} autre outil", other: "a utilisé {count} autres outils" },
  "reply.details.show": "Détails",
  "reply.details.hide": "Masquer les détails",
  "reply.details.loading": "Chargement des détails…",
  "reply.details.input": "Entrée",
  "reply.details.output": "Sortie",
  "reply.details.shortened": "Abrégé",
  "reply.details.timeline": "Chronologie",
  "reply.code.showAll": "Tout afficher ({count} lignes)",
  "reply.code.showLess": "Afficher moins",
  "reply.view.title": "Vue des réponses",
  "reply.view.description":
    "Court affiche la réponse et un résumé du travail en une ligne. Détaillé affiche aussi les étapes.",
  "reply.view.short": "Court",
  "reply.view.detailed": "Détaillé",
  "reply.rule.title": "Règle de réponse",
  "reply.rule.description": "Chaque discussion reçoit cette règle. Les projets peuvent utiliser leur propre règle.",
  "reply.rule.label": "Règle des réponses",
  "reply.rule.save": "Enregistrer la règle",
  "reply.rule.reset": "Utiliser la règle par défaut",
  "reply.rule.saved": "Règle enregistrée",
  "reply.rule.empty": "Vide : aucune règle de réponse n'est envoyée",
  "reply.rule.count": "{count} sur {max} caractères",
} as const satisfies PartialTranslation<typeof source>;
