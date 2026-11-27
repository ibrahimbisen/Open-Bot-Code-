import { jsonPayloadCodecs } from "./json-payload-codec";

export const SLASH_COMMANDS_CAPABILITY = "slash-commands-v1";

export const SLASH_COMMANDS_ROUTES = {
  list: "/v1/slash-commands/list",
  listSessions: "/v1/slash-commands/sessions",
  resumeSession: "/v1/slash-commands/resume",
} as const;

export type SlashCommandsOperation = keyof typeof SLASH_COMMANDS_ROUTES;

export const SLASH_COMMANDS_CODECS = jsonPayloadCodecs(SLASH_COMMANDS_ROUTES);
