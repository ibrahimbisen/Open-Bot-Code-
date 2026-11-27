import { isDynamicRecord, isString } from "@codebot/contracts/runtime-values";
import { AuthServiceError } from "../../server/auth-service";
import { JsonBodyError } from "../../server/json-body";
import { RemoteControlPlaneError } from "../../server/remote-control-plane";
import type { Logger } from "../logging";
import { AccountAccessError } from "../login/account-guard";

const SAFE_HEADERS = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
} as const;

export function json(value: unknown, status = 200): Response {
  return Response.json(value, { status, headers: SAFE_HEADERS });
}

export function apiError(status: number, code: string, message: string): Response {
  return json({ error: { code, message } }, status);
}

export function bearerToken(request: Request): string | null {
  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return null;
  const token = authorization.slice("Bearer ".length);
  return token && token.length <= 512 ? token : null;
}

export type ErrorResponder = (error: unknown) => Response;

export function createErrorResponder(logger: Logger): ErrorResponder {
  return (error) => {
    if (error instanceof JsonBodyError) return apiError(error.status, error.code, error.message);
    if (error instanceof RemoteControlPlaneError) return apiError(error.status, error.code, error.message);
    if (error instanceof AuthServiceError) {
      const response = apiError(error.status, error.code, error.message);
      if (error.retryAfterSeconds !== undefined) response.headers.set("Retry-After", String(error.retryAfterSeconds));
      return response;
    }
    if (error instanceof ApiResponseError) return error.response();
    if (error instanceof AccountAccessError) {
      return new ApiResponseError(error.status, error.code, error.message, error.retryAfterSeconds).response();
    }
    const reference = `account/${crypto.randomUUID().replaceAll("-", "").slice(0, 16)}`;
    logger.error("A request failed.", { reference, error: errorType(error) });
    return json(
      { error: { code: "internal_error", message: "The account service could not complete the request.", reference } },
      500,
    );
  };
}

class ApiResponseError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = "ApiResponseError";
  }

  response(): Response {
    const response = apiError(this.status, this.code, this.message);
    if (this.retryAfterSeconds !== undefined) response.headers.set("Retry-After", String(this.retryAfterSeconds));
    return response;
  }
}

function errorType(error: unknown): string {
  if (isDynamicRecord(error) && isString(error._tag)) return error._tag;
  return error instanceof Error ? error.name : typeof error;
}
