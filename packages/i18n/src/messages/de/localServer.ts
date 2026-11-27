import type { PartialTranslation } from "../../message";
import type { messages as source } from "../en/localServer";

export const messages = {
  "localServer.settings.title": "Lokale Server",
  "localServer.settings.description":
    "Modellmaschinen in deinem Netzwerk, zum Beispiel ein DGX Spark. Jede Maschine ist ein eigener Eintrag.",
  "localServer.settings.add": "Maschine hinzufügen",
  "localServer.settings.empty":
    "Noch keine lokale Maschine. Füge die Adresse eines Modellservers hinzu, um ihn in einem Projekt oder Chat zu nutzen.",
  "localServer.settings.edit": "{name} bearbeiten",
  "localServer.settings.remove": "{name} entfernen",
  "localServer.settings.refresh": "Jetzt prüfen",
  "localServer.settings.statusOff": "Status aus",
  "localServer.settings.models": { one: "{count} Modell", other: "{count} Modelle" },
  "localServer.scan.title": "Maschine finden",
  "localServer.scan.description":
    "Gib einen Hostnamen oder eine IP-Adresse ein. OpenBot Code sucht auf den üblichen Ports nach Ollama, LM Studio und vLLM.",
  "localServer.scan.host": "Host oder Adresse",
  "localServer.scan.placeholder": "spark-1.local",
  "localServer.scan.action": "Suchen",
  "localServer.scan.scanning": "Suche läuft",
  "localServer.scan.none": "Auf diesem Host wurde kein Modellserver gefunden.",
  "localServer.scan.needsKey": "Benötigt einen API-Schlüssel",
  "localServer.scan.add": "{name} hinzufügen",
  "localServer.dialog.addTitle": "Lokale Maschine hinzufügen",
  "localServer.dialog.editTitle": "{name} bearbeiten",
  "localServer.dialog.description":
    "OpenBot Code liest die Modellliste und den Status von der OpenAI-kompatiblen Adresse der Maschine.",
  "localServer.field.name": "Name",
  "localServer.field.namePlaceholder": "DGX Spark 1",
  "localServer.field.baseUrl": "Serveradresse",
  "localServer.field.baseUrlPlaceholder": "http://192.168.1.41:8000/v1",
  "localServer.field.apiKey": "API-Schlüssel (optional)",
  "localServer.field.apiKeyKept": "Gespeichert. Leer lassen, um ihn zu behalten.",
  "localServer.field.gpuUrl": "GPU-Status-Adresse (optional)",
  "localServer.field.gpuUrlPlaceholder": "http://192.168.1.41:9101/gpu",
  "localServer.field.gpuUrlHelp":
    "Eine JSON-, nvidia-smi-Exporter- oder DCGM-Exporter-Adresse, die GPU-Last und Speicher anzeigt.",
  "localServer.field.gpuUsesKey": "API-Schlüssel an die GPU-Status-Adresse senden",
  "localServer.field.gpuUsesKeyHelp": "Nur für eine Adresse mit demselben Ursprung wie die Serveradresse.",
  "localServer.field.monitored": "Status dieser Maschine anzeigen",
  "localServer.field.monitoredHelp":
    "OpenBot Code prüft die Maschine von Zeit zu Zeit und zeigt sie in der Statusleiste an.",
  "localServer.error.nameRequired": "Gib einen Namen ein.",
  "localServer.error.gpuUrlInvalid": "Gib eine http- oder https-Adresse ohne Benutzernamen und Passwort ein.",
  "localServer.error.gpuKeyOtherOrigin": "Die GPU-Status-Adresse muss denselben Ursprung wie die Serveradresse haben.",
  "localServer.test.action": "Testen",
  "localServer.test.testing": "Test läuft",
  "localServer.test.online": "Online. {models} gefunden.",
  "localServer.test.onlineKind": "{kind} ist online. {models} gefunden.",
  "localServer.test.gpuFound": "GPU-Status gelesen: {count}",
  "localServer.test.gpuCount": { one: "{count} GPU", other: "{count} GPUs" },
  "localServer.test.offline": "Offline. {error}",
  "localServer.test.gpuFailed": "GPU-Status fehlgeschlagen: {error}",
  "localServer.dialog.saving": "Wird gespeichert",
  "localServer.dialog.saveFailed": "OpenBot Code konnte diese Maschine nicht speichern.",
  "localServer.remove.title": "{name} entfernen?",
  "localServer.remove.description":
    "OpenBot Code verwendet diese Maschine nicht mehr. Projekte und Chats, die ihre Modelle nutzen, brauchen ein anderes Modell.",
  "localServer.remove.failed": "OpenBot Code konnte diese Maschine nicht entfernen.",
} as const satisfies PartialTranslation<typeof source>;
