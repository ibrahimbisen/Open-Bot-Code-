import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const MAGIC_COOKIE = 0x2112a442;
const ALLOCATE = 0x0003;
const SUCCESS_CLASS = 0x0100;
const ERROR_CLASS = 0x0110;
const USERNAME = 0x0006;
const MESSAGE_INTEGRITY = 0x0008;
const ERROR_CODE = 0x0009;
const LIFETIME = 0x000d;
const REALM = 0x0014;
const NONCE = 0x0015;
const REQUESTED_TRANSPORT = 0x0019;
const UDP_PROTOCOL = 17;
const WAIT_MS = 5_000;

interface Attribute {
  type: number;
  value: Uint8Array;
}

interface Message {
  type: number;
  transactionId: Uint8Array;
  attributes: Map<number, Uint8Array>;
  integrityOffset: number | null;
  bytes: Uint8Array;
}

export interface TurnAllocation {
  username: string;
  at: number;
}

export interface TurnStandIn {
  port: number;
  realm: string;
  allocations: TurnAllocation[];
  refusals: string[];
  stop(): void;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function attribute(type: number, value: Uint8Array | string): Attribute {
  return { type, value: typeof value === "string" ? encoder.encode(value) : value };
}

function uint32(type: number, value: number): Attribute {
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setUint32(0, value);
  return { type, value: bytes };
}

function encodeAttribute({ type, value }: Attribute): Uint8Array {
  const bytes = new Uint8Array(4 + Math.ceil(value.length / 4) * 4);
  const view = new DataView(bytes.buffer);
  view.setUint16(0, type);
  view.setUint16(2, value.length);
  bytes.set(value, 4);
  return bytes;
}

function concat(parts: Uint8Array[]): Uint8Array {
  const bytes = new Uint8Array(parts.reduce((length, part) => length + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    bytes.set(part, offset);
    offset += part.length;
  }
  return bytes;
}

function encode(type: number, transactionId: Uint8Array, attributes: Attribute[], key: Uint8Array | null): Uint8Array {
  const body = concat(attributes.map(encodeAttribute));
  const header = new Uint8Array(20);
  const view = new DataView(header.buffer);
  view.setUint16(0, type);
  view.setUint16(2, body.length + (key ? 24 : 0));
  view.setUint32(4, MAGIC_COOKIE);
  header.set(transactionId, 8);
  const message = concat([header, body]);
  if (!key) return message;
  const integrity = createHmac("sha1", key).update(message).digest();
  return concat([message, encodeAttribute({ type: MESSAGE_INTEGRITY, value: integrity })]);
}

function decode(bytes: Uint8Array): Message | null {
  if (bytes.length < 20) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.getUint32(4) !== MAGIC_COOKIE) return null;
  const end = Math.min(bytes.length, 20 + view.getUint16(2));
  const attributes = new Map<number, Uint8Array>();
  let integrityOffset: number | null = null;
  for (let offset = 20; offset + 4 <= end; ) {
    const type = view.getUint16(offset);
    const length = view.getUint16(offset + 2);
    if (type === MESSAGE_INTEGRITY) integrityOffset = offset;
    attributes.set(type, bytes.subarray(offset + 4, offset + 4 + length));
    offset += 4 + Math.ceil(length / 4) * 4;
  }
  return { type: view.getUint16(0), transactionId: bytes.slice(8, 20), attributes, integrityOffset, bytes };
}

function errorAttribute(code: number, reason: string): Attribute {
  const phrase = encoder.encode(reason);
  const value = new Uint8Array(4 + phrase.length);
  value[2] = Math.floor(code / 100);
  value[3] = code % 100;
  value.set(phrase, 4);
  return { type: ERROR_CODE, value };
}

function readErrorCode(message: Message): number {
  const value = message.attributes.get(ERROR_CODE);
  if (!value || value.length < 4) return 0;
  return ((value[2] ?? 0) & 0x07) * 100 + (value[3] ?? 0);
}

function longTermKey(username: string, realm: string, password: string): Uint8Array {
  return createHash("md5").update(`${username}:${realm}:${password}`).digest();
}

function integrityMatches(message: Message, key: Uint8Array): boolean {
  if (message.integrityOffset === null) return false;
  const signed = message.bytes.slice(0, message.integrityOffset);
  new DataView(signed.buffer).setUint16(2, message.integrityOffset - 20 + 24);
  const expected = createHmac("sha1", key).update(signed).digest();
  const actual = message.attributes.get(MESSAGE_INTEGRITY);
  return actual !== undefined && actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function startTurnStandIn(secret: string, realm = "codebot.local"): Promise<TurnStandIn> {
  const nonce = randomBytes(16).toString("hex");
  const allocations: TurnAllocation[] = [];
  const refusals: string[] = [];
  const socket = await Bun.udpSocket({
    hostname: "127.0.0.1",
    socket: {
      data(server, bytes, port, address) {
        const message = decode(bytes);
        if (!message) return;
        const method = message.type & 0x3eef;
        const reply = (type: number, attributes: Attribute[], key: Uint8Array | null) =>
          server.send(encode(type, message.transactionId, attributes, key), port, address);
        const challenge = (reason: string) => {
          refusals.push(reason);
          reply(
            method | ERROR_CLASS,
            [errorAttribute(401, "Unauthorized"), attribute(REALM, realm), attribute(NONCE, nonce)],
            null,
          );
        };
        const usernameBytes = message.attributes.get(USERNAME);
        if (!usernameBytes) {
          challenge("no credential");
          return;
        }
        const username = decoder.decode(usernameBytes);
        const expiry = Number(username.split(":", 1)[0]);
        if (!Number.isFinite(expiry) || expiry <= Math.floor(Date.now() / 1000)) {
          challenge("expired credential");
          return;
        }
        if (decoder.decode(message.attributes.get(NONCE) ?? new Uint8Array()) !== nonce) {
          challenge("stale nonce");
          return;
        }
        const password = createHmac("sha1", secret).update(username).digest("base64");
        const key = longTermKey(username, realm, password);
        if (!integrityMatches(message, key)) {
          challenge("wrong credential");
          return;
        }
        if (method === ALLOCATE) allocations.push({ username, at: Date.now() });
        reply(method | SUCCESS_CLASS, [uint32(LIFETIME, method === ALLOCATE ? 600 : 0)], key);
      },
    },
  });
  return { port: socket.port, realm, allocations, refusals, stop: () => socket.close() };
}

export interface AllocateResult {
  allocated: boolean;
  errorCode: number;
}

export async function allocateRelay(
  host: string,
  port: number,
  username: string,
  password: string,
): Promise<AllocateResult> {
  const answers: Message[] = [];
  const socket = await Bun.udpSocket({
    socket: {
      data(_socket, bytes) {
        const message = decode(bytes);
        if (message) answers.push(message);
      },
    },
  });
  const ask = async (attributes: Attribute[], key: Uint8Array | null): Promise<Message> => {
    const transactionId = randomBytes(12);
    socket.send(encode(ALLOCATE, transactionId, attributes, key), port, host);
    const deadline = Date.now() + WAIT_MS;
    for (;;) {
      const found = answers.find((answer) => Buffer.from(answer.transactionId).equals(transactionId));
      if (found) return found;
      if (Date.now() > deadline) throw new Error("The TURN server did not answer.");
      await new Promise((next) => setTimeout(next, 10));
    }
  };
  try {
    const transport = uint32(REQUESTED_TRANSPORT, UDP_PROTOCOL << 24);
    const first = await ask([transport], null);
    const realm = first.attributes.get(REALM);
    const nonce = first.attributes.get(NONCE);
    if (!realm || !nonce) return { allocated: false, errorCode: readErrorCode(first) };
    const key = longTermKey(username, decoder.decode(realm), password);
    const second = await ask(
      [transport, attribute(USERNAME, username), attribute(REALM, realm), attribute(NONCE, nonce)],
      key,
    );
    return { allocated: second.type === (ALLOCATE | SUCCESS_CLASS), errorCode: readErrorCode(second) };
  } finally {
    socket.close();
  }
}
