import type { ConversationMemoryChange, TurnStepDetail } from "@codebot/contracts/ipc";
import { countConversationMemoryChanges } from "@codebot/contracts/ipc";
import type { JSX } from "@solidjs/web";
import { createEffect, createMemo, createSignal, createUniqueId, For, onSettled, Show } from "solid-js";
import { Badge } from "../../badge";
import { Button } from "../../button";
import { Brain, ChevronRight, Puzzle, Sparkles } from "../../icons";
import { type TextValue, useText } from "../../text";
import { prefersReducedMotion } from "../../utils";
import { ActivityShine } from "./ActivityShine";
import { CodeBlock } from "./CodeBlock";
import { useDuration } from "./Subagents";
import { type TraceKeyboard, type TraceSpan, TraceWaterfallDialog } from "./TraceWaterfall";
import { type TurnActivityCounts, turnSummaryLine } from "./turn-summary";

export type AgentStep =
  | { id: string; kind: "thinking"; text: string }
  | {
      id: string;
      kind: "progress";
      text: string;
      error?: string | undefined;
      activity?: string | undefined;
      targets?: readonly string[] | undefined;
      detailId?: string | undefined;
    }
  | { id: string; kind: "memory"; change: ConversationMemoryChange }
  | { id: string; kind: "memory-summary"; text: string };

const STEPS_MAX_HEIGHT = 220;
const DETAILS_MAX_HEIGHT = 480;

export type StepDetails = ReadonlyMap<string, TurnStepDetail>;

const MEMORY_ACTION_LABEL = {
  saved: "chat.steps.saved",
  updated: "chat.steps.updated",
  forgotten: "chat.steps.forgotten",
  notChanged: "chat.steps.notChanged",
} as const;

export function AgentStepList(props: {
  steps: readonly AgentStep[];
  live: boolean;
  id?: string;
  focus?: { id: string } | null | undefined;
  details?: StepDetails | undefined;
  loadingDetails?: boolean | undefined;
}) {
  const { t } = useText();
  const [contentHeight, setContentHeight] = createSignal(0);
  let content: HTMLOListElement | undefined;
  onSettled(() => {
    const element = content;
    if (!element) return;
    const observer = new ResizeObserver(() => setContentHeight(element.offsetHeight));
    observer.observe(element);
    return () => observer.disconnect();
  });
  createEffect(
    () => props.focus,
    (focus) => {
      if (!focus) return;
      const step = content?.querySelector(`[data-step-id="${CSS.escape(focus.id)}"]`);
      step?.scrollIntoView({ block: "center", behavior: prefersReducedMotion() ? "auto" : "smooth" });
    },
  );
  const maxHeight = () => (props.details === undefined ? STEPS_MAX_HEIGHT : DETAILS_MAX_HEIGHT);
  const capped = () => contentHeight() > maxHeight();
  const scrolls = () => !props.live && capped();
  const offset = () => (props.live && capped() ? maxHeight() - contentHeight() : 0);
  return (
    <section
      id={props.id}
      class="agent-steps-viewport"
      aria-label={t("chat.steps.list")}
      data-capped={capped() ? "" : undefined}
      data-scrolls={scrolls() ? "" : undefined}
      tabindex={scrolls() ? 0 : undefined}
      style={{ "max-height": `${maxHeight()}px` }}
    >
      <ol ref={content} class="agent-steps-list" style={{ transform: `translateY(${offset()}px)` }}>
        <For each={props.steps} keyed={(step) => step.id}>
          {(step, index) => (
            <li
              class="agent-step"
              data-kind={step().kind}
              data-step-id={step().id}
              data-focused={props.focus?.id === step().id ? "" : undefined}
            >
              <StepIcon kind={step().kind} />
              <div class="agent-step-main">
                <StepBody step={step()} newest={props.live && index() === props.steps.length - 1} />
                <StepDetailView step={step()} details={props.details} loading={props.loadingDetails === true} />
              </div>
            </li>
          )}
        </For>
      </ol>
    </section>
  );
}

function StepDetailView(props: { step: AgentStep; details: StepDetails | undefined; loading: boolean }) {
  const { t } = useText();
  const detail = () => {
    const step = props.step;
    return step.kind === "progress" && step.detailId !== undefined ? props.details?.get(step.detailId) : undefined;
  };
  const pending = () => props.step.kind === "progress" && props.loading && props.step.detailId !== undefined;
  return (
    <>
      <Show when={pending()}>
        <span class="agent-step-detail-note">{t("reply.details.loading")}</span>
      </Show>
      <Show when={detail()}>
        {(found) => (
          <div class="agent-step-detail">
            <Show when={found().input}>
              {(input) => (
                <StepCode
                  label={t("reply.details.input")}
                  code={input()}
                  language="bash"
                  shortened={found().inputTruncated === true}
                />
              )}
            </Show>
            <Show when={found().output}>
              {(output) => (
                <StepCode
                  label={t("reply.details.output")}
                  code={output()}
                  language="plain"
                  shortened={found().outputTruncated === true}
                />
              )}
            </Show>
            <For each={found().diffs ?? []}>
              {(diff) => (
                <StepCode label={diff.path} code={diff.diff} language="diff" shortened={diff.truncated === true} />
              )}
            </For>
          </div>
        )}
      </Show>
    </>
  );
}

