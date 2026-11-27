import type {
  LocalModelServerRefreshInput,
  LocalModelServerScanInput,
  LocalModelServerSettings,
  LocalModelServerTestInput,
  LocalModelServerWatchInput,
  SaveLocalModelServerSettingsInput,
} from "@codebot/contracts/ipc";
import {
  isCustomProviderId,
  isGpuStatusUrl,
  LOCAL_MODEL_SERVER_LIMITS,
  LOCAL_MODEL_SERVER_WATCH_MODES,
  sameCustomProviderOrigin,
} from "@codebot/contracts/ipc";
import { isBoolean, isOneOf, isString } from "@codebot/contracts/runtime-values";
import { sourceText } from "@codebot/i18n/source";
import { parseApiKey, parseBaseUrl } from "./custom-provider-inputs";
import { isObject, requireString } from "./validation";

function parseGpuStatusUrl(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (!isString(value)) throw new Error(sourceText("error.localServer.gpuUrlInvalid"));
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!isGpuStatusUrl(trimmed)) throw new Error(sourceText("error.localServer.gpuUrlInvalid"));
  return trimmed;
}

function parseSavedId(value: unknown): string {
  if (!isCustomProviderId(value)) throw new Error(sourceText("error.provider.idInvalid"));
  return value;
}

export function parseLocalModelServerSettings(input: unknown): LocalModelServerSettings {
  if (!isObject(input)) throw new Error("Invalid local server settings.");
  const gpuStatusUrl = parseGpuStatusUrl(input.gpuStatusUrl);
  if (input.monitored !== undefined && !isBoolean(input.monitored)) throw new Error("Invalid local server settings.");
  if (input.gpuStatusUsesKey !== undefined && !isBoolean(input.gpuStatusUsesKey))
    throw new Error("Invalid local server settings.");
  return {
    ...(input.monitored === undefined ? {} : { monitored: input.monitored }),
    ...(gpuStatusUrl ? { gpuStatusUrl } : {}),
    ...(gpuStatusUrl && input.gpuStatusUsesKey ? { gpuStatusUsesKey: true } : {}),
  };
}

export function parseSaveLocalModelServerSettings(input: unknown): SaveLocalModelServerSettingsInput {
  if (!isObject(input)) throw new Error("Invalid local server settings.");
  return { id: parseSavedId(input.id), settings: parseLocalModelServerSettings(input.settings) };
}

export function parseLocalModelServerTest(input: unknown): LocalModelServerTestInput {
  if (!isObject(input)) throw new Error("Invalid local server.");
  const baseUrl = parseBaseUrl(input.baseUrl);
  const gpuStatusUrl = parseGpuStatusUrl(input.gpuStatusUrl);
  const gpuStatusUsesKey = input.gpuStatusUsesKey === true && gpuStatusUrl !== null;
  if (gpuStatusUsesKey && gpuStatusUrl && !sameCustomProviderOrigin(gpuStatusUrl, baseUrl))
    throw new Error(sourceText("error.localServer.gpuKeyOtherOrigin"));
  const savedProviderId = input.savedProviderId;
  if (savedProviderId !== undefined && !isCustomProviderId(savedProviderId))
    throw new Error(sourceText("error.provider.idInvalid"));
  return {
    name: input.name === undefined ? "" : requireString(input.name, "Name", LOCAL_MODEL_SERVER_LIMITS.name).trim(),
    baseUrl,
    apiKey: parseApiKey(input.apiKey),
    gpuStatusUrl,
    gpuStatusUsesKey,
    ...(savedProviderId === undefined ? {} : { savedProviderId }),
  };
}

export function parseLocalModelServerScan(input: unknown): LocalModelServerScanInput {
  if (!isObject(input)) throw new Error("Invalid host.");
  return { host: requireString(input.host, "Host", LOCAL_MODEL_SERVER_LIMITS.host).trim() };
}

export function parseLocalModelServerRefresh(input: unknown): LocalModelServerRefreshInput {
  if (!isObject(input)) throw new Error("Invalid refresh request.");
  return { id: input.id === null ? null : parseSavedId(input.id) };
}

export function parseLocalModelServerWatch(input: unknown): LocalModelServerWatchInput {
  if (!isObject(input) || !isOneOf(LOCAL_MODEL_SERVER_WATCH_MODES, input.mode))
    throw new Error("Invalid watch request.");
  return { watchId: requireString(input.watchId, "Watch id", 80), mode: input.mode };
}
