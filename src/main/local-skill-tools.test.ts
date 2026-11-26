import type { InstalledSkill } from "@codebot/contracts/ipc";
import { redactText, registerSecretValue } from "@codebot/logging";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { keepSkillIdsReadable } from "./local-skill-tools";

const SAVED_PASSWORD = "codebot";
const CURATED_ID = "codebot-curated-skill-daily-brief";
const GITHUB_ID = `github:codebot/skills@${"a".repeat(40)}:skills/codebot-notes`;
const WORKSPACE_ID = "home:codebot-notes";

function installed(skillId: string, origin: NonNullable<InstalledSkill["origin"]>): InstalledSkill {
  return {
    skillId,
    slug: skillId,
    name: skillId,
    installedVersion: 1,
    availableVersion: 1,
    state: "installed",
    enabled: true,
    origin,
  };
}

describe("installed skill ids and a short saved password", () => {
  it("keeps the ids of installed skills readable and masks the password everywhere else", async () => {
    registerSecretValue(SAVED_PASSWORD, { allowShort: true });
    const ids = JSON.stringify([CURATED_ID, GITHUB_ID, WORKSPACE_ID]);
    expect(JSON.parse(redactText(ids))).toEqual(["[redacted]", "github:[redacted]:[redacted]", "home:[redacted]"]);

    await Effect.runPromise(
      keepSkillIdsReadable([
        installed(CURATED_ID, "marketplace"),
        installed(GITHUB_ID, "marketplace"),
        installed(WORKSPACE_ID, "workspace"),
      ]),
    );

    expect(JSON.parse(redactText(ids))).toEqual([CURATED_ID, GITHUB_ID, "home:[redacted]"]);
    expect(redactText(`pw=${SAVED_PASSWORD}; ${SAVED_PASSWORD}-other-word "${SAVED_PASSWORD}"`)).toBe(
      'pw=[redacted]; [redacted] "[redacted]"',
    );
  });
});
