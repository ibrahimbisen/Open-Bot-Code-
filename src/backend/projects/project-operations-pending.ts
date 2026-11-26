import { sourceText } from "@codebot/i18n/source";
import { type ProjectOperations, projectStep } from "./project-operations";

function notReady(): never {
  throw new Error(sourceText("error.project.notReady"));
}

export function pendingProjectOperations(): ProjectOperations {
  const fail = () => projectStep(notReady);
  return {
    list: () => [],
    find: () => null,
    get: fail,
    create: fail,
    update: fail,
    archive: fail,
    restore: fail,
    delete: fail,
    checkFolder: fail,
    addFolder: fail,
    removeFolder: fail,
    createAgent: fail,
    updateAgent: fail,
    removeAgent: fail,
    listChats: notReady,
    getChat: notReady,
    searchChats: notReady,
    startChat: fail,
    setChatArchived: fail,
    setChatPinned: notReady,
    listActivity: () => [],
    subscribe: () => () => undefined,
  };
}
