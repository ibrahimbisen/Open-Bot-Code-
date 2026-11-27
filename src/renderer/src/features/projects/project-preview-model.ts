import type { DockPanelParams } from "./project-dock-panels";

export const TRANSIENT_KINDS = ["preview", "browser"] as const;

export type CloseReason = "chat-switch" | "project-switch" | "composer" | "agent-done" | "content-gone";

export type ContentOrigin = "agent" | "user";

export interface TransientPanel {
  id: string;
  kind: (typeof TRANSIENT_KINDS)[number];
  pinned: boolean;
  origin: ContentOrigin;
  chatKey: string | null;
}

export function isTransientKind(kind: string): kind is (typeof TRANSIENT_KINDS)[number] {
  return kind === "preview" || kind === "browser";
}

export function chatKeyFrom(agentId: string | null | undefined, chatId: string | null | undefined): string | null {
  return agentId && chatId ? `${agentId}\u0000${chatId}` : null;
}

export function transientPanelOf(id: string, params: DockPanelParams | null): TransientPanel | null {
  if (!params || params.kind === "chat" || !isTransientKind(params.kind)) return null;
  const data = "data" in params ? params.data : {};
  return {
    id,
    kind: params.kind,
    pinned: params.pinned === true,
    origin: data.origin === "agent" ? "agent" : "user",
    chatKey: chatKeyFrom(data.agentId, data.chatId),
  };
}

export function panelsToClose(
  panels: readonly TransientPanel[],
  reason: CloseReason,
  scope: { chatKey?: string | null } = {},
): string[] {
  return panels
    .filter((panel) => {
      if (reason === "content-gone") return true;
      if (panel.pinned) return false;
      if (reason === "agent-done") return panel.origin === "agent" && panel.chatKey === (scope.chatKey ?? null);
      return true;
    })
    .map((panel) => panel.id);
}
