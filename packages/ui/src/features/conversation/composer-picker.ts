import type { DraftAttachment, SlashCommandEntry } from "@codebot/contracts/ipc";
import type { AppTextKey } from "@codebot/i18n";
import {
  Blocks,
  Bot,
  File,
  Folder,
  Plug,
  Puzzle,
  ShieldCheck,
  Slash,
  SquareTerminal,
  Store,
  UsersRound,
} from "@codebot/ui";
import type { ComposerAgent, ComposerBrowserTab, ComposerMcpServer, ComposerSkill, ComposerThread } from "../../data";
import type { TextValue } from "../../text";
import { browserDisplayUrl } from "../browser/browser-suggestions";

export interface PickerFrame {
  mount: HTMLElement | undefined;
  bottom: number;
}

export type PickerOption =
  | { type: "agent"; agent: ComposerAgent }
  | { type: "everyone" }
  | { type: "skill"; skill: ComposerSkill; showSlug: boolean }
  | { type: "mcp"; server: ComposerMcpServer }
  | { type: "attachment"; attachment: DraftAttachment }
  | { type: "tab"; tab: ComposerBrowserTab }
  | { type: "thread"; thread: ComposerThread; snippet?: string | undefined }
  | { type: "command"; command: SlashCommandEntry };

export interface PickerSection {
  id: string;
  title: AppTextKey | null;
  options: PickerOption[];
}

export function pickerOptionKey(option: PickerOption): string {
  if (option.type === "agent") return `agent:${option.agent.id}`;
  if (option.type === "everyone") return "everyone";
  if (option.type === "skill") return `skill:${option.skill.skillId}`;
  if (option.type === "tab") return `tab:${option.tab.id}`;
  if (option.type === "thread") return `thread:${option.thread.id}`;
  if (option.type === "command") return `command:${option.command.name}`;
  return option.type === "mcp" ? `mcp:${option.server.id}` : `attachment:${option.attachment.id}`;
}

export function pickerOptionText(option: PickerOption, t: TextValue["t"]): string {
  if (option.type === "agent") return t("composer.picker.option.agent", { name: option.agent.name });
  if (option.type === "everyone") return t("composer.picker.everyone");
  if (option.type === "skill") {
    const name = option.showSlug ? `${option.skill.name} ${option.skill.slug}` : option.skill.name;
    return t("composer.picker.option.skill", { name });
  }
  if (option.type === "tab") return t("composer.picker.option.tab", { name: tabTitle(option.tab) });
  if (option.type === "thread") return t("composer.picker.option.thread", { name: option.thread.title });
  if (option.type === "command") return t("slash.picker.option", { name: option.command.name });
  return option.type === "mcp"
    ? t("composer.picker.option.mcp", { name: option.server.name })
    : t("composer.picker.option.file", { name: option.attachment.name });
}

export function pickerOptionName(option: PickerOption, t: TextValue["t"]): string {
  if (option.type === "agent") return option.agent.name;
  if (option.type === "everyone") return t("composer.picker.everyone");
  if (option.type === "skill") return option.skill.name;
  if (option.type === "tab") return tabTitle(option.tab);
  if (option.type === "thread") return option.thread.title;
  if (option.type === "command") return `/${option.command.name}`;
  return option.type === "mcp" ? option.server.name : option.attachment.name;
}

export function pickerOptionDescription(
  option: PickerOption,
  t: TextValue["t"],
  format: TextValue["format"],
): string | undefined {
  if (option.type === "everyone") return t("composer.picker.everyoneDescription");
  if (option.type === "attachment") return format.fileSize(option.attachment.size);
  if (option.type === "skill") return skillDescription(option.skill);
  if (option.type === "mcp") return mcpServerDescription(option.server);
  if (option.type === "tab") return browserDisplayUrl(option.tab.url) || undefined;
  if (option.type === "thread") return option.snippet ?? threadDetail(option.thread);
  if (option.type === "command") return commandDescription(option.command);
  return option.agent.description.trim() || option.agent.title.trim() || undefined;
}

export function tabTitle(tab: ComposerBrowserTab): string {
  return tab.title.trim() || browserDisplayUrl(tab.url) || tab.url;
}

function threadDetail(thread: ComposerThread): string | undefined {
  if (thread.state === "running") return thread.progress?.trim() || undefined;
  if (thread.outcome === "failed") return thread.error?.trim() || undefined;
  return undefined;
}

const THREAD_STATE_LABELS = {
  running: "conversation.tasks.state.running",
  queued: "conversation.tasks.state.queued",
  new: "conversation.tasks.state.new",
  completed: "conversation.tasks.state.completed",
  failed: "conversation.tasks.state.failed",
  interrupted: "conversation.tasks.state.interrupted",
} as const satisfies Record<string, AppTextKey>;

