import type { DockPlacement, DockSplitDirection, SlotPanelKind } from "./project-dock-panels";
import type { CloseReason } from "./project-preview-model";

export interface OpenChatRequest {
  projectId: string;
  agentId: string | null;
  chatId: string | null;
  placement: DockPlacement;
}

export interface OpenSlotRequest {
  kind: SlotPanelKind;
  projectId: string;
  title: string;
  data: Record<string, string>;
  placement: DockPlacement;
}

export interface ProjectDockController {
  open(request: OpenChatRequest): void;
  openSlot(request: OpenSlotRequest): void;
  split(direction: DockSplitDirection): void;
  closeActive(): void;
  toggleMaximize(): void;
  nextPanel(step: 1 | -1): void;
  panelCount(): number;
  openContent(request: OpenContentRequest): void;
  closeTransient(reason: CloseReason, scope?: { chatKey?: string | null }): void;
}

export interface OpenContentRequest {
  kind: "preview" | "browser";
  projectId: string;
  title: string;
  data: Record<string, string>;
  activate: boolean;
  pinned?: boolean;
}
