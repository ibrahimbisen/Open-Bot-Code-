import type { PartialTranslation } from "../../message";
import type { messages as source } from "../en/localServer";

export const messages = {
  "localServer.settings.title": "Serveurs locaux",
  "localServer.settings.description":
    "Machines de modèles sur ton réseau, comme un DGX Spark. Chaque machine est une entrée distincte.",
  "localServer.settings.add": "Ajouter une machine",
  "localServer.settings.empty":
    "Aucune machine locale pour l'instant. Ajoute l'adresse d'un serveur de modèles pour l'utiliser dans un projet ou une discussion.",
  "localServer.settings.edit": "Modifier {name}",
  "localServer.settings.remove": "Retirer {name}",
  "localServer.settings.refresh": "Vérifier maintenant",
  "localServer.settings.statusOff": "État désactivé",
  "localServer.settings.models": { one: "{count} modèle", other: "{count} modèles" },
  "localServer.scan.title": "Trouver une machine",
  "localServer.scan.description":
    "Saisis un nom d'hôte ou une adresse IP. OpenBot Code cherche Ollama, LM Studio et vLLM sur leurs ports habituels.",
  "localServer.scan.host": "Hôte ou adresse",
  "localServer.scan.placeholder": "spark-1.local",
  "localServer.scan.action": "Analyser",
  "localServer.scan.scanning": "Analyse en cours",
  "localServer.scan.none": "Aucun serveur de modèles trouvé sur cet hôte.",
  "localServer.scan.needsKey": "Nécessite une clé d'API",
  "localServer.scan.add": "Ajouter {name}",
  "localServer.dialog.addTitle": "Ajouter une machine locale",
  "localServer.dialog.editTitle": "Modifier {name}",
  "localServer.dialog.description":
    "OpenBot Code lit la liste des modèles et l'état depuis l'adresse compatible OpenAI de la machine.",
  "localServer.field.name": "Nom",
  "localServer.field.namePlaceholder": "DGX Spark 1",
  "localServer.field.baseUrl": "Adresse du serveur",
  "localServer.field.baseUrlPlaceholder": "http://192.168.1.41:8000/v1",
  "localServer.field.apiKey": "Clé d'API (facultative)",
  "localServer.field.apiKeyKept": "Enregistrée. Laisse vide pour la conserver.",
  "localServer.field.gpuUrl": "Adresse d'état du GPU (facultative)",
  "localServer.field.gpuUrlPlaceholder": "http://192.168.1.41:9101/gpu",
  "localServer.field.gpuUrlHelp":
    "Une adresse JSON, d'exportateur nvidia-smi ou d'exportateur DCGM qui affiche la charge et la mémoire du GPU.",
  "localServer.field.gpuUsesKey": "Envoyer la clé d'API à l'adresse d'état du GPU",
  "localServer.field.gpuUsesKeyHelp": "Uniquement pour une adresse de même origine que l'adresse du serveur.",
  "localServer.field.monitored": "Afficher l'état de cette machine",
  "localServer.field.monitoredHelp":
    "OpenBot Code vérifie la machine de temps en temps et l'affiche dans la barre d'état.",
  "localServer.error.nameRequired": "Saisis un nom.",
  "localServer.error.gpuUrlInvalid": "Saisis une adresse http ou https sans nom d'utilisateur ni mot de passe.",
  "localServer.error.gpuKeyOtherOrigin": "L'adresse d'état du GPU doit avoir la même origine que l'adresse du serveur.",
  "localServer.test.action": "Tester",
  "localServer.test.testing": "Test en cours",
  "localServer.test.online": "En ligne. {models} trouvés.",
  "localServer.test.onlineKind": "{kind} est en ligne. {models} trouvés.",
  "localServer.test.gpuFound": "État du GPU lu : {count}",
  "localServer.test.gpuCount": { one: "{count} GPU", other: "{count} GPU" },
  "localServer.test.offline": "Hors ligne. {error}",
  "localServer.test.gpuFailed": "Échec de l'état du GPU : {error}",
  "localServer.dialog.saving": "Enregistrement",
  "localServer.dialog.saveFailed": "OpenBot Code n'a pas pu enregistrer cette machine.",
  "localServer.remove.title": "Retirer {name} ?",
  "localServer.remove.description":
    "OpenBot Code n'utilise plus cette machine. Les projets et discussions qui utilisent ses modèles ont besoin d'un autre modèle.",
  "localServer.remove.failed": "OpenBot Code n'a pas pu retirer cette machine.",
} as const satisfies PartialTranslation<typeof source>;
