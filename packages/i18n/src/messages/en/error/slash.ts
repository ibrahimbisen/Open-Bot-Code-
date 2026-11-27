import { defineMessages } from "../../../message";

export const messages = defineMessages("error.slash", {
  "error.slash.resumeUnsupported": "This agent cannot resume a saved chat from its engine.",
  "error.slash.resumeEngineOff": "The engine is not running. Start it and try again.",
  "error.slash.sessionNotFound": "This saved chat is gone. Update the list and choose another one.",
  "error.slash.sessionInUse": "A chat in CodeBot already uses this saved chat.",
  "error.slash.remoteFailed": "The server could not finish this command. Try again.",
  "error.slash.serverUnsupported": "This server cannot list slash commands. Update the server.",
  "error.slash.clientUnsupported": "This CodeBot version cannot read the slash commands of a server.",
});
