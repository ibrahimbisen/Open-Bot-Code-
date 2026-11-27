import { parseServerName } from "@codebot/contracts/server-name";

export const FALLBACK_SERVER_NAME = "CodeBot";

export function hostedServerDefaultName(translated: string): string {
  return (
    parseServerName(translated) ?? parseServerName(`${FALLBACK_SERVER_NAME} ${translated}`) ?? FALLBACK_SERVER_NAME
  );
}
