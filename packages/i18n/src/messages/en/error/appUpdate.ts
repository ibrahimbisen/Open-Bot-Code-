import { defineMessages } from "../../../message";

export const messages = defineMessages("error.appUpdate", {
  "error.appUpdate.noServer": "No update server is set. Enter the update server URL in Settings > Updates.",
  "error.appUpdate.urlInvalid": "The update server URL is not valid. Use a URL that starts with https://.",
  "error.appUpdate.urlCredentials": "Remove the user name and the password from the update server URL.",
  "error.appUpdate.urlInsecure":
    "Use https:// for the update server URL. http:// is permitted only for a computer on your own network.",
  "error.appUpdate.urlNotSaved": "OpenBot Code could not save the update server URL. Try again.",
  "error.appUpdate.manualDownload":
    "This Mac build is not signed, so OpenBot Code cannot install updates by itself. Select Download to open the download page, then install the new version by hand.",
});
