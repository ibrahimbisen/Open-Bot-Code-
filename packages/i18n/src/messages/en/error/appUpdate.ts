import { defineMessages } from "../../../message";

export const messages = defineMessages("error.appUpdate", {
  "error.appUpdate.noServer": "No update server is set. Enter the update server URL in Settings > Updates.",
  "error.appUpdate.urlInvalid": "The update server URL is not valid. Use a URL that starts with https://.",
  "error.appUpdate.urlCredentials": "Remove the user name and the password from the update server URL.",
  "error.appUpdate.urlInsecure":
    "Use https:// for the update server URL. http:// is permitted only for a computer on your own network.",
  "error.appUpdate.urlNotSaved": "CodeBot could not save the update server URL. Try again.",
});
