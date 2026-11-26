import { parseHostedServerName } from "@codebot/contracts/hosted-servers";

export const FALLBACK_SERVER_NAME = "CodeBot";

export function hostedServerDefaultName(translated: string): string {
  return (
    parseHostedServerName(translated) ??
    parseHostedServerName(`${FALLBACK_SERVER_NAME} ${translated}`) ??
    FALLBACK_SERVER_NAME
  );
}
