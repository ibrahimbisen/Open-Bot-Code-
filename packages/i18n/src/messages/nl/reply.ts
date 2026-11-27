import type { PartialTranslation } from "../../message";
import type { messages as source } from "../en/reply";

export const messages = {
  "reply.summary.edited": { one: "{count} bestand bewerkt", other: "{count} bestanden bewerkt" },
  "reply.summary.ran": { one: "{count} opdracht uitgevoerd", other: "{count} opdrachten uitgevoerd" },
  "reply.summary.read": { one: "{count} bestand gelezen", other: "{count} bestanden gelezen" },
  "reply.summary.searched": { one: "{count} keer gezocht", other: "{count} keer gezocht" },
  "reply.summary.browsed": { one: "{count} pagina geopend", other: "{count} pagina's geopend" },
  "reply.summary.delegated": { one: "{count} taak overgedragen", other: "{count} taken overgedragen" },
  "reply.summary.worked": { one: "{count} andere tool gebruikt", other: "{count} andere tools gebruikt" },
  "reply.details.show": "Details",
  "reply.details.hide": "Details verbergen",
  "reply.details.loading": "Details laden…",
  "reply.details.input": "Invoer",
  "reply.details.output": "Uitvoer",
  "reply.details.shortened": "Ingekort",
  "reply.details.timeline": "Tijdlijn",
  "reply.code.showAll": "Alles tonen ({count} regels)",
  "reply.code.showLess": "Minder tonen",
  "reply.view.title": "Antwoordweergave",
  "reply.view.description":
    "Kort toont het antwoord en een samenvatting van het werk in één regel. Uitgebreid toont ook de stappen.",
  "reply.view.short": "Kort",
  "reply.view.detailed": "Uitgebreid",
  "reply.rule.title": "Antwoordregel",
  "reply.rule.description": "Elke chat krijgt deze regel. Projecten kunnen hun eigen regel gebruiken.",
  "reply.rule.label": "Regel voor antwoorden",
  "reply.rule.save": "Regel opslaan",
  "reply.rule.reset": "Standaardregel gebruiken",
  "reply.rule.saved": "Regel opgeslagen",
  "reply.rule.empty": "Leeg: er wordt geen antwoordregel verzonden",
  "reply.rule.count": "{count} van {max} tekens",
} as const satisfies PartialTranslation<typeof source>;
