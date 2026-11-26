import { readTeamHostCompatibility, TEAM_WEB_CLIENT_PROTOCOL } from "@codebot/contracts/team-protocol/current";

export function readWebHostCompatibility(read: () => Promise<unknown>) {
  return readTeamHostCompatibility(read, TEAM_WEB_CLIENT_PROTOCOL);
}
