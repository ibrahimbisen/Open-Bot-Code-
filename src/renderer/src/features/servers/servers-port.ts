import type { CodeBotDesktopApi, ServerSummary } from "@codebot/contracts/ipc";

export interface ServersPort {
  agent: Pick<
    CodeBotDesktopApi["agent"],
    | "getStatus"
    | "listAgents"
    | "listConversationReads"
    | "listHiddenAgents"
    | "listAgentNotificationLevels"
    | "listMcpServers"
    | "listModels"
    | "removeMcpServer"
    | "saveMcpServer"
    | "setMcpServerEnabled"
    | "testMcpServer"
    | "signInMcpServer"
    | "mcpSignInPage"
    | "mcpSignInRelay"
    | "openMcpSignInRelay"
    | "completeMcpSignInRelay"
    | "cancelMcpSignIn"
    | "signOutMcpServer"
    | "listMcpSignIns"
    | "mcpSignInApp"
    | "saveMcpSignInApp"
    | "removeMcpSignInApp"
  >;
  events: CodeBotDesktopApi["events"];
  auth: Pick<CodeBotDesktopApi["auth"], "onEvent">;
  browser: Pick<CodeBotDesktopApi["browser"], "setVisible">;
  hostAdmin: Pick<
    CodeBotDesktopApi["hostAdmin"],
    "cancelUpdate" | "getUpdateStatus" | "restartHost" | "rotateHostKey" | "startUpdate" | "updateIdentity"
  >;
  localServers: CodeBotDesktopApi["localServers"];
  host: Pick<
    CodeBotDesktopApi["host"],
    | "configure"
    | "getRemoteControlPolicy"
    | "getStatus"
    | "onEvent"
    | "recheckScreenRecording"
    | "rotateIdentityKey"
    | "setRemoteControlPolicy"
    | "start"
    | "stop"
    | "stopRemoteControl"
    | "updateIdentity"
  >;
  notifications: Pick<CodeBotDesktopApi["notifications"], "onOpened" | "onWorkflowOpened">;
  remoteDesktop: Pick<
    CodeBotDesktopApi["remoteDesktop"],
    "checkSetup" | "connect" | "disconnect" | "list" | "openSetup" | "test"
  >;
  servers: Pick<
    CodeBotDesktopApi["servers"],
    | "getPresenceFor"
    | "join"
    | "list"
    | "onEvent"
    | "onPresence"
    | "refreshIdentity"
    | "remove"
    | "reorder"
    | "retryConnection"
    | "select"
    | "setHidden"
    | "setMuted"
    | "setNotificationLevel"
  >;
}

export function serversPort(): ServersPort {
  return window.codebot;
}

export type ServerAdminPort = Pick<
  CodeBotDesktopApi["host"],
  "getPresence" | "listMembers" | "listInvites" | "createInvite" | "updateMember" | "removeMember" | "revokeInvite"
>;

export function serverAdminPort(server: Pick<ServerSummary, "id" | "kind">): ServerAdminPort {
  if (server.kind === "local") return window.codebot.host;
  const serverId = server.id;
  return {
    getPresence: () => window.codebot.servers.getPresenceFor(serverId),
    listMembers: () => window.codebot.servers.listMembers(serverId),
    listInvites: () => window.codebot.servers.listInvites(serverId),
    createInvite: (input) => window.codebot.servers.createInvite(input, serverId),
    updateMember: (input) => window.codebot.servers.updateMember(input, serverId),
    removeMember: (memberId) => window.codebot.servers.removeMember(memberId, serverId),
    revokeInvite: (inviteId) => window.codebot.servers.revokeInvite(inviteId, serverId),
  };
}

export async function activeServerId(): Promise<string> {
  if (!window.codebot) return "local";
  return (await window.codebot.servers.list()).find((item) => item.active)?.id ?? "local";
}
