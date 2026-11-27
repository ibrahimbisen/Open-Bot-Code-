import { createHash } from "node:crypto";
import { INPUT_LIMITS } from "@codebot/contracts/input-limits";
import { isValidHostname, normalizeEmailAddress } from "@codebot/contracts/validation";

const LOCAL_PART_LIMIT = 64;
const PLAIN_CHARACTER = /^[a-z0-9.!#$%&'*+/?^_`{|}~-]$/u;
const TAG_LENGTH = 8;

export function identityTag(issuer: string, subject: string): string {
  return createHash("sha256").update(`${issuer}\n${subject}`).digest("hex").slice(0, TAG_LENGTH);
}

function encodedLocalPart(subject: string): string {
  let local = "";
  for (const character of subject.normalize("NFC").toLowerCase()) {
    if (PLAIN_CHARACTER.test(character)) {
      local += character;
      continue;
    }
    for (const byte of new TextEncoder().encode(character)) local += `=${byte.toString(16).padStart(2, "0")}`;
  }
  return local;
}

function addressDomain(issuer: string): string {
  const host = URL.canParse(issuer) ? new URL(issuer).hostname.toLowerCase() : "";
  if (isValidHostname(host)) return host;
  const label = host.replace(/[^a-z0-9-]+/gu, "-").replace(/^-+|-+$/gu, "");
  return `${label || "identity"}.invalid`;
}

export function accountAddress(issuer: string, subject: string, options: { tagged: boolean }): string {
  const domain = addressDomain(issuer);
  const tag = identityTag(issuer, subject);
  const limit = Math.min(LOCAL_PART_LIMIT, INPUT_LIMITS.email - domain.length - 1);
  const plain = encodedLocalPart(subject);
  const tagged = options.tagged || plain.length === 0 || plain.length > limit;
  const local = tagged ? `${plain.slice(0, Math.max(0, limit - TAG_LENGTH - 1))}+${tag}` : plain;
  return normalizeEmailAddress(`${local}@${domain}`) ?? `account+${tag}@${domain}`;
}
