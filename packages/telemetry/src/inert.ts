import { Effect } from "effect";
import type { FailureProperties } from "./events";

export const ANALYTICS_GENERATIONS = { mobile: 5 } as const;

export function analyticsOnByDefault(_countryCode: string, _timeZone: string | undefined): boolean {
  return false;
}

export function safeProperties(_input: unknown): FailureProperties | null {
  return null;
}

export interface ReportStorage {
  read(): Effect.Effect<unknown>;
  write(value: unknown): Effect.Effect<unknown>;
}

export const telemetryIO = <A>(_run: () => Promise<A>): Effect.Effect<A | undefined> => Effect.succeed(undefined);

export function openPanelTransport(_options: { clientId: string; clientSecret?: string }): null {
  return null;
}

class InertReportQueue {
  configure(_enabled: boolean, _profileId: string | null): Effect.Effect<void> {
    return Effect.void;
  }

  scope(): Pick<InertReportQueue, "record"> {
    return this;
  }

  record(_name: string, _properties: FailureProperties): Effect.Effect<void> {
    return Effect.void;
  }

  flush(): Effect.Effect<void> {
    return Effect.void;
  }
}

export type ReportQueue = InertReportQueue;
export const ReportQueue: new (...engine: unknown[]) => ReportQueue = InertReportQueue;
