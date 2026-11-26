import { isString } from "@codebot/contracts/runtime-values";
import { Effect, Result } from "effect";
import { runApiEffect, runApiResponse } from "../../server/effect-runtime";
import { readJsonObject, readRequestBytes } from "../../server/json-body";
import type { MobileAuthDeviceIdentity } from "../../server/types";
import { apiError, json } from "../http/responses";
import type { Router } from "../http/router";
import { CALLBACK_PATH, DEVICE_PATH, LoginError, type LoginService } from "../login/login-service";
import { deviceApprovalPage, deviceCodePage, deviceDecisionPage, htmlResponse, loginFailedPage } from "../login/pages";
import type { AccountServices } from "../services";

const FORM_BODY_LIMIT = 4 * 1024;

function mobileDevice(body: {
  readonly deviceId?: unknown;
  readonly deviceName?: unknown;
  readonly platform?: unknown;
}): MobileAuthDeviceIdentity | null | "invalid" {
  const { deviceId, deviceName, platform } = body;
  if (deviceId === undefined && deviceName === undefined && platform === undefined) return null;
  if (!isString(deviceId) || !isString(deviceName)) return "invalid";
  if (platform !== "ios" && platform !== "android" && platform !== "unknown") return "invalid";
  return { id: deviceId, name: deviceName, platform };
}

const readForm = Effect.fn("LoginRoutes.readForm")(function* (request: Request) {
  const contentType = request.headers.get("Content-Type") ?? "";
  if (!contentType.toLowerCase().startsWith("application/x-www-form-urlencoded")) return new URLSearchParams();
  const bytes = yield* readRequestBytes(request, FORM_BODY_LIMIT);
  return new URLSearchParams(new TextDecoder().decode(bytes));
});

export function registerLoginRoutes(router: Router, services: AccountServices, login: LoginService): void {
  const failure = (error: unknown): Response => {
    if (error instanceof LoginError) {
      const response = apiError(error.status, error.code, error.message);
      if (error.retryAfterSeconds !== undefined) response.headers.set("Retry-After", String(error.retryAfterSeconds));
      return response;
    }
    return services.respondToError(error);
  };
  const providerOrigins = async (): Promise<string[]> => {
    const origin = await runApiEffect(login.providerOrigin());
    return origin ? [origin] : [];
  };

  router.get("/v1/auth/config", () => json({ login: { kind: "oidc", providerName: login.providerName } }));

  router.post("/v1/auth/oidc/start", ({ request, sourceIp }) =>
    runApiResponse(
      Effect.gen(function* () {
        const body = yield* readJsonObject(request);
        if (!isString(body.redirectUri) || !isString(body.codeChallenge) || !isString(body.state)) {
          return apiError(400, "invalid_login_request", "The sign-in request is not valid.");
        }
        return json(
          yield* login.start({
            redirectUri: body.redirectUri,
            codeChallenge: body.codeChallenge,
            state: body.state,
            sourceIp,
          }),
        );
      }),
      failure,
    ),
  );

  router.get(CALLBACK_PATH, ({ url }) =>
    runApiResponse(
      Effect.gen(function* () {
        const result = yield* login.finish(url.searchParams);
        if (result.kind === "redirect") {
          return new Response(null, {
            status: 302,
            headers: { Location: result.location, "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" },
          });
        }
        if (result.kind === "approval") return htmlResponse(deviceApprovalPage(result), 200);
        return htmlResponse(loginFailedPage({ providerName: login.providerName, code: result.code }), 400);
      }),
      failure,
    ),
  );

  router.post("/v1/auth/oidc/exchange", ({ request, sourceIp }) =>
    runApiResponse(
      Effect.gen(function* () {
        const body = yield* readJsonObject(request);
        if (!isString(body.code) || !isString(body.codeVerifier)) {
          return apiError(400, "invalid_login_code", "The sign-in did not finish. Start again.");
        }
        const device = mobileDevice(body);
        if (device === "invalid") return apiError(400, "invalid_mobile_device", "The mobile device is not valid.");
        return json(
          yield* login.exchange({
            code: body.code,
            codeVerifier: body.codeVerifier,
            sourceIp,
            ...(device ? { device } : {}),
          }),
        );
      }),
      failure,
    ),
  );

  router.post("/v1/auth/device/start", ({ request, sourceIp }) =>
    runApiResponse(
      Effect.gen(function* () {
        const hasBody = request.body !== null && request.headers.get("Content-Length") !== "0";
        const body = hasBody ? yield* readJsonObject(request) : {};
        const deviceName = "deviceName" in body ? body.deviceName : undefined;
        if (deviceName !== undefined && !isString(deviceName)) {
          return apiError(400, "invalid_login_request", "The device name is not valid.");
        }
        return json(yield* login.deviceStart({ deviceName: deviceName ?? null, sourceIp }));
      }),
      failure,
    ),
  );

  router.post("/v1/auth/device/poll", ({ request, sourceIp }) =>
    runApiResponse(
      Effect.gen(function* () {
        const body = yield* readJsonObject(request);
        if (!isString(body.deviceCode)) {
          return apiError(400, "device_login_invalid", "This device sign-in is not valid. Start again.");
        }
        return json(yield* login.devicePoll({ deviceCode: body.deviceCode, sourceIp }));
      }),
      failure,
    ),
  );

  router.get(DEVICE_PATH, async ({ url }) =>
    htmlResponse(
      deviceCodePage({
        providerName: login.providerName,
        code: (url.searchParams.get("code") ?? "").slice(0, 12),
        problem: null,
      }),
      200,
      await providerOrigins(),
    ),
  );

  router.post(DEVICE_PATH, ({ request, sourceIp }) =>
    runApiResponse(
      Effect.gen(function* () {
        const form = yield* readForm(request);
        const code = (form.get("code") ?? "").slice(0, 12);
        const begun = yield* Effect.result(login.deviceBegin({ userCode: code, sourceIp }));
        if (Result.isSuccess(begun)) {
          return new Response(null, {
            status: 303,
            headers: {
              Location: begun.success.authorizationUrl,
              "Cache-Control": "no-store",
              "Referrer-Policy": "no-referrer",
            },
          });
        }
        const error = begun.failure;
        if (!(error instanceof LoginError)) return yield* error;
        if (error.code === "provider_unreachable") {
          return htmlResponse(loginFailedPage({ providerName: login.providerName, code: error.code }), 502);
        }
        const origins = yield* Effect.promise(providerOrigins);
        return htmlResponse(
          deviceCodePage({
            providerName: login.providerName,
            code,
            problem: error.code === "rate_limited" ? "rate_limited" : "invalid",
          }),
          error.code === "rate_limited" ? 429 : 400,
          origins,
        );
      }),
      failure,
    ),
  );

  router.post("/device/decision", ({ request }) =>
    runApiResponse(
      Effect.gen(function* () {
        const form = yield* readForm(request);
        const decided = yield* Effect.result(
          login.deviceDecide({ approval: form.get("approval") ?? "", approve: form.get("decision") === "allow" }),
        );
        if (Result.isSuccess(decided)) return htmlResponse(deviceDecisionPage(decided.success), 200);
        const error = decided.failure;
        if (!(error instanceof LoginError)) return yield* error;
        return htmlResponse(loginFailedPage({ providerName: login.providerName, code: error.code }), 400);
      }),
      failure,
    ),
  );
}
