import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Options, query, SDKUserMessage } from "@anthropic-ai/claude-agent-sdk";
import { isDynamicRecord, isString } from "@codebot/contracts/runtime-values";
import { createCodeBotLogger } from "@codebot/logging";

export type ClaudeSandboxState = { readonly available: true } | { readonly available: false; readonly reason: string };

export interface ClaudeSandboxProbe {
  readonly key: string;
  readonly createQuery: (params: Parameters<typeof query>[0]) => AsyncIterable<unknown> & {
    close(): void;
    initializationResult?(): Promise<unknown>;
  };
  readonly launch: Pick<Options, "pathToClaudeCodeExecutable" | "spawnClaudeCodeProcess">;
  readonly env: NodeJS.ProcessEnv;
}

const FORCED_STATE_VARIABLE = "CODEBOT_LOCK_CLAUDE_SANDBOX";
const PROBE_TIMEOUT_MS = 60_000;
const UNAVAILABLE = /Sandbox required but unavailable: (.+?)\.? Set sandbox\.failIfUnavailable=false/su;
const logger = createCodeBotLogger("claude-sandbox-probe");
const states = new Map<string, Promise<ClaudeSandboxState>>();

export function claudeSandboxFailure(text: string): string | null {
  return UNAVAILABLE.exec(text)?.[1]?.trim() ?? null;
}

export function claudeSandboxState(probe: ClaudeSandboxProbe): Promise<ClaudeSandboxState> {
  if (process.env[FORCED_STATE_VARIABLE] === "unavailable")
    return Promise.resolve({ available: false, reason: `${FORCED_STATE_VARIABLE}=unavailable` });
  const known = states.get(probe.key);
  if (known) return known;
  const started = runProbe(probe).then((state) => {
    logger.info("Checked the Claude sandbox.", {
      available: state.available,
      ...(state.available ? {} : { reason: state.reason }),
    });
    return state;
  });
  states.set(probe.key, started);
  return started;
}

export function markClaudeSandboxUnavailable(key: string, reason: string): void {
  states.set(key, Promise.resolve({ available: false, reason }));
}

function waitingPrompt(): { prompt: AsyncIterable<SDKUserMessage>; end: () => void } {
  let end: () => void = () => {};
  const ended = new Promise<IteratorResult<SDKUserMessage>>((resolve) => {
    end = () => resolve({ done: true, value: undefined });
  });
  return { prompt: { [Symbol.asyncIterator]: () => ({ next: () => ended }) }, end };
}

async function runProbe(probe: ClaudeSandboxProbe): Promise<ClaudeSandboxState> {
  const folder = await mkdtemp(join(tmpdir(), "codebot-sandbox-probe-"));
  const { prompt, end } = waitingPrompt();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const started = probe.createQuery({
      prompt,
      options: {
        cwd: folder,
        ...probe.launch,
        settingSources: [],
        persistSession: false,
        tools: [],
        sandbox: { enabled: true, failIfUnavailable: true },
        env: probe.env,
      },
    });
    const refused = (async (): Promise<ClaudeSandboxState | null> => {
      try {
        for await (const message of started) {
          const reason = sandboxRefusal(message);
          if (reason !== null) return { available: false, reason };
        }
      } catch (error) {
        const reason = claudeSandboxFailure(String(error));
        if (reason !== null) return { available: false, reason };
      }
      return null;
    })();
    const ready = (started.initializationResult?.() ?? new Promise<never>(() => {})).then(
      (): ClaudeSandboxState => ({ available: true }),
      () => null,
    );
    const timedOut = new Promise<"timeout">((resolve) => {
      timer = setTimeout(() => resolve("timeout"), PROBE_TIMEOUT_MS);
    });
    const first = await Promise.race([refused, ready, timedOut]);
    end();
    started.close();
    if (first === "timeout" || first === null) {
      const late = first === null ? await Promise.race([refused, timedOut]) : null;
      if (late && late !== "timeout") return late;
      return process.platform === "win32"
        ? { available: false, reason: "the check of the sandbox did not finish" }
        : { available: true };
    }
    return first;
  } catch (error) {
    return { available: false, reason: error instanceof Error ? error.message : String(error) };
  } finally {
    if (timer) clearTimeout(timer);
    await rm(folder, { recursive: true, force: true }).catch(() => {});
  }
}

function sandboxRefusal(message: unknown): string | null {
  if (!isDynamicRecord(message) || message.type !== "result" || !Array.isArray(message.errors)) return null;
  for (const error of message.errors) {
    const reason = isString(error) ? claudeSandboxFailure(error) : null;
    if (reason !== null) return reason;
  }
  return null;
}
