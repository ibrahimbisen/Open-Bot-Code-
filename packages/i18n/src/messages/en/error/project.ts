import { defineMessages } from "../../../message";

export const messages = defineMessages("error.project", {
  "error.project.serverTooOld": "This server does not support projects. Update CodeBot on the computer that runs it.",
  "error.project.remoteNotReady": "This version of CodeBot cannot use the projects of a joined server.",
  "error.project.notReady": "Projects are not ready. Try again in a moment.",
  "error.project.notFound": "This project no longer exists.",
  "error.project.archived": "This project is archived. Restore it first.",
  "error.project.nameRequired": "Give the project a name.",
  "error.project.limit": "You have the maximum number of projects ({limit}). Delete a project first.",
  "error.project.agentLimit": "A project can have at most {limit} agents.",
  "error.project.agentRequired": "A project needs at least one agent.",
  "error.project.agentNotFound": "This agent is not part of the project.",
  "error.project.agentNameRequired": "Give the agent a name.",
  "error.project.chatNotFound": "This chat no longer exists.",
  "error.project.cursorInvalid": "This part of the chat list is no longer valid. Load the chats again.",
  "error.project.folderMissing": "This folder does not exist.",
  "error.project.folderProtected": "CodeBot cannot use this folder. Choose a different folder.",
  "error.project.mainFolderMissing":
    "The main folder of this project is missing: {path}. Restore the folder or choose a new main folder.",
});
