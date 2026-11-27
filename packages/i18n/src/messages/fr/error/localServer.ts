import type { PartialTranslation } from "../../../message";
import type { messages as source } from "../../en/error/localServer";

export const messages = {
  "error.localServer.refused":
    "Le serveur de modèles à {host} a refusé la connexion. Démarre le serveur de modèles sur cette machine.",
  "error.localServer.hostNotFound": "L'adresse {host} est introuvable. Vérifie le nom de la machine.",
  "error.localServer.timeout": "Le serveur de modèles à {host} n'a pas répondu en {seconds} secondes.",
  "error.localServer.unreachable":
    "Le serveur de modèles à {host} est inaccessible. Vérifie que la machine est allumée et sur ton réseau.",
  "error.localServer.redirect":
    "Le serveur de modèles à {host} a envoyé une redirection. OpenBot Code ne suit pas les redirections, pour protéger la clé d'API.",
  "error.localServer.keyNeeded":
    "Le serveur de modèles à {host} a besoin d'une clé d'API. Ajoute la clé de cette machine.",
  "error.localServer.keyRefused":
    "Le serveur de modèles à {host} a refusé la clé d'API. Vérifie la clé de cette machine.",
  "error.localServer.http": "Le serveur de modèles à {host} a répondu avec le statut HTTP {status}.",
  "error.localServer.invalidAnswer":
    "Le serveur de modèles à {host} n'a pas envoyé de liste de modèles compatible OpenAI.",
  "error.localServer.tooLarge": "La réponse du serveur de modèles à {host} est trop grande.",
  "error.localServer.gpuUnreachable": "L'adresse d'état du GPU {host} est inaccessible.",
  "error.localServer.gpuTimeout": "L'adresse d'état du GPU {host} n'a pas répondu en {seconds} secondes.",
  "error.localServer.gpuRedirect":
    "L'adresse d'état du GPU {host} a envoyé une redirection. OpenBot Code ne suit pas les redirections.",
  "error.localServer.gpuHttp": "L'adresse d'état du GPU {host} a répondu avec le statut HTTP {status}.",
  "error.localServer.gpuInvalid":
    "L'adresse d'état du GPU {host} n'a envoyé aucune valeur GPU qu'OpenBot Code peut lire.",
  "error.localServer.gpuTooLarge": "La réponse de l'adresse d'état du GPU {host} est trop grande.",
  "error.localServer.gpuUrlInvalid":
    "L'URL d'état du GPU doit être une adresse http ou https sans nom d'utilisateur ni mot de passe.",
  "error.localServer.gpuKeyOtherOrigin":
    "La clé d'API ne peut aller à l'URL d'état du GPU que si cette URL a la même origine que l'URL de base.",
  "error.localServer.scanHostInvalid": "Saisis un nom d'hôte, une adresse IP ou une adresse http ou https.",
} as const satisfies PartialTranslation<typeof source>;
