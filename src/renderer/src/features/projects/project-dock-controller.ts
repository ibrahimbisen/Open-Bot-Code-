import type { DockPlacement, DockSplitDirection, SlotPanelKind } from "./project-dock-panels";

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
}
