import { remoteHostFingerprint } from "@codebot/team-client";

export function accountScope(apiUrl: string, userId: string): string {
  return remoteHostFingerprint(JSON.stringify([new URL(apiUrl).origin, userId]));
}
