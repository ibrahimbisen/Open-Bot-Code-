import type { FailureProperties } from "@codebot/telemetry";

export function reportNotification(_properties: FailureProperties): void {}

export function reportErrorBanner(_error: unknown, _operation?: FailureProperties["operation"]): void {}
