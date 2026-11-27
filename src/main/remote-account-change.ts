import { Effect } from "effect";

export interface RemoteAccountChange {
  readonly activePrincipalId: string | null;
  readonly nextPrincipalId: string | null;
  readonly disconnectRemoteSessions: () => Effect.Effect<void>;
}

export const disconnectRemoteSessionsOnAccountChange = Effect.fn("disconnectRemoteSessionsOnAccountChange")(function* (
  change: RemoteAccountChange,
) {
  if (change.activePrincipalId === null || change.activePrincipalId === change.nextPrincipalId) return false;
  yield* change.disconnectRemoteSessions();
  return true;
});
