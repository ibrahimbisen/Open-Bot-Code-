import type { ProjectSummary } from "@codebot/contracts/ipc";
import type { JSX } from "@solidjs/web";

export interface LeftBarSlotProps {
  compact: boolean;
}

export interface ProjectToolSlotProps {
  project: ProjectSummary;
}

export interface ChatFileTreeSlotProps {
  project: ProjectSummary;
  chat: { agentId: string; chatId: string } | null;
  onClose: () => void;
}

export interface ProjectReplyRuleSlotProps {
  project: ProjectSummary;
  value: string | null;
  disabled: boolean;
  onChange: (value: string | null) => void;
}

export interface ProjectSlots {
  leftBarAdvanced: ((props: LeftBarSlotProps) => JSX.Element) | undefined;
  leftBarFooter: ((props: LeftBarSlotProps) => JSX.Element) | undefined;
  projectFiles: ((props: ProjectToolSlotProps) => JSX.Element) | undefined;
  projectGit: ((props: ProjectToolSlotProps) => JSX.Element) | undefined;
  chatFileTree: ((props: ChatFileTreeSlotProps) => JSX.Element) | undefined;
  settingsReplyRule: ((props: ProjectReplyRuleSlotProps) => JSX.Element) | undefined;
}

export const projectSlots: ProjectSlots = {
  leftBarAdvanced: undefined,
  leftBarFooter: undefined,
  projectFiles: undefined,
  projectGit: undefined,
  chatFileTree: undefined,
  settingsReplyRule: undefined,
};