function threadStateLabel(thread: ComposerThread): keyof typeof THREAD_STATE_LABELS {
  if (thread.state === "running" || thread.state === "queued") return thread.state;
  return thread.outcome ?? "new";
}

export function referenceMatches(option: { tab: ComposerBrowserTab } | { thread: ComposerThread }, query: string) {
  if (!query) return true;
  const text = "tab" in option ? `${tabTitle(option.tab)} ${browserDisplayUrl(option.tab.url)}` : option.thread.title;
  return text.toLocaleLowerCase().includes(query);
}

function mcpServerDescription(server: ComposerMcpServer): string | undefined {
  const source = server.transport === "stdio" ? [server.command, ...server.args].join(" ") : server.url;
  return source.trim() || undefined;
}

export function measurePickerFrame(editor: HTMLElement): PickerFrame {
  const wrap = editor.closest(".composer-wrap");
  const composer = editor.closest(".composer");
  if (!(wrap instanceof HTMLElement) || !composer) return { mount: undefined, bottom: 0 };
  return { mount: wrap, bottom: wrap.getBoundingClientRect().bottom - composer.getBoundingClientRect().top };
}

export function pickerOptionBadge(
  option: PickerOption,
  t: TextValue["t"],
): { label: string; icon?: typeof Puzzle } | null {
  if (option.type === "tab") return null;
  if (option.type === "thread") return { label: t(THREAD_STATE_LABELS[threadStateLabel(option.thread)]) };
  if (option.type === "agent") return { label: t("composer.picker.badge.agent"), icon: Bot };
  if (option.type === "everyone") return { label: t("composer.picker.badge.channel"), icon: UsersRound };
  if (option.type === "attachment") return { label: t("composer.picker.badge.file"), icon: File };
  if (option.type === "mcp") return { label: MCP_BADGE, icon: Plug };
  if (option.type === "command") return commandBadge(option.command, t);
  switch (option.skill.origin ?? "marketplace") {
    case "local":
      return { label: t("composer.picker.badge.custom"), icon: Folder };
    case "managed":
      return { label: t("composer.picker.badge.system"), icon: ShieldCheck };
    case "workspace":
      return { label: t("composer.picker.badge.workspace"), icon: Folder };
    default:
      return { label: t("composer.picker.badge.marketplace"), icon: Store };
  }
}

const MCP_BADGE = "MCP";

export function skillMatchRank(skill: ComposerSkill, query: string): number | null {
  if (!query) return 0;
  const name = skill.name.toLocaleLowerCase();
  const slug = skill.slug.toLocaleLowerCase();
  if (name === query || slug === query) return 0;
  if (name.startsWith(query) || slug.startsWith(query)) return 1;
  if (name.split(/[\s\-_]+/u).some((word) => word.startsWith(query))) return 2;
  if (name.includes(query) || slug.includes(query)) return 3;
  return skill.description?.toLocaleLowerCase().includes(query) ? 4 : null;
}

function skillDescription(skill: ComposerSkill): string | undefined {
  const description = skill.description?.trim();
  return description || undefined;
}

function commandDescription(command: SlashCommandEntry): string | undefined {
  const text = [command.argumentHint, command.description].filter((part) => part.trim()).join(" ");
  return text || undefined;
}

function commandBadge(command: SlashCommandEntry, t: TextValue["t"]): { label: string; icon?: typeof Puzzle } | null {
  if (command.terminalOnly) return { label: t("slash.badge.terminal"), icon: SquareTerminal };
  if (command.source === "project") return { label: t("slash.badge.project"), icon: Folder };
  if (command.source === "user") return { label: t("slash.badge.user"), icon: Folder };
  if (command.source === "plugin") return { label: command.plugin ?? t("slash.badge.plugin"), icon: Blocks };
  if (command.source === "mcp") return { label: t("slash.badge.mcp"), icon: Plug };
  if (command.source === "host") return { label: t("slash.badge.host"), icon: Slash };
  if (command.kind === "skill") return { label: t("slash.badge.skill"), icon: Puzzle };
  return null;
}

export function slashCommandMatchRank(command: SlashCommandEntry, query: string): number | null {
  if (!query) return 0;
  const name = command.name.toLocaleLowerCase();
  const aliases = command.aliases.map((alias) => alias.toLocaleLowerCase());
  if (name === query || aliases.includes(query)) return 0;
  if (name.startsWith(query) || aliases.some((alias) => alias.startsWith(query))) return 1;
  if (name.split(/[:\s_-]+/u).some((word) => word.startsWith(query))) return 2;
  if (name.includes(query) || aliases.some((alias) => alias.includes(query))) return 3;
  return command.description.toLocaleLowerCase().includes(query) ? 4 : null;
}
