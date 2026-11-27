import type {
  AgentTask,
  CodeBotDesktopApi,
  ResumableSession,
  SlashCommandEntry,
  SlashCommandScreen,
  SlashCommandSource,
} from "@codebot/contracts/ipc";
import { sourceText } from "@codebot/i18n/source";

interface MockCommandRow {
  name: string;
  description: string;
  argumentHint?: string;
  source?: SlashCommandSource;
  screen?: SlashCommandScreen;
  skill?: boolean;
  terminalOnly?: boolean;
}

const MOCK_COMMANDS: readonly MockCommandRow[] = [
  { name: "add-dir", description: "Add a working directory for this session", argumentHint: "<path>" },
  { name: "agents", description: "Manage agent configurations" },
  { name: "clear", description: "Clear the conversation history and free up context" },
  { name: "compact", description: "Free up context by summarizing the conversation", argumentHint: "[instructions]" },
  { name: "config", description: "Open the settings panel" },
  { name: "context", description: "Show what is using the context window" },
  { name: "cost", description: "Show the token usage of this session" },
  { name: "doctor", description: "Check the health of the installation", terminalOnly: true },
  {
    name: "effort",
    description: "Set the thinking level for the model",
    argumentHint: "[low|medium|high]",
    screen: "effort",
  },
  { name: "export", description: "Export the conversation to a file", argumentHint: "[filename]" },
  { name: "help", description: "Show the help and the available commands" },
  { name: "init", description: "Create a CLAUDE.md file for this project" },
  { name: "mcp", description: "Manage MCP servers" },
  { name: "memory", description: "Edit the memory files" },
  { name: "model", description: "Set the model for this session", argumentHint: "[model]", screen: "model" },
  { name: "permissions", description: "Manage allow and deny rules for tools" },
  { name: "plan", description: "Enter plan mode" },
  { name: "resume", description: "Resume a saved conversation", screen: "resume", source: "host" },
  { name: "review", description: "Review a pull request", argumentHint: "[pr]" },
  { name: "rewind", description: "Rewind the conversation to a previous point" },
  { name: "status", description: "Show the status of the session" },
  { name: "usage", description: "Show the plan usage limits" },
  { name: "release-notes", description: "Write release notes for the next version", source: "project", skill: true },
  {
    name: "frontend:component",
    description: "Create a component in the design system",
    argumentHint: "<name>",
    source: "project",
  },
  { name: "standup", description: "Write my daily summary from yesterday's commits", source: "user" },
];

const MOCK_SESSIONS: readonly Omit<ResumableSession, "taskId" | "current">[] = [
  {
    sessionId: "6f1c7c35-9a5d-4e0b-8b8a-0f6d4c9d1a01",
    title: "Fix the sidebar scroll jump",
    firstPrompt: "The sidebar jumps when I open a project",
    updatedAt: "2026-11-26T08:12:00.000Z",
    createdAt: "2026-11-25T14:03:00.000Z",
    gitBranch: "fix/sidebar-scroll",
  },
  {
    sessionId: "0b7d2a6e-3f4c-4d1a-92e5-5a8c1b7f2c02",
    title: "Plan the file tree panel",
    firstPrompt: "Plan the file tree panel for projects",
    updatedAt: "2026-11-24T16:40:00.000Z",
    createdAt: "2026-11-24T15:10:00.000Z",
    gitBranch: "main",
  },
];

function entry(row: MockCommandRow): SlashCommandEntry {
  return {
    name: row.name,
    description: row.description,
    argumentHint: row.argumentHint ?? "",
    aliases: [],
    source: row.source ?? "builtin",
    plugin: null,
    kind: row.skill ? "skill" : "command",
    terminalOnly: row.terminalOnly ?? false,
    screen: row.screen ?? null,
  };
}

export interface MockSlashCommandsOptions {
  resume(agentId: string, title: string): AgentTask;
}

export function createMockSlashCommands({ resume }: MockSlashCommandsOptions): CodeBotDesktopApi["slashCommands"] {
  const listeners = new Set<(change: { agentId: string | null; taskId: string | null }) => void>();
  const used = new Map<string, string>();
  return {
    list: async ({ agentId, taskId }) => ({
      agentId,
      taskId: taskId ?? null,
      provider: "claude",
      origin: "saved",
      engineVersion: "2.1.309",
      commands: MOCK_COMMANDS.map(entry),
    }),
    listSessions: async (agentId) => ({
      agentId,
      folder: "~/projects/codebot",
      sessions: MOCK_SESSIONS.map((session) => ({
        ...session,
        taskId: used.get(session.sessionId) ?? null,
        current: used.has(session.sessionId),
      })),
    }),
    resumeSession: async ({ agentId, sessionId }) => {
      const session = MOCK_SESSIONS.find((candidate) => candidate.sessionId === sessionId);
      if (!session) throw new Error(sourceText("error.slash.sessionNotFound"));
      if (used.has(sessionId)) throw new Error(sourceText("error.slash.sessionInUse"));
      const task = resume(agentId, session.title);
      used.set(sessionId, task.id);
      return { task, importedMessages: 0 };
    },
    onChanged: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
