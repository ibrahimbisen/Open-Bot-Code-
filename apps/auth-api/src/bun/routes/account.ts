import { Effect } from "effect";
import { runApiResponse } from "../../server/effect-runtime";
import { bearerToken, json, unauthorized } from "../http/responses";
import type { Router } from "../http/router";
import type { AccountServices } from "../services";

export function registerAccountRoutes(router: Router, services: AccountServices): void {
  const { auth, respondToError } = services;

  router.get("/v1/me", ({ request }) =>
    runApiResponse(
      Effect.gen(function* () {
        const token = bearerToken(request);
        if (!token) return unauthorized();
        const user = yield* auth.authenticate(token);
        return user ? json(user) : unauthorized("The session is invalid.");
      }),
      respondToError,
    ),
  );
}
