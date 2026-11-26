import { apiError, json } from "../http/responses";
import type { Router } from "../http/router";
import type { AccountServices } from "../services";

const SERVICE_NAME = "codebot-auth-api";

export function registerHealthRoutes(router: Router, services: AccountServices): void {
  router.get("/health/live", () => json({ service: SERVICE_NAME, status: "ok" }));
  router.get("/health/ready", async () => {
    try {
      await services.database.prepare("SELECT 1 AS ready").first();
      return json({ service: SERVICE_NAME, status: "ready" });
    } catch {
      return apiError(503, "service_not_ready", "The account service is not ready.");
    }
  });
  router.get("/.well-known/jwks.json", () =>
    Response.json(services.remote.publicJwks(), {
      headers: { "Cache-Control": "public, max-age=300", "X-Content-Type-Options": "nosniff" },
    }),
  );
}
