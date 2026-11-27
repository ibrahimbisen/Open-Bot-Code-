import type { ResumableSession } from "@codebot/contracts/ipc";
import { reasoningLabel } from "@codebot/ui/components/ProviderModelPicker";
import { SlashScreenDialog, type SlashScreenOption } from "@codebot/ui/features/conversation/SlashScreenDialog";
import { useText } from "@codebot/ui/text";
import { createEffect, createMemo, createSignal, Show } from "solid-js";
import { useAgentThreads } from "../agent-threads/agent-threads-context";
import { useAgents } from "../agents/agents-context";
import { closeSlashScreen, slashScreenRequest } from "./slash-screen-state";

type LoadState = "loading" | "ready" | "failed";

export function SlashScreenHost() {
  return <Show when={slashScreenRequest()}>{(request) => <SlashScreen request={request()} />}</Show>;
}

function SlashScreen(props: { request: NonNullable<ReturnType<typeof slashScreenRequest>> }) {
  const { t, format, errorMessage } = useText();
  const { agentList, modelOptions, updateAgent } = useAgents();
  const threads = useAgentThreads();
  const agent = createMemo(() => agentList().find((candidate) => candidate.id === props.request.agentId));
  const [state, setState] = createSignal<LoadState>("ready");
  const [error, setError] = createSignal<string | null>(null);
  const [busyId, setBusyId] = createSignal<string | null>(null);
  const [sessions, setSessions] = createSignal<ResumableSession[]>([]);
  const agentModels = createMemo(() => modelOptions().filter((option) => option.provider === agent()?.provider));
  const currentModel = createMemo(() => agentModels().find((option) => option.id === agent()?.model));

  const loadSessions = () => {
    setState("loading");
    setError(null);
    window.codebot.slashCommands.listSessions(props.request.agentId, props.request.serverId).then(
      (list) => {
        setSessions(list.sessions);
        setState("ready");
      },
      () => setState("failed"),
    );
  };
  createEffect(
    () => props.request.screen,
    (screen) => {
      setError(null);
      if (screen === "resume") loadSessions();
      else setState("ready");
    },
  );

  const run = async (id: string, action: () => Promise<void>, failed: string) => {
    setBusyId(id);
    setError(null);
    try {
      await action();
    } catch (cause) {
      setError(errorMessage(cause, failed));
    } finally {
      setBusyId(null);
    }
  };

  const modelOptionsList = (): SlashScreenOption[] =>
    agentModels().map((option) => ({
      id: option.id,
      label: option.name,
      description: option.description || undefined,
      current: option.id === agent()?.model,
    }));
  const chooseModel = (id: string) => {
    const target = agentModels().find((option) => option.id === id);
    const current = agent();
    if (!target || !current || id === current.model) {
      closeSlashScreen();
      return;
    }
    const effort = target.supportedReasoningEfforts.includes(current.reasoningEffort)
      ? {}
      : { reasoningEffort: target.defaultReasoningEffort };
    void run(
      id,
      async () => {
        await updateAgent(current.id, { model: id, ...effort });
        closeSlashScreen();
      },
      t("slash.model.failed"),
    );
  };

  const effortOptions = (): SlashScreenOption[] =>
    (currentModel()?.supportedReasoningEfforts ?? []).map((effort) => ({
      id: effort,
      label: reasoningLabel(effort, t),
      current: effort === agent()?.reasoningEffort,
    }));
  const chooseEffort = (id: string) => {
    const current = agent();
    const effort = currentModel()?.supportedReasoningEfforts.find((candidate) => candidate === id);
    if (!current || !effort || effort === current.reasoningEffort) {
      closeSlashScreen();
      return;
    }
    void run(
      id,
      async () => {
        await updateAgent(current.id, { reasoningEffort: effort });
        closeSlashScreen();
      },
      t("slash.effort.failed"),
    );
  };

  const sessionOptions = (): SlashScreenOption[] =>
    sessions().map((session) => ({
      id: session.sessionId,
      label: session.title || t("slash.resume.untitled"),
      meta: [
        session.gitBranch ? t("slash.resume.branch", { name: session.gitBranch }) : null,
        t("slash.resume.updated", {
          time: format.date(new Date(session.updatedAt), { dateStyle: "medium", timeStyle: "short" }),
        }),
      ]
        .filter((part) => part !== null)
        .join(" · "),
      badge: session.current ? t("slash.resume.inUse") : undefined,
      current: false,
      disabled: session.current,
    }));
  const chooseSession = (id: string) =>
    void run(
      id,
      async () => {
        const result = await window.codebot.slashCommands.resumeSession(
          { agentId: props.request.agentId, sessionId: id },
          props.request.serverId,
        );
        closeSlashScreen();
        threads.open(props.request.agentId, result.task.id);
      },
      t("slash.resume.openFailed"),
    );

  const name = () => agent()?.name ?? "";
  const screen = createMemo(() => {
    const kind = props.request.screen;
    if (kind === "model")
      return {
        title: t("slash.model.title"),
        description: t("slash.model.description", { name: name() }),
        options: modelOptionsList(),
        empty: t("slash.model.empty"),
        choose: chooseModel,
      };
    if (kind === "effort")
      return {
        title: t("slash.effort.title"),
        description: t("slash.effort.description", { name: name() }),
        options: effortOptions(),
        empty: t("slash.effort.unsupported"),
        choose: chooseEffort,
      };
    return {
      title: t("slash.resume.title"),
      description: t("slash.resume.description", { name: name() }),
      options: sessionOptions(),
      empty: t("slash.resume.empty"),
      choose: chooseSession,
    };
  });

  return (
    <SlashScreenDialog
      open={true}
      onOpenChange={(open) => {
        if (!open) closeSlashScreen();
      }}
      title={screen().title}
      description={screen().description}
      options={screen().options}
      status={state()}
      emptyText={screen().empty}
      failedText={t("slash.resume.failed")}
      busyId={busyId()}
      error={error()}
      onChoose={screen().choose}
      onRetry={props.request.screen === "resume" ? loadSessions : undefined}
    />
  );
}
