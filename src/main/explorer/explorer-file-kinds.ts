import { extname } from "node:path";
import type { ExplorerFileKind } from "@codebot/contracts/ipc";

interface PreviewType {
  kind: Exclude<ExplorerFileKind, "text" | "binary">;
  mimeType: string;
}

const PREVIEW_TYPES: Readonly<Record<string, PreviewType>> = {
  ".png": { kind: "image", mimeType: "image/png" },
  ".apng": { kind: "image", mimeType: "image/apng" },
  ".jpg": { kind: "image", mimeType: "image/jpeg" },
  ".jpeg": { kind: "image", mimeType: "image/jpeg" },
  ".jfif": { kind: "image", mimeType: "image/jpeg" },
  ".gif": { kind: "image", mimeType: "image/gif" },
  ".webp": { kind: "image", mimeType: "image/webp" },
  ".avif": { kind: "image", mimeType: "image/avif" },
  ".bmp": { kind: "image", mimeType: "image/bmp" },
  ".ico": { kind: "image", mimeType: "image/x-icon" },
  ".svg": { kind: "svg", mimeType: "image/svg+xml" },
  ".pdf": { kind: "pdf", mimeType: "application/pdf" },
  ".mp3": { kind: "audio", mimeType: "audio/mpeg" },
  ".m4a": { kind: "audio", mimeType: "audio/mp4" },
  ".wav": { kind: "audio", mimeType: "audio/wav" },
  ".aac": { kind: "audio", mimeType: "audio/aac" },
  ".ogg": { kind: "audio", mimeType: "audio/ogg" },
  ".oga": { kind: "audio", mimeType: "audio/ogg" },
  ".opus": { kind: "audio", mimeType: "audio/ogg" },
  ".flac": { kind: "audio", mimeType: "audio/flac" },
  ".mp4": { kind: "video", mimeType: "video/mp4" },
  ".m4v": { kind: "video", mimeType: "video/mp4" },
  ".mov": { kind: "video", mimeType: "video/quicktime" },
  ".webm": { kind: "video", mimeType: "video/webm" },
};

const TEXT_MIME_TYPES: Readonly<Record<string, string>> = {
  ".md": "text/markdown",
  ".markdown": "text/markdown",
  ".json": "application/json",
  ".csv": "text/csv",
  ".tsv": "text/tab-separated-values",
  ".html": "text/html",
  ".htm": "text/html",
  ".css": "text/css",
  ".xml": "application/xml",
};

export function previewTypeForName(name: string): PreviewType | null {
  return PREVIEW_TYPES[extname(name).toLowerCase()] ?? null;
}

export function textMimeTypeForName(name: string): string {
  return TEXT_MIME_TYPES[extname(name).toLowerCase()] ?? "text/plain";
}
