import type { ProjectSummary } from "@codebot/contracts/ipc";
import type { JSX } from "@solidjs/web";
import { z } from "zod";

export const SLOT_PANEL_KINDS = ["file", "diff", "browser"] as const;
export type SlotPanelKind = (typeof SLOT_PANEL_KINDS)[number];

const chatPanelSchema = z.object({
  kind: z.literal("chat"),
  projectId: z.string().min(1),
  agentId: z.string().min(1).nullable(),
  chatId: z.string().min(1).nullable(),
  pinned: z.boolean().optional(),
});

const slotPanelSchema = z.object({
  kind: z.enum(SLOT_PANEL_KINDS),
  projectId: z.string().min(1),
  title: z.string(),
  data: z.record(z.string(), z.string()),
  pinned: z.boolean().optional(),
});

export const dockPanelParamsSchema = z.discriminatedUnion("kind", [chatPanelSchema, slotPanelSchema]);

export type ChatPanelParams = z.infer<typeof chatPanelSchema>;
export type SlotPanelParams = z.infer<typeof slotPanelSchema>;
export type DockPanelParams = z.infer<typeof dockPanelParamsSchema>;

export function isChatPanel(params: DockPanelParams): params is ChatPanelParams {
  return params.kind === "chat";
}

export interface SlotPanelProps {
  panelId: string;
  params: SlotPanelParams;
  project: ProjectSummary | undefined;
  visible: boolean;
  onTitleChange: (title: string) => void;
  onClose: () => void;
}

export type SlotPanelContent = (props: SlotPanelProps) => JSX.Element;

export const slotPanelContents: Record<SlotPanelKind, SlotPanelContent | undefined> = {
  file: undefined,
  diff: undefined,
  browser: undefined,
};

export type DockPlacement = "active" | "right" | "below";

export type DockSplitDirection = "right" | "below";
