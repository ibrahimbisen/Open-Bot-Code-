import { EOL } from "node:os";
import type { ExplorerEncoding, ExplorerLineEnding } from "@codebot/contracts/ipc";

const SNIFF_BYTES = 8 * 1_024;
const UTF16_SAMPLE_BYTES = 512;
const CONTROL_SHARE_LIMIT = 0.1;

export interface TextEncoding {
  encoding: ExplorerEncoding;
  bom: boolean;
}

export interface DecodedText extends TextEncoding {
  content: string;
  lineEnding: ExplorerLineEnding;
  mixedLineEndings: boolean;
}

function byteOrderMark(bytes: Uint8Array): (TextEncoding & { length: number }) | null {
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) return { encoding: "utf8", bom: true, length: 3 };
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return { encoding: "utf16le", bom: true, length: 2 };
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return { encoding: "utf16be", bom: true, length: 2 };
  return null;
}

function utf16WithoutMark(bytes: Uint8Array): ExplorerEncoding | null {
  const length = Math.min(bytes.byteLength, UTF16_SAMPLE_BYTES) & ~1;
  if (length < 4) return null;
  let evenZero = 0;
  let oddZero = 0;
  for (let index = 0; index < length; index += 2) {
    if (bytes[index] === 0) evenZero += 1;
    if (bytes[index + 1] === 0) oddZero += 1;
  }
  const pairs = length / 2;
  if (oddZero === pairs && evenZero === 0) return "utf16le";
  if (evenZero === pairs && oddZero === 0) return "utf16be";
  return null;
}

function looksBinary(bytes: Uint8Array): boolean {
  const length = Math.min(bytes.byteLength, SNIFF_BYTES);
  if (length === 0) return false;
  let control = 0;
  for (let index = 0; index < length; index += 1) {
    const byte = bytes[index] ?? 0;
    if (byte === 0) return true;
    if (byte < 0x09 || (byte > 0x0d && byte < 0x20 && byte !== 0x1b)) control += 1;
  }
  return control / length > CONTROL_SHARE_LIMIT;
}

function decodeUtf8(bytes: Uint8Array, partial: boolean): string | null {
  try {
    return new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes, { stream: partial });
  } catch {
    return null;
  }
}

function decodeUtf16(bytes: Uint8Array, bigEndian: boolean): string {
  const even = Buffer.from(bytes.subarray(0, bytes.byteLength & ~1));
  return (bigEndian ? even.swap16() : even).toString("utf16le");
}

export function platformLineEnding(): ExplorerLineEnding {
  return EOL === "\r\n" ? "crlf" : "lf";
}

function lineEndings(content: string): { lineEnding: ExplorerLineEnding; mixed: boolean } {
  let crlf = 0;
  let lf = 0;
  let cr = 0;
  for (let index = 0; index < content.length; index += 1) {
    const code = content.charCodeAt(index);
    if (code === 10) lf += 1;
    else if (code === 13) {
      if (content.charCodeAt(index + 1) === 10) {
        crlf += 1;
        index += 1;
      } else cr += 1;
    }
  }
  if (crlf === 0 && lf === 0) return { lineEnding: platformLineEnding(), mixed: cr > 0 };
  return { lineEnding: crlf > lf ? "crlf" : "lf", mixed: cr > 0 || (crlf > 0 && lf > 0) };
}

export function decodeText(bytes: Uint8Array, partial = false): DecodedText | null {
  const mark = byteOrderMark(bytes);
  const body = mark ? bytes.subarray(mark.length) : bytes;
  let found: (TextEncoding & { content: string }) | null = null;
  if (mark?.encoding === "utf8") {
    const content = decodeUtf8(body, partial);
    if (content !== null) found = { encoding: "utf8", bom: true, content };
  } else if (mark) {
    found = { encoding: mark.encoding, bom: true, content: decodeUtf16(body, mark.encoding === "utf16be") };
  } else {
    const wide = utf16WithoutMark(bytes);
    if (wide) found = { encoding: wide, bom: false, content: decodeUtf16(bytes, wide === "utf16be") };
    else if (!looksBinary(bytes)) {
      const content = decodeUtf8(bytes, partial);
      found =
        content === null
          ? { encoding: "latin1", bom: false, content: Buffer.from(bytes).toString("latin1") }
          : { encoding: "utf8", bom: false, content };
    }
  }
  if (!found) return null;
  const endings = lineEndings(found.content);
  return {
    content: found.content.replace(/\r\n?/gu, "\n"),
    encoding: found.encoding,
    bom: found.bom,
    lineEnding: endings.lineEnding,
    mixedLineEndings: endings.mixed,
  };
}

function fitsLatin1(content: string): boolean {
  for (let index = 0; index < content.length; index += 1) if (content.charCodeAt(index) > 0xff) return false;
  return true;
}

export function encodeText(
  content: string,
  options: TextEncoding & { lineEnding: ExplorerLineEnding },
): { bytes: Buffer; encoding: ExplorerEncoding } {
  const unix = content.replace(/\r\n?/gu, "\n");
  const text = options.lineEnding === "crlf" ? unix.replace(/\n/gu, "\r\n") : unix;
  const encoding: ExplorerEncoding = options.encoding === "latin1" && !fitsLatin1(text) ? "utf8" : options.encoding;
  if (encoding === "latin1") return { bytes: Buffer.from(text, "latin1"), encoding };
  if (encoding === "utf8") {
    const body = Buffer.from(text, "utf8");
    return { bytes: options.bom ? Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), body]) : body, encoding };
  }
  const little = Buffer.from(text, "utf16le");
  const body = encoding === "utf16be" ? little.swap16() : little;
  const mark = encoding === "utf16be" ? Buffer.from([0xfe, 0xff]) : Buffer.from([0xff, 0xfe]);
  return { bytes: options.bom ? Buffer.concat([mark, body]) : body, encoding };
}
