import { readFile } from "node:fs/promises";
import { MANAGED_RUNTIME_PROVIDERS, type ManagedProviderId } from "@codebot/contracts/ipc";
import { isDynamicRecord, isString } from "@codebot/contracts/runtime-values";
import { sourceText } from "@codebot/i18n/source";
import { createCodeBotLogger } from "@codebot/logging";
import { Effect, Result } from "effect";
import { ProviderRuntimeFailure, runtimeIO, runtimeSync } from "../provider-runtime-effects";

const logger = createCodeBotLogger("provider-runtimes");
const REQUEST_TIMEOUT_MS = 30_000;
const MAX_LIST_BYTES = 262_144;

type Fetch = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

export type BlockedVersions = ReadonlyMap<ManagedProviderId, ReadonlySet<string>>;

export interface ProviderBlocklistOptions {
  bundledPath: string | null;
  remoteUrl: () => string | null;
}

const NOTHING_BLOCKED: BlockedVersions = new Map();

function parseBlockedVersions(value: unknown): BlockedVersions | null {
  if (!isDynamicRecord(value) || value.schemaVersion !== 1 || !isDynamicRecord(value.blocked)) return null;
  const blocked = new Map<ManagedProviderId, ReadonlySet<string>>();
  for (const provider of MANAGED_RUNTIME_PROVIDERS) {
    const versions = value.blocked[provider];
    if (Array.isArray(versions)) blocked.set(provider, new Set(versions.filter(isString)));
  }
  return blocked;
}

function mergeBlockedVersions(first: BlockedVersions, second: BlockedVersions): BlockedVersions {
  const merged = new Map<ManagedProviderId, ReadonlySet<string>>();
  for (const provider of MANAGED_RUNTIME_PROVIDERS) {
    const versions = new Set([...(first.get(provider) ?? []), ...(second.get(provider) ?? [])]);
    if (versions.size > 0) merged.set(provider, versions);
  }
  return merged;
}

const parseList = Effect.fn("ProviderBlocklist.parse")(function* (text: string) {
  const blocked = parseBlockedVersions(yield* runtimeSync((): unknown => JSON.parse(text)));
  if (blocked === null) {
    return yield* new ProviderRuntimeFailure({ cause: new Error(sourceText("error.provider.blockedListShape")) });
  }
  return blocked;
});

const readRemoteList = Effect.fn("ProviderBlocklist.readRemote")(function* (fetch: Fetch, url: string) {
  const response = yield* runtimeIO((signal) =>
    fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "CodeBot-runtime-installer" },
      cache: "no-store",
      redirect: "follow",
      signal: AbortSignal.any([signal, AbortSignal.timeout(REQUEST_TIMEOUT_MS)]),
    }),
  );
  if (!response.ok) {
    yield* runtimeIO(async () => {
      await response.body?.cancel();
    }).pipe(Effect.catch(() => Effect.void));
    if (response.status === 404 || response.status === 410) return null;
    return yield* new ProviderRuntimeFailure({
      cause: new Error(sourceText("error.provider.releaseCheckHttp", { status: response.status })),
    });
  }
  const text = yield* runtimeIO(() => response.text());
  if (text.length > MAX_LIST_BYTES) {
    return yield* new ProviderRuntimeFailure({
      cause: new Error(sourceText("error.provider.releaseMetadataTooLarge")),
    });
  }
  return yield* parseList(text);
});

export class ProviderBlocklist {
  readonly #options: ProviderBlocklistOptions;
  #bundled: BlockedVersions | null = null;
  #remote: BlockedVersions = NOTHING_BLOCKED;
  #remoteSource: string | null = null;

  constructor(options: ProviderBlocklistOptions) {
    this.#options = options;
  }

  readonly bundled = Effect.fn("ProviderBlocklist.bundled")(function* (this: ProviderBlocklist) {
    if (this.#bundled !== null) return this.#bundled;
    const path = this.#options.bundledPath;
    if (path === null) return NOTHING_BLOCKED;
    const list = yield* Effect.result(runtimeIO(() => readFile(path, "utf8")).pipe(Effect.flatMap(parseList)));
    if (Result.isFailure(list)) {
      logger.warn("The list of blocked provider CLI versions in the application could not be read.");
      return NOTHING_BLOCKED;
    }
    this.#bundled = list.success;
    return list.success;
  }).bind(this);

  readonly read = Effect.fn("ProviderBlocklist.read")(function* (this: ProviderBlocklist, fetch: Fetch) {
    const bundled = yield* this.bundled();
    const url = this.#options.remoteUrl();
    if (url !== this.#remoteSource) {
      this.#remote = NOTHING_BLOCKED;
      this.#remoteSource = url;
    }
    if (url === null) return bundled;
    const remote = yield* Effect.result(readRemoteList(fetch, url));
    if (Result.isSuccess(remote)) this.#remote = remote.success ?? NOTHING_BLOCKED;
    else logger.warn("The list of blocked provider CLI versions on the update server could not be read.");
    return mergeBlockedVersions(bundled, this.#remote);
  }).bind(this);
}
