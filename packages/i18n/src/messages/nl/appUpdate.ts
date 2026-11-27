import type { PartialTranslation } from "../../message";
import type { messages as source } from "../en/appUpdate";

export const messages = {
  "appUpdate.server.title": "Updateserver",
  "appUpdate.server.description":
    "Laat dit leeg om updates te krijgen uit de GitHub-releases van OpenBot Code. Voor je eigen server vul je de URL in van de map met de installatieprogramma's en de updatebestanden.",
  "appUpdate.server.urlLabel": "URL van de updateserver",
  "appUpdate.server.placeholder": "https://example.com/codebot-updates/",
  "appUpdate.server.source.settings": "OpenBot Code haalt updates op van deze URL.",
  "appUpdate.server.source.environment":
    "OpenBot Code haalt updates op van {url}. Deze URL komt uit de omgevingsvariabele CODEBOT_UPDATE_URL.",
  "appUpdate.server.source.build":
    "OpenBot Code haalt updates op van {url}. Deze URL komt uit deze build van OpenBot Code.",
  "appUpdate.server.source.none": "Er is geen updateserver ingesteld. OpenBot Code controleert niet op updates.",
  "appUpdate.server.saveFailed": "OpenBot Code kon de URL van de updateserver niet opslaan.",
  "appUpdate.server.loadFailed": "OpenBot Code kon de URL van de updateserver niet lezen.",
  "appUpdate.autoRestart.title": "Automatisch herstarten als niets bezig is",
  "appUpdate.autoRestart.description":
    "OpenBot Code start opnieuw om een gedownloade update te installeren als er geen agent werkt. Leden van je servers worden kort losgekoppeld.",
} as const satisfies PartialTranslation<typeof source>;
