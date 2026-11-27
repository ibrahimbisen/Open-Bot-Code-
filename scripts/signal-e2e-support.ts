import { type ChildProcess, spawn } from "node:child_process";
import { type DynamicRecord, isDynamicRecord, isString } from "@codebot/contracts/runtime-values";
import { ROOT } from "./account-e2e-support";

const START_LIMIT_MS = 30_000;
const WAIT_LIMIT_MS = 20_000;

export interface SignalProcess {
  child: ChildProcess;
  logs: string[];
  exited: Promise<number | null>;
}

export interface Peer {
  messages: DynamicRecord[];
  closed: Promise<{ code: number; reason: string }>;
  send(message: DynamicRecord): void;
  next(type: string): Promise<DynamicRecord>;
  close(): void;
}

export async function startSignal(input: {
  port: number;
  healthPort: number;
  jwksUrl: string;
  controlPlaneUrl: string;
  sessionSecret: string;
  webhookSecret: string;
  turnSecret: string;
  turnHost: string;
  turnPort?: number;
}): Promise<SignalProcess> {
  const child = spawn(process.execPath, ["--no-env-file", "remote/api/src/index.ts"], {
    cwd: ROOT,
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      REMOTE_TLS_DISABLED: "true",
      REMOTE_SIGNAL_HOST: "127.0.0.1",
      REMOTE_SIGNAL_PORT: String(input.port),
      REMOTE_HEALTH_PORT: String(input.healthPort),
      REMOTE_TICKET_JWKS_URL: input.jwksUrl,
      REMOTE_CONTROL_PLANE_URL: input.controlPlaneUrl,
      REMOTE_SESSION_SECRET: input.sessionSecret,
      REMOTE_AUTH_WEBHOOK_SECRET: input.webhookSecret,
      TURN_SHARED_SECRET: input.turnSecret,
      TURN_HOST: input.turnHost,
      ...(input.turnPort === undefined ? {} : { TURN_PORT: String(input.turnPort) }),
    },
  });
  const logs: string[] = [];
  const keep = (chunk: Buffer) => {
    for (const line of chunk.toString("utf8").split(/\r?\n/u)) if (line) logs.push(line);
  };
  child.stdout?.on("data", keep);
  child.stderr?.on("data", keep);
  const exited = new Promise<number | null>((done) => child.once("exit", (code) => done(code)));
  const deadline = Date.now() + START_LIMIT_MS;
  for (;;) {
    const answer = await fetch(`http://127.0.0.1:${input.healthPort}/health/ready`).catch(() => null);
    if (answer?.ok) break;
    if (child.exitCode !== null || Date.now() > deadline) {
      child.kill();
      throw new Error(`Signal did not start.\n${logs.join("\n")}`);
    }
    await new Promise((next) => setTimeout(next, 200));
  }
  return { child, logs, exited };
}

export async function stopSignal(signal: SignalProcess): Promise<void> {
  if (signal.child.exitCode !== null) return;
  signal.child.kill();
  await Promise.race([signal.exited, new Promise((done) => setTimeout(done, 10_000))]);
}

export function connect(url: string): Promise<Peer> {
  return new Promise((ready, reject) => {
    const socket = new WebSocket(url);
    const messages: DynamicRecord[] = [];
    const waiting: { type: string; resolve: (message: DynamicRecord) => void }[] = [];
    let closeResolve: (value: { code: number; reason: string }) => void = () => undefined;
    const closed = new Promise<{ code: number; reason: string }>((done) => {
      closeResolve = done;
    });
    socket.addEventListener("message", (event) => {
      const parsed = isString(event.data) ? JSON.parse(event.data) : null;
      if (!isDynamicRecord(parsed)) return;
      messages.push(parsed);
      const index = waiting.findIndex((entry) => entry.type === parsed.type);
      const entry = index >= 0 ? waiting.splice(index, 1)[0] : undefined;
      entry?.resolve(parsed);
    });
    socket.addEventListener("close", (event) => closeResolve({ code: event.code, reason: event.reason }));
    socket.addEventListener("error", () => reject(new Error("The Signal socket failed.")));
    socket.addEventListener("open", () =>
      ready({
        messages,
        closed,
        send: (message) => socket.send(JSON.stringify(message)),
        next: (type) => {
          const found = messages.find((message) => message.type === type);
          if (found) return Promise.resolve(found);
          return new Promise((resolve, rejectNext) => {
            const timer = setTimeout(() => rejectNext(new Error(`No ${type} message arrived.`)), WAIT_LIMIT_MS);
            waiting.push({
              type,
              resolve: (message) => {
                clearTimeout(timer);
                resolve(message);
              },
            });
          });
        },
        close: () => socket.close(),
      }),
    );
  });
}

export function iceUrls(message: DynamicRecord): string[] {
  const servers = Array.isArray(message.iceServers) ? message.iceServers : [];
  const urls: string[] = [];
  for (const server of servers) {
    if (!isDynamicRecord(server)) continue;
    const list = Array.isArray(server.urls) ? server.urls : [server.urls];
    for (const url of list) if (isString(url)) urls.push(url);
  }
  return urls;
}