function StepCode(props: { label: string; code: string; language: string; shortened: boolean }) {
  const { t } = useText();
  return (
    <div class="agent-step-code">
      <CodeBlock block={{ type: "code", code: props.code, language: props.language, filename: props.label }} />
      <Show when={props.shortened}>
        <span class="agent-step-detail-note">{t("reply.details.shortened")}</span>
      </Show>
    </div>
  );
}

function StepBody(props: { step: AgentStep; newest: boolean }) {
  const text = useText();
  const failure = () => (props.step.kind === "progress" && props.step.error ? props.step : undefined);
  return (
    <Show when={failure()} fallback={stepBody(props.step, props.newest, text)}>
      {(step) => <FailedStep text={text.sourceText(step().text)} error={step().error} newest={props.newest} />}
    </Show>
  );
}

function stepBody(step: AgentStep, newest: boolean, text: TextValue): JSX.Element {
  if (step.kind === "memory") {
    const change = step.change;
    return (
      <span class="agent-step-memory" data-action={change.action}>
        <span class="agent-step-memory-action">{text.t(MEMORY_ACTION_LABEL[change.action])}</span>
        <Show when={change.previousText}>
          {(previous) => (
            <s class="agent-step-memory-previous" dir="auto">
              {previous()}
            </s>
          )}
        </Show>
        {change.action === "forgotten" ? <s dir="auto">{change.text}</s> : <span dir="auto">{change.text}</span>}
      </span>
    );
  }
  if (step.kind === "thinking") {
    return (
      <span class={["agent-step-text", { "agent-activity-label": newest }]} dir="auto">
        {step.text}
        {newest && <ActivityShine text={step.text} />}
      </span>
    );
  }
  const label = text.sourceText(step.text);
  return (
    <span class={["agent-step-text", { "agent-activity-label": newest }]}>
      {label}
      {newest && <ActivityShine text={label} />}
    </span>
  );
}

function FailedStep(props: { text: string; error: string | undefined; newest: boolean }) {
  const { t } = useText();
  const outputId = createUniqueId();
  const [open, setOpen] = createSignal(false);
  const expanded = () => (open() ? "true" : "false");
  const controls = () => (open() ? outputId : undefined);
  const label = () => t(open() ? "chat.steps.hideError" : "chat.steps.showError");
  return (
    <div class="agent-step-failed">
      <span class={["agent-step-text", { "agent-activity-label": props.newest }]}>
        {props.text}
        <Show when={props.newest}>
          <ActivityShine text={props.text} />
        </Show>
      </span>
      <Button
        type="button"
        variant="ghost"
        class="agent-step-error-toggle"
        aria-expanded={expanded()}
        aria-controls={controls()}
        onClick={() => setOpen(!open())}
      >
        <ChevronRight class="agent-steps-chevron" aria-hidden="true" />
        {label()}
      </Button>
      <Show when={open()}>
        <pre id={outputId} class="agent-step-error" dir="auto">
          {props.error}
        </pre>
      </Show>
    </div>
  );
}

function StepIcon(props: { kind: AgentStep["kind"] }) {
  return (
    <>
      {props.kind === "thinking" ? (
        <Sparkles class="agent-step-icon" aria-hidden="true" />
      ) : props.kind === "progress" ? (
        <Puzzle class="agent-step-icon" aria-hidden="true" />
      ) : (
        <Brain class="agent-step-icon" aria-hidden="true" />
      )}
    </>
  );
}

function stepsSummary(steps: readonly AgentStep[], text: TextValue, activity: TurnActivityCounts | undefined): string {
  const work = steps.filter((step) => step.kind === "thinking" || step.kind === "progress").length;
  const changes = steps.flatMap((step) => (step.kind === "memory" ? [step.change] : []));
  const counts = countConversationMemoryChanges(changes);
  const memory = text.format.list(
    [
      counts.saved ? text.t("chat.steps.memorySaved", { count: counts.saved }) : null,
      counts.updated ? text.t("chat.steps.memoryUpdated", { count: counts.updated }) : null,
      counts.forgotten ? text.t("chat.steps.memoryForgotten", { count: counts.forgotten }) : null,
      counts.notChanged ? text.t("chat.steps.memoryNotChanged", { count: counts.notChanged }) : null,
    ].filter((part): part is string => part !== null),
  );
  const fallback = steps.find((step) => step.kind === "memory-summary");
  const activityLine = activity ? turnSummaryLine(activity, text) : "";
  return [
    activityLine || (work > 0 ? text.t("chat.steps.count", { count: work }) : null),
    changes.length > 0 ? text.t("chat.steps.memory", { changes: memory }) : null,
    fallback?.kind === "memory-summary" ? text.sourceText(fallback.text) : null,
  ]
    .filter((part): part is string => part !== null)
    .join(" · ");
}

