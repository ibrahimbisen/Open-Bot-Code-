import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { isDynamicRecord, isString } from "@codebot/contracts/runtime-values";

export type FakeToolInput = Readonly<Record<string, string | number | boolean>>;

export interface FakeToolStep {
  readonly name: string;
  readonly tool: string;
  readonly input: FakeToolInput;
}

export interface FakeTextStep {
  readonly text: string;
}

export type FakeStep = FakeToolStep | FakeTextStep;

export interface FakeToolResult {
  readonly text: string;
  readonly isError: boolean;
}

export interface FakeRequestRecord {
  readonly path: string;
  readonly kind: "track" | "side" | "count" | "other";
  readonly track: string | null;
  readonly step: number | null;
  readonly model: string | null;
  readonly tools: readonly string[];
  readonly system: string;
  readonly firstUserText: string;
}

export interface FakeAnthropicApi {
  readonly url: string;
  readonly requests: readonly FakeRequestRecord[];
  setTrack(id: string, steps: readonly FakeStep[]): void;
  marker(id: string): string;
  toolResult(track: string, name: string): FakeToolResult | undefined;
  toolResults(track: string): ReadonlyMap<string, FakeToolResult>;
  systemPrompt(track: string): string | undefined;
  toolNames(track: string): readonly string[];
  toolDefinitions(track: string): readonly unknown[];
  unexpectedPaths(): readonly string[];
  close(): Promise<void>;
}

const MARKER = /\[\[fake:([a-z0-9-]+)\]\]/u;
const SIDE_ANSWER = "ok";
const FINISHED_ANSWER = "The script of this fake model has no more steps.";

export function fakeTrackMarker(id: string): string {
  return `[[fake:${id}]]`;
}

function toolUseId(track: string, name: string): string {
  return `toolu_${track}_${name}`.replace(/[^A-Za-z0-9_-]/gu, "_");
}

function isToolStep(step: FakeStep): step is FakeToolStep {
  return "tool" in step;
}

function textBlocks(content: unknown): string[] {
  if (isString(content)) return [content];
  if (!Array.isArray(content)) return [];
  return content.flatMap((block) =>
    isDynamicRecord(block) && block.type === "text" && isString(block.text) ? [block.text] : [],
  );
}

function resultText(content: unknown): string {
  if (isString(content)) return content;
  if (!Array.isArray(content)) return content === undefined || content === null ? "" : JSON.stringify(content);
  return content
    .map((block) =>
      isDynamicRecord(block) && block.type === "text" && isString(block.text) ? block.text : JSON.stringify(block),
    )
    .join("\n");
}

function systemText(system: unknown): string {
  if (isString(system)) return system;
  return textBlocks(system).join("\n");
}

interface Position {
  readonly track: string;
  readonly step: number;
}

function positionOf(messages: readonly unknown[]): Position | null {
  let track: string | null = null;
  let assistantMessages = 0;
  for (const message of messages) {
    if (!isDynamicRecord(message)) continue;
    if (message.role === "assistant") {
      assistantMessages += 1;
      continue;
    }
    if (message.role !== "user") continue;
    for (const text of textBlocks(message.content)) {
      const match = MARKER.exec(text);
      if (!match?.[1]) continue;
      track = match[1];
      assistantMessages = 0;
    }
  }
  return track === null ? null : { track, step: assistantMessages };
}

