import { AGENT_PROVIDERS } from "@codebot/contracts/agent-providers";
import { type DynamicRecord, isDynamicRecord } from "@codebot/contracts/runtime-values";
import { Schema } from "effect";

export const CauseCode = Schema.Literals([
  "invalid_upload_request",
  "authentication",
  "permission",
  "rate_limit",
  "usage_limit",
  "billing",
  "network",
  "timeout",
  "stalled",
  "storage",
  "not_found",
  "conflict",
  "provider_unavailable",
  "context_too_long",
  "model_not_found",
  "invalid_request",
  "content_blocked",
  "turn_limit",
  "empty_answer",
  "provider_internal_error",
  "provider_exited",
  "attachment_type_unsupported",
  "attachment_too_large",
  "attachment_upload_failed",
  "cancelled",
  "unknown",
]);
export type CauseCode = typeof CauseCode.Type;
export const isCauseCode = Schema.is(CauseCode);
export const Operation = Schema.Literals([
  "turn",
  "provider",
  "attachment",
  "routine",
  "auth",
  "update",
  "agent",
  "queue",
  "browser",
  "settings",
  "team",
  "search",
  "marketplace",
  "memory",
  "voice",
  "maintenance",
  "other",
]);
export type Operation = typeof Operation.Type;
export const NotificationMetadata = Schema.Struct({
  operation: Operation,
  source: Schema.Literals(["action", "host", "provider", "upload", "auth", "update", "system"]),
  cause_code: CauseCode,
});
export type NotificationMetadata = typeof NotificationMetadata.Type;
const FailureProperties = Schema.Struct({
  ...NotificationMetadata.fields,
  area: Schema.optional(Schema.Literal("agent")),
  reasoning_effort: Schema.optional(
    Schema.Literals(["none", "minimal", "low", "medium", "high", "xhigh", "max", "ultra"]),
  ),
  severity: Schema.Literals(["error", "warning"]),
  presentation: Schema.optional(Schema.Literals(["toast", "banner", "alert"])),
  failure_code: Schema.optional(Schema.String),
  provider: Schema.optional(Schema.Literals(AGENT_PROVIDERS)),
  model: Schema.optional(Schema.String),
  origin: Schema.optional(Schema.Literals(["user", "routine", "agent", "unknown"])),
});
export type FailureProperties = typeof FailureProperties.Type;

const STRUCTURED_CAUSES: Readonly<Record<string, CauseCode>> = {
  invalid_upload_request: "invalid_upload_request",
  usageLimitExceeded: "usage_limit",
  contextWindowExceeded: "context_too_long",
  context_length_exceeded: "context_too_long",
  invalid_request_error: "invalid_request",
  model_not_found: "model_not_found",
  unauthorized: "authentication",
  authentication_error: "authentication",
  rate_limit_exceeded: "rate_limit",
  rate_limit_error: "rate_limit",
  rateLimitExceeded: "rate_limit",
  serverOverloaded: "provider_unavailable",
  internalServerError: "provider_unavailable",
  flexUnavailable: "provider_unavailable",
  insufficient_quota: "billing",
  ECONNREFUSED: "network",
  ECONNRESET: "network",
  ENOTFOUND: "network",
  ETIMEDOUT: "timeout",
  ENOSPC: "storage",
  EACCES: "permission",
  ENOENT: "not_found",
  EPIPE: "provider_exited",
  ABORT_ERR: "cancelled",
};

