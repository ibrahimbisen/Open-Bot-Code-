import { Effect, Schema } from "effect";
import { decodeBase64Url, deriveSecret, encodeBase64Url } from "../../server/crypto";

const VERSION = "v1";
const KEY_LABEL = "codebot/account-service/refresh-token/v1";

export class SecretBoxError extends Schema.TaggedError<SecretBoxError>()("SecretBoxError", {}) {}

function boxCall<A>(operation: () => Promise<A>): Effect.Effect<A, SecretBoxError> {
  return Effect.tryPromise({ try: operation, catch: () => new SecretBoxError({}) });
}

export class SecretBox {
  readonly #secret: string;
  #key: CryptoKey | null = null;

  constructor(secret: string) {
    this.#secret = secret;
  }

  readonly seal = Effect.fn("SecretBox.seal")(function* (this: SecretBox, value: string, context: string) {
    const key = yield* this.#cipherKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoder = new TextEncoder();
    const ciphertext = yield* boxCall(() =>
      crypto.subtle.encrypt(
        { name: "AES-GCM", iv, additionalData: encoder.encode(context) },
        key,
        encoder.encode(value),
      ),
    );
    return `${VERSION}.${encodeBase64Url(iv)}.${encodeBase64Url(new Uint8Array(ciphertext))}`;
  });

  readonly open = Effect.fn("SecretBox.open")(function* (this: SecretBox, sealed: string, context: string) {
    const [version, iv, ciphertext] = sealed.split(".");
    if (version !== VERSION || !iv || !ciphertext) return yield* new SecretBoxError({});
    const key = yield* this.#cipherKey();
    const plaintext = yield* boxCall(() =>
      crypto.subtle.decrypt(
        { name: "AES-GCM", iv: decodeBase64Url(iv), additionalData: new TextEncoder().encode(context) },
        key,
        decodeBase64Url(ciphertext),
      ),
    );
    return new TextDecoder().decode(plaintext);
  });

  readonly #cipherKey = Effect.fn("SecretBox.cipherKey")(function* (this: SecretBox) {
    if (this.#key) return this.#key;
    const raw = yield* deriveSecret(this.#secret, KEY_LABEL).pipe(Effect.mapError(() => new SecretBoxError({})));
    const key = yield* boxCall(() =>
      crypto.subtle.importKey("raw", decodeBase64Url(raw), "AES-GCM", false, ["encrypt", "decrypt"]),
    );
    this.#key = key;
    return key;
  });
}