function sseEvents(model: string, messageId: string, block: unknown, delta: unknown, stopReason: string): string {
  const usage = { input_tokens: 12, output_tokens: 6, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 };
  const events: Array<[string, unknown]> = [
    [
      "message_start",
      {
        type: "message_start",
        message: {
          id: messageId,
          type: "message",
          role: "assistant",
          model,
          content: [],
          stop_reason: null,
          stop_sequence: null,
          usage,
        },
      },
    ],
    ["content_block_start", { type: "content_block_start", index: 0, content_block: block }],
    ["content_block_delta", { type: "content_block_delta", index: 0, delta }],
    ["content_block_stop", { type: "content_block_stop", index: 0 }],
    [
      "message_delta",
      {
        type: "message_delta",
        delta: { stop_reason: stopReason, stop_sequence: null },
        usage: { output_tokens: 6 },
      },
    ],
    ["message_stop", { type: "message_stop" }],
  ];
  return events.map(([event, data]) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`).join("");
}

function listeningPort(server: Server): number {
  const address = server.address();
  if (address === null || typeof address === "string") throw new Error("The fake server has no port.");
  return address.port;
}

export async function startFakeAnthropicApi(): Promise<FakeAnthropicApi> {
  const tracks = new Map<string, readonly FakeStep[]>();
  const results = new Map<string, Map<string, FakeToolResult>>();
  const systems = new Map<string, string>();
  const offeredTools = new Map<string, readonly string[]>();
  const toolDefinitions = new Map<string, readonly unknown[]>();
  const requests: FakeRequestRecord[] = [];
  const unexpected: string[] = [];
  let nextMessage = 0;

  const recordResults = (track: string, messages: readonly unknown[]): void => {
    const steps = tracks.get(track) ?? [];
    const names = new Map(steps.filter(isToolStep).map((step) => [toolUseId(track, step.name), step.name]));
    const known = results.get(track) ?? new Map<string, FakeToolResult>();
    results.set(track, known);
    for (const message of messages) {
      if (!isDynamicRecord(message) || message.role !== "user" || !Array.isArray(message.content)) continue;
      for (const block of message.content) {
        if (!isDynamicRecord(block) || block.type !== "tool_result" || !isString(block.tool_use_id)) continue;
        const name = names.get(block.tool_use_id);
        if (name) known.set(name, { text: resultText(block.content), isError: block.is_error === true });
      }
    }
  };

  const answerMessages = (path: string, body: unknown, response: ServerResponse): void => {
    const record = isDynamicRecord(body) ? body : {};
    const model = isString(record.model) ? record.model : "claude-fake";
    const messages = Array.isArray(record.messages) ? record.messages : [];
    const tools = Array.isArray(record.tools)
      ? record.tools.flatMap((tool) => (isDynamicRecord(tool) && isString(tool.name) ? [tool.name] : []))
      : [];
    const system = systemText(record.system);
    const firstUser = messages.find((message) => isDynamicRecord(message) && message.role === "user");
    const firstUserText = isDynamicRecord(firstUser) ? textBlocks(firstUser.content).join("\n").slice(0, 400) : "";
    const position = positionOf(messages);
    const steps = position ? tracks.get(position.track) : undefined;
    const messageId = `msg_fake_${++nextMessage}`;
    let block: unknown = { type: "text", text: "" };
    let delta: unknown = { type: "text_delta", text: SIDE_ANSWER };
    let stopReason = "end_turn";
    let content: unknown[] = [{ type: "text", text: SIDE_ANSWER }];
    if (position && steps) {
      recordResults(position.track, messages);
      systems.set(position.track, system);
      offeredTools.set(position.track, tools);
      toolDefinitions.set(position.track, Array.isArray(record.tools) ? record.tools : []);
      const step = steps[position.step];
      if (step && isToolStep(step)) {
        const id = toolUseId(position.track, step.name);
        block = { type: "tool_use", id, name: step.tool, input: {} };
        delta = { type: "input_json_delta", partial_json: JSON.stringify(step.input) };
        stopReason = "tool_use";
        content = [{ type: "tool_use", id, name: step.tool, input: step.input }];
      } else {
        const text = step ? step.text : FINISHED_ANSWER;
        delta = { type: "text_delta", text };
        content = [{ type: "text", text }];
      }
    }
    requests.push({
      path,
      kind: position && steps ? "track" : "side",
      track: position?.track ?? null,
      step: position?.step ?? null,
      model,
      tools,
      system: system.slice(0, 200),
      firstUserText,
    });
    if (record.stream === true) {
      response.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache" });
      response.end(sseEvents(model, messageId, block, delta, stopReason));
      return;
    }
    response.writeHead(200, { "content-type": "application/json" });
    response.end(
      JSON.stringify({
        id: messageId,
        type: "message",
        role: "assistant",
        model,
        content,
        stop_reason: stopReason,
        stop_sequence: null,
        usage: { input_tokens: 12, output_tokens: 6 },
      }),
    );
  };

  const answer = (request: IncomingMessage, response: ServerResponse, text: string): void => {
    const path = (request.url ?? "").split("?")[0] ?? "";
    let body: unknown = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = null;
    }
    if (request.method === "POST" && path.endsWith("/v1/messages")) {
      answerMessages(path, body, response);
      return;
    }
    if (request.method === "POST" && path.endsWith("/v1/messages/count_tokens")) {
      requests.push({
        path,
        kind: "count",
        track: null,
        step: null,
        model: null,
        tools: [],
        system: "",
        firstUserText: "",
      });
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ input_tokens: 1000 }));
      return;
    }
    unexpected.push(`${request.method ?? "?"} ${path}`);
    requests.push({
      path,
      kind: "other",
      track: null,
      step: null,
      model: null,
      tools: [],
      system: "",
      firstUserText: "",
    });
    response.writeHead(404, { "content-type": "application/json" });
    response.end(JSON.stringify({ type: "error", error: { type: "not_found_error", message: "Not found." } }));
  };

  const server: Server = createServer((request, response) => {
    const chunks: Buffer[] = [];
    request.on("data", (chunk: Buffer) => chunks.push(chunk));
    request.on("end", () => answer(request, response, Buffer.concat(chunks).toString("utf8")));
  });
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));

  return {
    url: `http://127.0.0.1:${listeningPort(server)}`,
    requests,
    setTrack: (id, steps) => {
      tracks.set(id, steps);
      results.delete(id);
    },
    marker: fakeTrackMarker,
    toolResult: (track, name) => results.get(track)?.get(name),
    toolResults: (track) => results.get(track) ?? new Map(),
    systemPrompt: (track) => systems.get(track),
    toolNames: (track) => offeredTools.get(track) ?? [],
    toolDefinitions: (track) => toolDefinitions.get(track) ?? [],
    unexpectedPaths: () => unexpected,
    close: () =>
      new Promise<void>((done) => {
        server.closeAllConnections();
        server.close(() => done());
      }),
  };
}

export interface EgressGuard {
  readonly env: Readonly<Record<string, string>>;
  readonly attempts: readonly string[];
  close(): Promise<void>;
}

export async function startEgressGuard(): Promise<EgressGuard> {
  const attempts: string[] = [];
  const server = createServer((request, response) => {
    attempts.push(`${request.method ?? "?"} ${request.url ?? ""}`);
    response.writeHead(403, { "content-type": "text/plain" });
    response.end("The test allows no request to another computer.");
  });
  server.on("connect", (request, socket) => {
    attempts.push(`CONNECT ${request.url ?? ""}`);
    socket.end("HTTP/1.1 403 Forbidden\r\nconnection: close\r\n\r\n");
  });
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
  const proxy = `http://127.0.0.1:${listeningPort(server)}`;
  return {
    env: {
      HTTPS_PROXY: proxy,
      HTTP_PROXY: proxy,
      https_proxy: proxy,
      http_proxy: proxy,
      NO_PROXY: "127.0.0.1,localhost,::1",
      no_proxy: "127.0.0.1,localhost,::1",
    },
    attempts,
    close: () =>
      new Promise<void>((done) => {
        server.closeAllConnections();
        server.close(() => done());
      }),
  };
}
