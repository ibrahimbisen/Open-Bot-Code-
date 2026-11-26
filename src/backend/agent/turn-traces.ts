import { INPUT_LIMITS } from "@codebot/contracts/input-limits";
import {
  CONVERSATION_MEMORY_CHANGES_ITEM_TYPE,
  CONVERSATION_PLAN_ITEM_TYPE,
  CONVERSATION_SUBAGENTS_ITEM_TYPE,
  CONVERSATION_TRACE_STEP_LIMIT,
  CONVERSATION_TRACE_TEXT_LIMIT,
  type ConversationMessage,
  type ConversationTraceStep,
  type ConversationTraceStepKind,
  type ConversationTurnTrace,
} from "@codebot/contracts/ipc";
import { redactText } from "@codebot/logging";
import { mergeTraceTargets } from "./trace-step-facts";
import type { StepInputParts } from "./turn-step-details";

export interface ToolOutcome {
  tool: string | null;
  result: string | null;
}

interface RunningTrace {
  startedAt: string;
  steps: Map<string, ConversationTraceStep>;
  outcomes: Map<string, ToolOutcome>;
  stepInputs: Map<string, StepInputParts>;
  detailBytes: number;
}

export class TurnTraces {
  readonly #turns = new Map<string, RunningTrace>();

  begin(turnId: string, startedAt: string): void {
    this.#turns.set(turnId, {
      startedAt,
      steps: new Map(),
      outcomes: new Map(),
      stepInputs: new Map(),
      detailBytes: 0,
    });
  }

  observe(
    turnId: string,
    itemId: string,
    kind: ConversationTraceStepKind,
    event: {
      completed: boolean;
      failed?: boolean;
      text?: string | null;
      command?: string | null;
      recipientAgentIds?: string[] | null;
      error?: string | null;
      tool?: string | null;
      result?: string | null;
      activity?: string | null;
      targets?: readonly string[] | null;
    },
  ): void {
    const trace = this.#turns.get(turnId);
    if (!trace || !itemId || itemId.length > INPUT_LIMITS.identifier) return;
    const now = new Date().toISOString();
    let step = trace.steps.get(itemId);
    if (!step) {
      if (trace.steps.size >= CONVERSATION_TRACE_STEP_LIMIT) return;
      step = { id: itemId, kind, startedAt: now, endedAt: null };
      trace.steps.set(itemId, step);
    }
    if (step.kind !== "tool") step.kind = kind;
    if (kind === "tool" && step.text === undefined && event.text)
      step.text = event.text.slice(0, CONVERSATION_TRACE_TEXT_LIMIT);
    const command = event.command?.trim();
    if (kind === "tool" && step.command === undefined && command)
      step.command = redactText(command).slice(0, CONVERSATION_TRACE_TEXT_LIMIT);
    if (kind === "tool" && step.recipientAgentIds === undefined && event.recipientAgentIds?.length)
      step.recipientAgentIds = [...event.recipientAgentIds];
    if (kind === "tool" && step.error === undefined && event.error) step.error = event.error;
    if (kind === "tool" && step.activity === undefined && event.activity) step.activity = event.activity;
    if (kind === "tool" && event.targets?.length) step.targets = mergeTraceTargets(step.targets, event.targets);
    if (event.completed && step.endedAt === null) step.endedAt = now;
    if (event.completed && event.failed) step.failed = true;
    if (step.kind === "tool" && (event.tool || event.result)) {
      const outcome = trace.outcomes.get(itemId);
      trace.outcomes.set(itemId, {
        tool: outcome?.tool ?? event.tool ?? null,
        result: event.result ?? outcome?.result ?? null,
      });
    }
  }

  hasStepInput(turnId: string, itemId: string): boolean {
    return this.#turns.get(turnId)?.stepInputs.has(itemId) === true;
  }

  keepStepInput(turnId: string, itemId: string, parts: StepInputParts): void {
    const trace = this.#turns.get(turnId);
    if (!trace?.steps.has(itemId)) return;
    if (parts.input === undefined && parts.diffs === undefined) return;
    trace.stepInputs.set(itemId, { ...trace.stepInputs.get(itemId), ...parts });
  }

  takeStepInput(turnId: string, itemId: string): { started: StepInputParts | undefined; usedBytes: number } | null {
    const trace = this.#turns.get(turnId);
    if (!trace?.steps.has(itemId)) return null;
    const started = trace.stepInputs.get(itemId);
    trace.stepInputs.delete(itemId);
    return { started, usedBytes: trace.detailBytes };
  }

  addDetailBytes(turnId: string, bytes: number): void {
    const trace = this.#turns.get(turnId);
    if (trace) trace.detailBytes += bytes;
  }

  toolOutcomes(turnId: string): ReadonlyMap<string, ToolOutcome> {
    return this.#turns.get(turnId)?.outcomes ?? new Map();
  }

  take(turnId: string, endedAt: string): ConversationTurnTrace | null {
    const trace = this.#turns.get(turnId);
    this.#turns.delete(turnId);
    if (!trace) return null;
    return { startedAt: trace.startedAt, endedAt, steps: [...trace.steps.values()] };
  }

  drop(turnId: string): void {
    this.#turns.delete(turnId);
  }

  clear(): void {
    this.#turns.clear();
  }
}

export function traceMessage(
  messages: readonly ConversationMessage[],
  turnId: string,
): ConversationMessage | undefined {
  let thinking: ConversationMessage | undefined;
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message?.author !== "assistant" || message.turnId !== turnId) continue;
    if (message.itemType === "commentary") {
      thinking ??= message;
      continue;
    }
    if (
      message.itemType === "question_prompt" ||
      message.itemType === CONVERSATION_PLAN_ITEM_TYPE ||
      message.itemType === CONVERSATION_SUBAGENTS_ITEM_TYPE ||
      message.itemType === CONVERSATION_MEMORY_CHANGES_ITEM_TYPE
    )
      continue;
    if (message.text.trim()) return message;
  }
  return thinking;
}
