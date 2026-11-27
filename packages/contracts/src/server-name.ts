import { INPUT_LIMITS } from "./input-limits";
import { slugifyTeamServerName } from "./validation";

/** Returns the trimmed server name when it is valid, else null. */
export function parseServerName(value: string): string | null {
  const name = value.trim();
  if (name.length < INPUT_LIMITS.serverNameMin || name.length > INPUT_LIMITS.serverName || /\p{Cc}/u.test(name)) {
    return null;
  }
  return slugifyTeamServerName(name).length >= INPUT_LIMITS.serverNameMin ? name : null;
}
