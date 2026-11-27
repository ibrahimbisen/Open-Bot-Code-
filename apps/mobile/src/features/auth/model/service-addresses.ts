import { isMobileConnectDevelopmentHost } from "@codebot/contracts/mobile-connect";
import { isDynamicRecord, isString } from "@codebot/contracts/runtime-values";

export interface ServiceAddresses {
  accountUrl: string | null;
  signalUrl: string | null;
}

export const NO_SERVICE_ADDRESSES: ServiceAddresses = { accountUrl: null, signalUrl: null };

const DEFAULT_SIGNAL_PATH = "/v1/signal";

function parse(value: string): URL | null {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 2_048) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//iu.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(withScheme);
    return url.username === "" && url.password === "" && url.search === "" && url.hash === "" ? url : null;
  } catch {
    return null;
  }
}

export function normalizeAccountAddress(value: string): string | null {
  const url = parse(value);
  if (!url || (url.pathname !== "/" && url.pathname !== "")) return null;
  if (url.protocol === "https:") return url.origin;
  return url.protocol === "http:" && isMobileConnectDevelopmentHost(url.hostname) ? url.origin : null;
}

export function normalizeSignalAddress(value: string): string | null {
  const url = parse(value);
  if (!url) return null;
  const secure = url.protocol === "https:" || url.protocol === "wss:";
  const plain = url.protocol === "http:" || url.protocol === "ws:";
  if (!secure && !(plain && isMobileConnectDevelopmentHost(url.hostname))) return null;
  const path = url.pathname === "/" ? DEFAULT_SIGNAL_PATH : url.pathname.replace(/\/+$/u, "");
  return `${secure ? "wss" : "ws"}://${url.host}${path}`;
}

export function resolveServiceAddresses(
  stored: Partial<ServiceAddresses> | null,
  build: { accountUrl?: string | undefined; signalUrl?: string | undefined },
): ServiceAddresses {
  const account = stored?.accountUrl ?? (build.accountUrl ? normalizeAccountAddress(build.accountUrl) : null);
  const signal = stored?.signalUrl ?? (build.signalUrl ? normalizeSignalAddress(build.signalUrl) : null);
  return { accountUrl: account ?? null, signalUrl: signal ?? null };
}

export function decodeStoredAddresses(raw: string | null): Partial<ServiceAddresses> | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw);
    if (!isDynamicRecord(value)) return null;
    const account = isString(value.accountUrl) ? normalizeAccountAddress(value.accountUrl) : null;
    const signal = isString(value.signalUrl) ? normalizeSignalAddress(value.signalUrl) : null;
    return { accountUrl: account, signalUrl: signal };
  } catch {
    return null;
  }
}

export type FetchFunction = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

export function signalOverrideFetch(base: FetchFunction, signalUrl: () => string | null): FetchFunction {
  return async (input, init) => {
    const response = await base(input, init);
    const override = signalUrl();
    if (!override || !response.ok) return response;
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (!/\/v2\/remote\/sessions\/[^/]+\/ticket\/?(?:\?|$)/u.test(url)) return response;
    try {
      const body = await response.clone().json();
      if (!isDynamicRecord(body) || !("signalUrl" in body)) return response;
      const headers = new Headers(response.headers);
      headers.delete("content-length");
      return new Response(JSON.stringify({ ...body, signalUrl: override }), {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    } catch {
      return response;
    }
  };
}
