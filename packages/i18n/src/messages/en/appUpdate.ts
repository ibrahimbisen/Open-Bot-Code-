import { defineMessages } from "../../message";

export const messages = defineMessages("appUpdate", {
  "appUpdate.server.title": "Update server",
  "appUpdate.server.description": "The folder on your server that has the CodeBot installers and the update files.",
  "appUpdate.server.urlLabel": "Update server URL",
  "appUpdate.server.placeholder": "https://example.com/codebot-updates/",
  "appUpdate.server.source.settings": "CodeBot gets updates from this URL.",
  "appUpdate.server.source.environment":
    "CodeBot gets updates from {url}. This URL comes from the CODEBOT_UPDATE_URL environment variable.",
  "appUpdate.server.source.build": "CodeBot gets updates from {url}. This URL comes from this build of CodeBot.",
  "appUpdate.server.source.none": "No update server is set. CodeBot does not check for updates.",
  "appUpdate.server.saveFailed": "CodeBot could not save the update server URL.",
  "appUpdate.server.loadFailed": "CodeBot could not read the update server URL.",
  "appUpdate.autoRestart.title": "Restart automatically when idle",
  "appUpdate.autoRestart.description":
    "CodeBot restarts to install a downloaded update when no agent works. Members of your servers are disconnected for a short time.",
});
