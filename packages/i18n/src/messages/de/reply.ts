import type { PartialTranslation } from "../../message";
import type { messages as source } from "../en/reply";

export const messages = {
  "reply.summary.edited": { one: "{count} Datei bearbeitet", other: "{count} Dateien bearbeitet" },
  "reply.summary.ran": { one: "{count} Befehl ausgeführt", other: "{count} Befehle ausgeführt" },
  "reply.summary.read": { one: "{count} Datei gelesen", other: "{count} Dateien gelesen" },
  "reply.summary.searched": { one: "{count}-mal gesucht", other: "{count}-mal gesucht" },
  "reply.summary.browsed": { one: "{count} Seite geöffnet", other: "{count} Seiten geöffnet" },
  "reply.summary.delegated": { one: "{count} Aufgabe übergeben", other: "{count} Aufgaben übergeben" },
  "reply.summary.worked": { one: "{count} anderes Tool verwendet", other: "{count} andere Tools verwendet" },
  "reply.details.show": "Details",
  "reply.details.hide": "Details ausblenden",
  "reply.details.loading": "Details werden geladen…",
  "reply.details.input": "Eingabe",
  "reply.details.output": "Ausgabe",
  "reply.details.shortened": "Gekürzt",
  "reply.details.timeline": "Zeitverlauf",
  "reply.code.showAll": "Alle anzeigen ({count} Zeilen)",
  "reply.code.showLess": "Weniger anzeigen",
  "reply.view.title": "Antwortansicht",
  "reply.view.description":
    "Kurz zeigt die Antwort und eine einzeilige Zusammenfassung der Arbeit. Detailliert zeigt auch die Schritte.",
  "reply.view.short": "Kurz",
  "reply.view.detailed": "Detailliert",
  "reply.rule.title": "Antwortregel",
  "reply.rule.description": "Jeder Chat erhält diese Regel. Projekte können eine eigene Regel verwenden.",
  "reply.rule.label": "Regel für Antworten",
  "reply.rule.save": "Regel speichern",
  "reply.rule.reset": "Standardregel verwenden",
  "reply.rule.saved": "Regel gespeichert",
  "reply.rule.empty": "Leer: Es wird keine Antwortregel gesendet",
  "reply.rule.count": "{count} von {max} Zeichen",
} as const satisfies PartialTranslation<typeof source>;
