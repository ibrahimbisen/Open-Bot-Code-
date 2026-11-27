import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { disconnectRemoteSessionsOnAccountChange } from "./remote-account-change";

function run(activePrincipalId: string | null, nextPrincipalId: string | null) {
  let disconnects = 0;
  const disconnected = Effect.runSync(
    disconnectRemoteSessionsOnAccountChange({
      activePrincipalId,
      nextPrincipalId,
      disconnectRemoteSessions: () =>
        Effect.sync(() => {
          disconnects += 1;
        }),
    }),
  );
  return { disconnected, disconnects };
}

describe("disconnectRemoteSessionsOnAccountChange", () => {
  it("disconnects joined servers when the user signs out", () => {
    expect(run("user-1", null)).toEqual({ disconnected: true, disconnects: 1 });
  });

  it("disconnects joined servers when another user signs in", () => {
    expect(run("user-1", "user-2")).toEqual({ disconnected: true, disconnects: 1 });
  });

  it("keeps joined servers when the same user stays signed in", () => {
    expect(run("user-1", "user-1")).toEqual({ disconnected: false, disconnects: 0 });
  });

  it("keeps a local profile with joined servers that need no account", () => {
    expect(run(null, null)).toEqual({ disconnected: false, disconnects: 0 });
    expect(run(null, "user-1")).toEqual({ disconnected: false, disconnects: 0 });
  });
});
