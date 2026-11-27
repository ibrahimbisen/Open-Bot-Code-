import type { AttachmentSummary } from "@codebot/contracts/ipc";
import { useText } from "@codebot/ui/text";
import { createEffect, onSettled } from "solid-js";
import { useAgentTasks } from "../agent-tasks/agent-tasks-context";
import { projectBrowserPort } from "./project-browser-port";
import type { ProjectDockController } from "./project-dock-controller";
import { useProjects } from "./projects-context";

function splitChatKey(key: string): { agentId: string; chatId: string } | null {
  const [agentId, chatId] = key.split("\u0000");
  return agentId && chatId ? { agentId, chatId } : null;
}

export function createAgentContentBridge(deps: {
  projectId: () => string;
  controller: () => ProjectDockController | null;
}) {
  const { t } = useText();
  const projects = useProjects();
  const tasks = useAgentTasks();
  const known = new Set<string>();
  let baseline = false;
  const working = new Map<string, boolean>();

  function chatOfThread(threadId: string): { agentId: string; chatId: string } | null {
    for (const key of projects.openChatKeys()) {
      const chat = splitChatKey(key);
      if (!chat) continue;
      const task = tasks.snapshot(chat.agentId)?.tasks.find((entry) => entry.id === chat.chatId);
      if (task?.threadId === threadId) return chat;
    }
    return null;
  }

  onSettled(() => {
    const port = projectBrowserPort().browser;
    const stop = port.onDisplayState((state) => {
      for (const tab of state.tabs) {
        if (known.has(tab.id)) continue;
        known.add(tab.id);
        if (!baseline || !tab.ownerThreadId) continue;
        const chat = chatOfThread(tab.ownerThreadId);
        if (!chat) continue;
        deps.controller()?.openContent({
          kind: "browser",
          projectId: deps.projectId(),
          title: tab.title || t("panel.add.browser"),
          data: { tabId: tab.id, origin: "agent", agentId: chat.agentId, chatId: chat.chatId },
          activate: false,
        });
      }
    });
    void port
      .getDisplayState()
      .then((state) => {
        for (const tab of state.tabs) known.add(tab.id);
      })
      .finally(() => {
        baseline = true;
      });
    return stop;
  });

  createEffect(
    () => {
      const states = new Map<string, boolean>();
      for (const key of projects.openChatKeys()) {
        const chat = splitChatKey(key);
        if (!chat) continue;
        const state = tasks.snapshot(chat.agentId)?.tasks.find((entry) => entry.id === chat.chatId)?.state;
        states.set(key, state === "running" || state === "queued");
      }
      return states;
    },
    (states) => {
      for (const [key, busy] of states) {
        if (working.get(key) === true && !busy) deps.controller()?.closeTransient("agent-done", { chatKey: key });
      }
      working.clear();
      for (const [key, busy] of states) working.set(key, busy);
    },
  );
}

export function previewOfAttachment(
  projectId: string,
  chat: { agentId: string; chatId: string | null },
  attachment: AttachmentSummary,
) {
  return {
    kind: "preview" as const,
    projectId,
    title: attachment.name,
    data: {
      origin: "user",
      source: "attachment",
      key: `attachment:${attachment.id}`,
      attachment: JSON.stringify(attachment),
      agentId: chat.agentId,
      ...(chat.chatId ? { chatId: chat.chatId } : {}),
    },
    activate: true,
  };
}

export function previewOfFile(
  projectId: string,
  chat: { agentId: string; chatId: string | null },
  file: { kind: "shared" | "workspace"; agentId: string | undefined; path: string },
) {
  const name = file.path.split(/[\\/]/u).pop() ?? file.path;
  return {
    kind: "preview" as const,
    projectId,
    title: name,
    data: {
      origin: "user",
      source: file.kind,
      key: `${file.kind}:${file.agentId ?? chat.agentId}:${file.path}`,
      path: file.path,
      agentId: file.agentId ?? chat.agentId,
      ...(chat.chatId ? { chatId: chat.chatId } : {}),
    },
    activate: true,
  };
}
