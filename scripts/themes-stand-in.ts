import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

export const STAND_IN_REPLY = [
  "Here is the helper that I added to `src/server.ts`:",
  "",
  "```ts",
  "export function total(values: number[]): number {",
  "  // Add all values and round to two places.",
  '  const label = "sum";',
  "  return Math.round(values.reduce((sum, value) => sum + value, 0) * 100) / 100;",
  "}",
  "```",
  "",
  "It returns `0` for an empty list. Run `bun test` to check it.",
].join("\n");

const SOURCE = String.raw`
const { appendFileSync } = require("node:fs");
if (process.argv.includes("--version")) {
  process.stdout.write("codex-cli 0.160.1\n");
  process.exit(0);
}
const REPLY = ${JSON.stringify(STAND_IN_REPLY)};
const config = { config: { mcp_servers: {} }, layers: [{ name: { type: "user", file: "/stand-in/.codex/config.toml", profile: null }, version: "1", config: { mcp_servers: {} } }] };
let buffer = "";
let threads = 0;
let turns = 0;
process.stdout.on("error", (error) => {
  if (error.code === "EPIPE") process.exit(0);
  throw error;
});
const write = (message) => process.stdout.write(JSON.stringify(message) + "\n");
const answer = (message) => {
  const params = message.params || {};
  switch (message.method) {
    case "initialize": return write({ id: message.id, result: {} });
    case "account/read": return write({ id: message.id, result: { account: { type: "chatgpt", email: "codex@example.com" } } });
    case "account/rateLimits/read": return write({ id: message.id, result: { rateLimits: { limitId: "codex", primary: null, secondary: null }, rateLimitsByLimitId: null } });
    case "model/list": return write({ id: message.id, result: { data: [{ model: "gpt-6-luna", displayName: "GPT-6 Luna" }, { model: "gpt-6-sol", displayName: "GPT-6 Sol" }] } });
    case "plugin/list": return write({ id: message.id, result: { marketplaces: [] } });
    case "config/read": return write({ id: message.id, result: config });
    case "config/batchWrite": return write({ id: message.id, result: {} });
    case "thread/start": return write({ id: message.id, result: { thread: { id: "thread-" + process.pid + "-" + (++threads), turns: [] } } });
    case "thread/resume": return write({ id: message.id, result: { thread: { id: params.threadId, turns: [] } } });
    case "thread/unsubscribe": return write({ id: message.id, result: { status: "Unsubscribed" } });
    case "thread/name/set": return write({ id: message.id, result: {} });
    case "thread/turns/list":
    case "thread/items/list": return write({ id: message.id, result: { data: [], nextCursor: null } });
    case "thread/read": return write({ id: message.id, result: { thread: { id: params.threadId, turns: [] } } });
    case "turn/start": {
      const turnId = "turn-" + process.pid + "-" + (++turns);
      write({ id: message.id, result: { turn: { id: turnId, status: "inProgress", items: [] } } });
      write({ method: "turn/started", params: { threadId: params.threadId, turn: { id: turnId } } });
      return setTimeout(() => {
        const item = { type: "agentMessage", id: "message-" + turnId, text: REPLY, phase: "final_answer" };
        write({ method: "item/completed", params: { threadId: params.threadId, turnId, item } });
        write({ method: "turn/completed", params: { threadId: params.threadId, turn: { id: turnId, status: "completed" } } });
      }, 20);
    }
    case "turn/interrupt": {
      write({ id: message.id, result: {} });
      return write({ method: "turn/completed", params: { threadId: params.threadId, turn: { id: params.turnId, status: "interrupted" } } });
    }
    default:
      return write({ id: message.id, error: { code: -32601, message: "Method not found: " + message.method } });
  }
};
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  buffer += chunk;
  let newline = buffer.indexOf("\n");
  while (newline >= 0) {
    const line = buffer.slice(0, newline);
    buffer = buffer.slice(newline + 1);
    if (line) {
      const message = JSON.parse(line);
      if (message.method && message.id !== undefined) answer(message);
    }
    newline = buffer.indexOf("\n");
  }
});
`;

export function writeThemeStandIn(directory: string): string {
  mkdirSync(directory, { recursive: true });
  writeFileSync(join(directory, "stand-in.cjs"), SOURCE);
  if (process.platform === "win32") {
    const wrapper = join(directory, "codex.cmd");
    writeFileSync(wrapper, `@"${process.execPath}" "%~dp0stand-in.cjs" %*\r\n`);
    return wrapper;
  }
  const wrapper = join(directory, "codex");
  writeFileSync(wrapper, `#!/bin/sh\nexec "${process.execPath}" "${join(directory, "stand-in.cjs")}" "$@"\n`, {
    mode: 0o755,
  });
  return wrapper;
}

if (import.meta.main) {
  const directory = resolve(import.meta.dirname, "../.codebot-build/themes/stand-in");
  process.stdout.write(`${writeThemeStandIn(directory)}\n`);
}