export interface AgentStepsTrace {
  spans: () => readonly TraceSpan[];
  keyboard: TraceKeyboard;
  canSelectSpan?: (id: string) => boolean;
  onSelectSpan?: (id: string) => void;
}

export interface AgentStepsFacts {
  durationMs: number;
  failed: number;
}

export function AgentStepsDisclosure(props: {
  steps: readonly AgentStep[];
  defaultOpen: boolean;
  trace?: AgentStepsTrace | undefined;
  facts?: AgentStepsFacts | undefined;
  activity?: TurnActivityCounts | undefined;
  loadDetails?: (() => Promise<readonly TurnStepDetail[]>) | undefined;
}) {
  const text = useText();
  const duration = useDuration();
  const turnTime = (ms: number) => duration(Math.round(ms / 1_000) * 1_000);
  const panelId = createUniqueId();
  const [choice, setChoice] = createSignal<boolean>();
  const [traceOpenedAt, setTraceOpenedAt] = createSignal<number | null>(null);
  const [traceUsed, setTraceUsed] = createSignal(false);
  const open = () => choice() ?? props.defaultOpen;
  const [details, setDetails] = createSignal<StepDetails>();
  const [loadingDetails, setLoadingDetails] = createSignal(false);
  let detailsRequested = false;
  createEffect(open, (isOpen) => {
    if (!isOpen || detailsRequested || !props.loadDetails) return;
    detailsRequested = true;
    setLoadingDetails(true);
    void props
      .loadDetails()
      .then((loaded) => setDetails(new Map(loaded.map((detail) => [detail.stepId, detail]))))
      .catch(() => setDetails(new Map()))
      .finally(() => setLoadingDetails(false));
  });
  const [focus, setFocus] = createSignal<{ id: string } | null>(null);
  const isStep = (id: string) => props.steps.some((step) => step.id === id);
  const canSelectSpan = (id: string) => isStep(id) || (props.trace?.canSelectSpan?.(id) ?? false);
  const selectSpan = (id: string) => {
    setTraceOpenedAt(null);
    if (!isStep(id)) {
      props.trace?.onSelectSpan?.(id);
      return;
    }
    setChoice(true);
    setFocus({ id });
  };
  const controls = () => {
    if (!open()) return undefined;
    return panelId;
  };
  const activate = () => {
    setFocus(null);
    setChoice(!open());
  };
  const openTrace = () => {
    setTraceUsed(true);
    setTraceOpenedAt(Date.now());
  };
  return (
    <div class="agent-steps" data-open={open() ? "" : undefined}>
      <Button
        type="button"
        variant="ghost"
        class="agent-steps-header"
        aria-expanded={open() ? "true" : "false"}
        aria-controls={controls()}
        onClick={activate}
      >
        <span class="agent-steps-summary">{stepsSummary(props.steps, text, props.activity)}</span>
        <Show when={props.facts}>
          {(facts) => (
            <>
              <Show when={facts().failed > 0}>
                <Badge class="agent-steps-failed">{text.t("chat.steps.failed", { count: facts().failed })}</Badge>
              </Show>
              <span class="agent-steps-duration">{turnTime(facts().durationMs)}</span>
            </>
          )}
        </Show>
        <span class="agent-steps-details-label">{text.t(open() ? "reply.details.hide" : "reply.details.show")}</span>
        <ChevronRight class="agent-steps-chevron" aria-hidden="true" />
      </Button>
      <Show when={traceUsed() && props.trace}>
        {(trace) => {
          const spans = createMemo(() => trace().spans());
          return (
            <TraceWaterfallDialog
              open={traceOpenedAt() !== null}
              onOpenChange={(next) => {
                if (!next) setTraceOpenedAt(null);
              }}
              spans={spans()}
              now={traceOpenedAt() ?? 0}
              keyboard={trace().keyboard}
              canSelectSpan={canSelectSpan}
              onSelectSpan={selectSpan}
            />
          );
        }}
      </Show>
      <Show when={open()}>
        <div class="agent-steps-panel">
          <div class="agent-steps-panel-body">
            <Show when={props.trace}>
              <Button type="button" variant="ghost" size="xs" class="agent-steps-timeline" onClick={openTrace}>
                {text.t("reply.details.timeline")}
              </Button>
            </Show>
            <AgentStepList
              id={panelId}
              steps={props.steps}
              live={false}
              focus={focus()}
              details={details() ?? (props.loadDetails ? new Map() : undefined)}
              loadingDetails={loadingDetails()}
            />
          </div>
        </div>
      </Show>
    </div>
  );
}
