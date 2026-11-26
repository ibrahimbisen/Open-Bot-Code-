import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { encodeBase64Url } from "../server/crypto";

interface GeneratedKeys {
  keyId: string;
  privateJwk: string;
  publicJwks: string;
  secretKey: string;
  webhookSecret: string;
}

function randomSecret(bytes: number): string {
  return encodeBase64Url(crypto.getRandomValues(new Uint8Array(bytes)));
}

export async function generateAccountKeys(now: Date = new Date()): Promise<GeneratedKeys> {
  const keyId = `account-${now.toISOString().slice(0, 10).replaceAll("-", "")}-${randomSecret(4)}`;
  const pair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const header = { kid: keyId, alg: "ES256", use: "sig" };
  const privateJwk = { ...(await crypto.subtle.exportKey("jwk", pair.privateKey)), ...header };
  const publicJwk = { ...(await crypto.subtle.exportKey("jwk", pair.publicKey)), ...header };
  delete privateJwk.key_ops;
  delete privateJwk.ext;
  delete publicJwk.key_ops;
  delete publicJwk.ext;
  return {
    keyId,
    privateJwk: JSON.stringify(privateJwk),
    publicJwks: JSON.stringify({ keys: [publicJwk] }),
    secretKey: randomSecret(32),
    webhookSecret: randomSecret(48),
  };
}

export function accountKeyLines(keys: GeneratedKeys): string {
  return [
    `REMOTE_TICKET_KEY_ID=${keys.keyId}`,
    `REMOTE_TICKET_PRIVATE_JWK='${keys.privateJwk}'`,
    `REMOTE_TICKET_PUBLIC_JWKS='${keys.publicJwks}'`,
    `REMOTE_AUTH_WEBHOOK_SECRET=${keys.webhookSecret}`,
    `ACCOUNT_SECRET_KEY=${keys.secretKey}`,
    "",
  ].join("\n");
}

function outputPath(args: readonly string[]): string | null {
  const index = args.indexOf("--out");
  if (index < 0) return null;
  const value = args[index + 1];
  if (!value) throw new Error("Give a file path after --out.");
  return resolve(value);
}

async function main(): Promise<void> {
  const lines = accountKeyLines(await generateAccountKeys());
  const path = outputPath(process.argv.slice(2));
  if (!path) {
    process.stdout.write(lines);
    process.stderr.write(
      "Keep these values secret. Use the same REMOTE_AUTH_WEBHOOK_SECRET in the Signal service. Use --out <file> to write a file.\n",
    );
    return;
  }
  writeFileSync(path, lines, { flag: "wx", mode: 0o600 });
  process.stderr.write(`The keys are in ${path}. Keep this file secret.\n`);
}

if (import.meta.main) {
  try {
    await main();
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : "The keys were not made."}\n`);
    process.exit(1);
  }
}
