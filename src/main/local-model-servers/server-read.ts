import type { CustomProviderHeader } from "@codebot/contracts/ipc";
import { type DynamicRecord, isDynamicRecord, isString } from "@codebot/contracts/runtime-values";
import { Effect, Schema } from "effect";
import { readLimitedBody } from "../../backend/limited-body";

const SERVER_READ_FAILURES = [
  "refused",
  "not-found",
  "timeout",
  "unreachable",
  "redirect",
  "unauthorized",
  "http",
  "invalid",
  "too-large",
] as const;

export class ServerReadFailure extends Schema.TaggedError<ServerReadFailure>()("LocalModelServerReadFailure", {
  reason: Schema.Literals(SERVER_READ_FAILURES),
  status: Schema.optionalKey(Schema.Number),
}) {}

export interface ServerCredentials {
  readonly origin: string;
  readonly apiKey: string | null;
  readonly headers: readonly CustomProviderHeader[];
}

export interface ServerReadRequest {
  readonly url: URL;
  readonly credentials: ServerCredentials | null;
  readonly timeoutMs: number;
  readonly bodyLimit: number;
  readonly accept?: string;
}

export interface ServerAnswer {
  readonly body: string;
  readonly contentType: string | null;
  readonly ms: number;
}

export function serverCredentials(
  baseUrl: string,
  apiKey: string | null,
  headers: readonly CustomProviderHeader[],
): ServerCredentials | null {
  if (!apiKey && headers.length === 0) return null;
  try {
    return { origin: new URL(baseUrl).origin, apiKey, headers };
  } catch {
    return null;
  }
}

export function requestHeaders(url: URL, credentials: ServerCredentials | null, accept: string): Headers {
  const headers = new Headers({ Accept: accept });
  if (!credentials || credentials.origin !== url.origin) return headers;
  for (const header of credentials.headers) headers.set(header.name, header.value);
  if (credentials.apiKey) headers.set("Authorization", `Bearer ${credentials.apiKey}`);
  return headers;
}

function errorCode(error: unknown): string {
  if (!isDynamicRecord(error)) return "";
  const own = isString(error.code) ? error.code : "";
  const cause = isDynamicRecord(error.cause) && isString(error.cause.code) ? error.cause.code : "";
  return `${own} ${cause}`;
}

function connectFailure(error: unknown): ServerReadFailure {
  const code = errorCode(error);
  if (/REFUSED/iu.test(code)) return new ServerReadFailure({ reason: "refused" });
  if (/NOTFOUND|EAI_AGAIN|DNS/iu.test(code)) return new ServerReadFailure({ reason: "not-found" });
  if (/TIMEDOUT|TIMEOUT/iu.test(code)) return new ServerReadFailure({ reason: "timeout" });
  return new ServerReadFailure({ reason: "unreachable" });
}

export const readServer = Effect.fn("LocalModelServers.read")(function* (
  request: ServerReadRequest,
): Effect.fn.Return<ServerAnswer, ServerReadFailure> {
  const headers = requestHeaders(request.url, request.credentials, request.accept ?? "application/json");
  return yield* Effect.acquireUseRelease(
    Effect.sync(() => new AbortController()),
    (controller) =>
      Effect.gen(function* () {
        const startedAt = performance.now();
        const response = yield* Effect.tryPromise({
          try: () => fetch(request.url, { method: "GET", headers, redirect: "manual", signal: controller.signal }),
          catch: connectFailure,
        });
        if (response.status >= 300 && response.status < 400)
          return yield* new ServerReadFailure({ reason: "redirect" });
        if (response.status === 401 || response.status === 403)
          return yield* new ServerReadFailure({ reason: "unauthorized", status: response.status });
        if (!response.ok) return yield* new ServerReadFailure({ reason: "http", status: response.status });
        const body = yield* readLimitedBody(
          response,
          request.bodyLimit,
          (reason) => new ServerReadFailure({ reason: reason === "too-large" ? "too-large" : "unreachable" }),
        );
        return {
          body: body.toString("utf8"),
          contentType: response.headers.get("content-type"),
          ms: Math.max(0, Math.round(performance.now() - startedAt)),
        };
      }).pipe(
        Effect.timeoutOrElse({
          duration: request.timeoutMs,
          orElse: () => Effect.fail(new ServerReadFailure({ reason: "timeout" })),
        }),
      ),
    (controller) => Effect.sync(() => controller.abort()),
  );
});

export function parseJsonRecord(body: string): DynamicRecord | null {
  try {
    const parsed = JSON.parse(body);
    return isDynamicRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
