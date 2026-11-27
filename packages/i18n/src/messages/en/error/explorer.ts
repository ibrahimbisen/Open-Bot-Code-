import { defineMessages } from "../../../message";

export const messages = defineMessages("error.explorer", {
  "error.explorer.outside": "This path is not in the folders of the project.",
  "error.explorer.notFound": "The file or folder does not exist.",
  "error.explorer.rootProtected": "A project folder cannot be renamed or deleted here.",
  "error.explorer.invalidName": "This name is not valid for a file or a folder.",
  "error.explorer.notFile": "This path is not a file.",
  "error.explorer.notDirectory": "This path is not a folder.",
  "error.explorer.exists": "A file or folder with the name {name} is in this folder already.",
  "error.explorer.unknownAgent": "The agent of this file tree does not exist.",
  "error.explorer.gitTimeout": "A Git command took too long and was stopped.",
  "error.explorer.gitFailed": "Git reported an error: {detail}",
  "error.explorer.serverUnsupported": "This server cannot show files. Update the server.",
  "error.explorer.clientUnsupported": "This CodeBot version cannot show the files of a server.",
  "error.explorer.remoteFailed": "The server could not finish this file action. Try again.",
});
