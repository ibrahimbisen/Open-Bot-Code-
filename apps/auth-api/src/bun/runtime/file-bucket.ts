import { createHash, randomUUID } from "node:crypto";
import { mkdir, readdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { isDynamicRecord, isNumber, isString } from "@codebot/contracts/runtime-values";

type BucketValue = ReadableStream | ArrayBuffer | ArrayBufferView | string | null | Blob;

interface StoredMetadata {
  key: string;
  size: number;
  etag: string;
  uploaded: number;
  version: string;
  httpMetadata: R2HTTPMetadata;
  customMetadata: Record<string, string>;
}

const METADATA_SUFFIX = ".json";
const TEMPORARY_PREFIX = "tmp-";
const LIST_LIMIT = 1_000;

function objectName(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

function httpMetadataFrom(value: R2HTTPMetadata | Headers | undefined): R2HTTPMetadata {
  if (!value) return {};
  if (!(value instanceof Headers)) {
    const { cacheExpiry: _cacheExpiry, ...text } = value;
    return text;
  }
  const metadata: R2HTTPMetadata = {};
  const contentType = value.get("Content-Type");
  const contentLanguage = value.get("Content-Language");
  const contentDisposition = value.get("Content-Disposition");
  const contentEncoding = value.get("Content-Encoding");
  const cacheControl = value.get("Cache-Control");
  if (contentType) metadata.contentType = contentType;
  if (contentLanguage) metadata.contentLanguage = contentLanguage;
  if (contentDisposition) metadata.contentDisposition = contentDisposition;
  if (contentEncoding) metadata.contentEncoding = contentEncoding;
  if (cacheControl) metadata.cacheControl = cacheControl;
  return metadata;
}

function textRecord(value: unknown): Record<string, string> {
  const record: Record<string, string> = {};
  if (!isDynamicRecord(value)) return record;
  for (const [name, entry] of Object.entries(value)) if (isString(entry)) record[name] = entry;
  return record;
}

function parseMetadata(text: string): StoredMetadata | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  if (!isDynamicRecord(parsed)) return null;
  const { key, size, etag, uploaded, version } = parsed;
  if (!isString(key) || !isNumber(size) || !isString(etag) || !isNumber(uploaded) || !isString(version)) return null;
  return {
    key,
    size,
    etag,
    uploaded,
    version,
    httpMetadata: textRecord(parsed.httpMetadata),
    customMetadata: textRecord(parsed.customMetadata),
  };
}

async function bytesOf(value: BucketValue): Promise<Uint8Array> {
  if (value === null) return new Uint8Array();
  if (typeof value === "string") return new TextEncoder().encode(value);
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  if (value instanceof Blob) return new Uint8Array(await value.arrayBuffer());
  return new Uint8Array(await new Response(value).arrayBuffer());
}

function checksums(etag: string): R2Checksums {
  const md5 = Uint8Array.from(Buffer.from(etag, "hex")).buffer;
  return { md5, toJSON: () => ({ md5: etag }) };
}

function storedObject(metadata: StoredMetadata) {
  return {
    key: metadata.key,
    version: metadata.version,
    size: metadata.size,
    etag: metadata.etag,
    httpEtag: `"${metadata.etag}"`,
    checksums: checksums(metadata.etag),
    uploaded: new Date(metadata.uploaded),
    httpMetadata: metadata.httpMetadata,
    customMetadata: metadata.customMetadata,
    storageClass: "Standard",
    writeHttpMetadata(headers: Headers) {
      const { contentType, contentLanguage, contentDisposition, contentEncoding, cacheControl } = metadata.httpMetadata;
      if (contentType) headers.set("Content-Type", contentType);
      if (contentLanguage) headers.set("Content-Language", contentLanguage);
      if (contentDisposition) headers.set("Content-Disposition", contentDisposition);
      if (contentEncoding) headers.set("Content-Encoding", contentEncoding);
      if (cacheControl) headers.set("Cache-Control", cacheControl);
    },
  };
}

function storedObjectBody(metadata: StoredMetadata, bytes: Uint8Array<ArrayBuffer>): R2ObjectBody {
  let used = false;
  const take = (): Uint8Array<ArrayBuffer> => {
    if (used) throw new TypeError("The body of this object was already read.");
    used = true;
    return bytes;
  };
  return {
    ...storedObject(metadata),
    get body() {
      return new Blob([take()]).stream();
    },
    get bodyUsed() {
      return used;
    },
    arrayBuffer: async () => take().buffer,
    bytes: async () => take(),
    text: async () => new TextDecoder().decode(take()),
    json: async () => JSON.parse(new TextDecoder().decode(take())),
    blob: async () => new Blob([take()], { type: metadata.httpMetadata.contentType ?? "" }),
  };
}

export class FileBucket implements R2Bucket {
  readonly #directory: string;

  constructor(directory: string) {
    this.#directory = directory;
  }

  async head(key: string): Promise<R2Object | null> {
    const metadata = await this.#metadata(key);
    return metadata ? storedObject(metadata) : null;
  }

  async get(key: string): Promise<R2ObjectBody | null> {
    const metadata = await this.#metadata(key);
    if (!metadata) return null;
    const bytes = await readFile(this.#path(key)).catch(() => null);
    if (!bytes) return null;
    const copy = new Uint8Array(bytes.byteLength);
    copy.set(bytes);
    return storedObjectBody(metadata, copy);
  }

  async put(key: string, value: BucketValue, options?: R2PutOptions): Promise<R2Object> {
    const bytes = await bytesOf(value);
    const metadata: StoredMetadata = {
      key,
      size: bytes.byteLength,
      etag: createHash("md5").update(bytes).digest("hex"),
      uploaded: Date.now(),
      version: randomUUID(),
      httpMetadata: httpMetadataFrom(options?.httpMetadata),
      customMetadata: options?.customMetadata ?? {},
    };
    const path = this.#path(key);
    await mkdir(join(path, ".."), { recursive: true });
    await this.#replace(path, bytes);
    await this.#replace(`${path}${METADATA_SUFFIX}`, new TextEncoder().encode(JSON.stringify(metadata)));
    return storedObject(metadata);
  }

  async delete(keys: string | string[]): Promise<void> {
    for (const key of Array.isArray(keys) ? keys : [keys]) {
      const path = this.#path(key);
      await rm(`${path}${METADATA_SUFFIX}`, { force: true });
      await rm(path, { force: true });
    }
  }

  async list(options?: R2ListOptions): Promise<R2Objects> {
    const prefix = options?.prefix ?? "";
    const limit = Math.min(options?.limit ?? LIST_LIMIT, LIST_LIMIT);
    const found: StoredMetadata[] = [];
    for (const group of await readdir(this.#directory).catch(() => [])) {
      for (const name of await readdir(join(this.#directory, group)).catch(() => [])) {
        if (!name.endsWith(METADATA_SUFFIX) || name.startsWith(TEMPORARY_PREFIX)) continue;
        const metadata = parseMetadata(await readFile(join(this.#directory, group, name), "utf8").catch(() => ""));
        if (metadata?.key.startsWith(prefix)) found.push(metadata);
      }
    }
    found.sort((left, right) => (left.key < right.key ? -1 : left.key > right.key ? 1 : 0));
    const start = options?.cursor ?? options?.startAfter;
    const remaining = start === undefined ? found : found.filter((metadata) => metadata.key > start);
    const page = remaining.slice(0, limit);
    const last = page.at(-1);
    const objects = page.map(storedObject);
    return remaining.length > page.length && last
      ? { objects, delimitedPrefixes: [], truncated: true, cursor: last.key }
      : { objects, delimitedPrefixes: [], truncated: false };
  }

  createMultipartUpload(): Promise<R2MultipartUpload> {
    return Promise.reject(new Error("Multipart uploads are not available in the file bucket."));
  }

  resumeMultipartUpload(): R2MultipartUpload {
    throw new Error("Multipart uploads are not available in the file bucket.");
  }

  #path(key: string): string {
    const name = objectName(key);
    return join(this.#directory, name.slice(0, 2), name);
  }

  async #metadata(key: string): Promise<StoredMetadata | null> {
    const text = await readFile(`${this.#path(key)}${METADATA_SUFFIX}`, "utf8").catch(() => null);
    if (text === null) return null;
    const metadata = parseMetadata(text);
    return metadata?.key === key ? metadata : null;
  }

  async #replace(path: string, bytes: Uint8Array): Promise<void> {
    const temporary = join(path, "..", `${TEMPORARY_PREFIX}${randomUUID()}`);
    try {
      await writeFile(temporary, bytes, { mode: 0o600 });
      await rename(temporary, path);
    } catch (error) {
      await rm(temporary, { force: true });
      throw error;
    }
  }
}