export function classifyFailure(error: unknown): CauseCode {
  const record = isDynamicRecord(error) ? error : undefined;
  for (const key of [record?.codexErrorInfo, record?.code]) {
    if (isCauseCode(key)) return key;
    if (typeof key === "string" && Object.hasOwn(STRUCTURED_CAUSES, key)) return STRUCTURED_CAUSES[key] ?? "unknown";
    if (isDynamicRecord(key)) {
      const cause = codexFailureCause(key);
      if (cause) return cause;
    }
  }
  if (isDynamicRecord(record?.error)) {
    const nested = classifyFailure(record.error);
    if (nested !== "unknown") return nested;
  }
  const message = error instanceof Error ? error.message : typeof error === "string" ? error : record?.message;
  if (typeof message !== "string") return "unknown";
  if (/\binvalid upload request\b/iu.test(message)) return "invalid_upload_request";
  if (
    /\b(?:401 unauthorized|invalid[ _]api[ _]key|api key not valid|API_KEY_INVALID|not authenticated|UNAUTHENTICATED|authentication failed|authentication_error|token (?:has )?expired|sign in again|log in again)\b/iu.test(
      message,
    )
  )
    return "authentication";
  if (
    /\b(?:rate[ _-]?limit(?:ed|ing|_error|_exceeded)?|too many requests|RESOURCE_EXHAUSTED|resource has been exhausted)\b/iu.test(
      message,
    )
  )
    return "rate_limit";
  if (
    /\b(?:insufficient[ _](?:funds|balance|quota|credits?)|payment required|payment (?:is )?past due|credits? (?:exhausted|depleted)|out of credits)\b/iu.test(
      message,
    )
  )
    return "billing";
  if (
    /\b(?:usage limit|hit your (?:weekly |session |\d+-hour )?limit|(?:hit|reached) your (?:weekly|session|\d+-hour) (?!(?:spend|rate|context|tokens?|requests?)\b)[\w-]+ limit|hit your (?:[\w']+ ){0,2}spend limit|quota (?:exceeded|reached|exhausted)|free[ _-]usage[ _-]exhausted|key limit exceeded|credits? balance (?:is )?too low)\b/iu.test(
      message,
    )
  )
    return "usage_limit";
  if (/\b(?:timed? out|ETIMEDOUT|gateway time-?out|deadline exceeded|DEADLINE_EXCEEDED)\b/iu.test(message))
    return "timeout";
  if (
    /\b(?:fetch failed|failed to fetch|network request failed|connection error|socket hang up|stream disconnected|error sending request|(?:unable to|failed to|could not|cannot) connect(?!\s+to\s+(?:the\s+)?MCP\b)|ECONNRESET|ECONNREFUSED|ECONNABORTED|ENOTFOUND|EAI_AGAIN)\b/iu.test(
      message,
    )
  )
    return "network";
  if (/\b(?:ENOSPC|SQLITE_FULL|disk full)\b/iu.test(message)) return "storage";
  if (/\b(?:EACCES|permission denied|403 forbidden)\b/iu.test(message)) return "permission";
  if (
    /\b(?:service unavailable|bad gateway|internal server error|overloaded(?:_error)?|server_error|api_error|server had an error|high demand|temporarily unavailable|upstream connect error)\b/iu.test(
      message,
    ) ||
    /\bUNAVAILABLE\b/u.test(message) ||
    /\b(?:API Error|status(?: code)?|HTTP(?:\/[\d.]+)?)\W{0,4}5\d\d\b/iu.test(message)
  )
    return "provider_unavailable";
  if (
    /\b(?:context[ _-]?(?:length|window)[ _-]?exceeded|context[ _-]overflow|exceeds the context window|maximum context length|prompt is too long|too many (?:input )?tokens(?![^.]{0,40}\b(?:wait|per (?:minute|second|day)))|input token count\b.{0,80}\bexceeds)\b/iu.test(
      message,
    )
  )
    return "context_too_long";
  if (/\b(?:content[ _-]?filter(?:ed)?|requires moderation|was flagged|safety (?:filter|block))\b/iu.test(message))
    return "content_blocked";
  if (
    /\b(?:model[ _]not[ _]found|unknown model|no such model|not a valid model|no endpoints found|model\b(?![.:]\S)(?:[^.,;:\n]|[.:](?=\S)){0,60}\b(?:not found|does not exist|is not supported))\b/iu.test(
      message,
    ) ||
    /\bmodels\/\S+ is not found\b|\bmodel\b(?:\s+\S+)?\s+(?:(?:was|is|has been) retired|is no longer (?:available|supported))\b/iu.test(
      message,
    )
  )
    return "model_not_found";
  if (/\b(?:empty response|no visible content|reasoning_only)\b/iu.test(message)) return "empty_answer";
  if (/\b(?:turn|request|operation) (?:was )?cancell?ed\b/iu.test(message)) return "cancelled";
  const status = /\b(?:API Error|status(?: code)?|HTTP(?:\/[\d.]+)?)\W{0,4}([1-4]\d\d)\b/iu.exec(message)?.[1];
  const statusCause = status === undefined ? null : httpStatusCause(Number(status));
  if (statusCause) return statusCause;
  if (/\b(?:invalid[ _]request(?:_error)?|bad request|INVALID_ARGUMENT)\b/iu.test(message)) return "invalid_request";
  return "unknown";
}

export function httpStatusCause(status: number): CauseCode | null {
  if (status === 0) return "network";
  if (status === 400 || status === 422) return "invalid_request";
  if (status === 401) return "authentication";
  if (status === 402) return "billing";
  if (status === 403) return "permission";
  if (status === 404) return "not_found";
  if (status === 408 || status === 504) return "timeout";
  if (status === 409) return "conflict";
  if (status === 410) return "model_not_found";
  if (status === 413) return "context_too_long";
  if (status === 429) return "rate_limit";
  return status >= 500 && status <= 599 ? "provider_unavailable" : null;
}

const REFUSAL_CAUSES: ReadonlySet<CauseCode> = new Set(["invalid_request", "permission", "not_found"]);

export function structuredCause(structured: CauseCode | null, text: CauseCode): CauseCode {
  if (!structured || (text !== "unknown" && REFUSAL_CAUSES.has(structured))) return text;
  return structured;
}

function codexFailureCause(info: DynamicRecord): CauseCode | null {
  const failure = [
    "httpConnectionFailed",
    "responseStreamConnectionFailed",
    "responseStreamDisconnected",
    "responseTooManyFailedAttempts",
  ]
    .map((key) => info[key])
    .find(isDynamicRecord);
  if (!failure) return null;
  const status = failure.httpStatusCode;
  if (typeof status !== "number") return "network";
  if (status === 429) return "rate_limit";
  if (status === 401) return "authentication";
  if (status === 408) return "timeout";
  return status >= 500 ? "provider_unavailable" : null;
}
