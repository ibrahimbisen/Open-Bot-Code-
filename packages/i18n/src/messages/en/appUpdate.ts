import { defineMessages } from "../../message";

export const messages = defineMessages("appUpdate", {
  "appUpdate.server.title": "Update server",
  "appUpdate.server.description":
    "Leave this empty to get updates from the GitHub releases of OpenBot Code. To use your own server, enter the URL of the folder that has the installers and the update files.",
  "appUpdate.server.urlLabel": "Update server URL",
  "appUpdate.server.placeholder": "https://example.com/codebot-updates/",
  "appUpdate.server.source.settings": "OpenBot Code gets updates from this URL.",
  "appUpdate.server.source.environment":
    "OpenBot Code gets updates from {url}. This URL comes from the CODEBOT_UPDATE_URL environment variable.",
  "appUpdate.server.source.build":
    "OpenBot Code gets updates from {url}. This URL comes from this build of OpenBot Code.",
  "appUpdate.server.source.none": "No update server is set. OpenBot Code does not check for updates.",
  "appUpdate.server.saveFailed": "OpenBot Code could not save the update server URL.",
  "appUpdate.server.loadFailed": "OpenBot Code could not read the update server URL.",
  "appUpdate.autoRestart.title": "Restart automatically when idle",
  "appUpdate.autoRestart.description":
    "OpenBot Code restarts to install a downloaded update when no agent works. Members of your servers are disconnected for a short time.",
});
