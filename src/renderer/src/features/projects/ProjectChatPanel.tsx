import {
  type AgentApproval,
  type AgentTask,
  LOCAL_SERVER_ID,
  type ProjectChat,
  type ProjectRuntime,
  type ProjectSummary,
} from "@codebot/contracts/ipc";
import { taskApproval } from "@codebot/team-client/agent-tasks";
import { Folder, IconButton, NativeSelect, Spinner, X } from "@codebot/ui";
import type { AgentMessage } from "@codebot/ui/data";
import { AgentThreadView } from "@codebot/ui/features/conversation/threads/AgentThreadView";
import { useText } from "@codebot/ui/text";
import type { DockviewPanelApi } from "dockview-core";
import { createEffect, createMemo, createProjection, createSignal, Loading, onSettled, Show, untrack } from "solid-js";
import { actionToast } from "../../action-toast";
import { useShowAgentSteps } from "../../agent-steps-preference";
import { toAgentMessages } from "../../app-message-projection";
import { appPort } from "../../app-port";
import { useChatBubbleStyle } from "../../chat-bubble-style-preference";
import { useCompactMessageActions } from "../../compact-message-actions-preference";
import { usePlatform } from "../../platform";
import { useTurns } from "../../turns";
import { useAgentTasks } from "../agent-tasks/agent-tasks-context";
import { attentionKey } from "../agents/agent-runtime-snapshot";
import { useAgents } from "../agents/agents-context";
import { QuestionPromptBubble } from "../conversation/conversation-cards";
import { latestVisibleAgentMessageId } from "../conversation/conversation-read-state";
import { stepDetailsLoader } from "../conversation/step-details-loader";
import { createTurnSteps } from "../conversation/turn-steps";
import { useTurnTrace } from "../conversation/turn-trace";
import { useServers } from "../servers/servers-context";
import { createSlashCommandsFor } from "../slash-commands/slash-commands-source";
import { ProjectModelPicker } from "./ProjectModelPicker";
import { previewOfAttachment, previewOfFile } from "./project-agent-content";
import type { ChatPanelParams } from "./project-dock-panels";
import { FALLBACK_RUNTIME, runtimeOfProfile } from "./project-runtime";
import { projectSlots } from "./project-slots";
import { useProjects } from "./projects-context";

export function ProjectChatPanel(props: { panelId: string; api: DockviewPanelApi; params: ChatPanelParams }) {
  const projects = useProjects();
  const project = () => projects.project(props.params.projectId);
  return (
    <section class="project-chat-panel" data-project-id={props.params.projectId}>
      <Show when={project()} fallback={<div class="project-chat-missing" />}>
        {(entry) => (
          <Show
            when={props.params.chatId !== null && props.params.agentId !== null}
            fallback={<ProjectDraftChat api={props.api} params={props.params} project={entry()} />}
          >
            <ProjectOpenChat api={props.api} params={props.params} project={entry()} />
          </Show>
        )}
      </Show>
    </section>
  );
}

function PanelHeader(props: {
  project: ProjectSummary;
  title: string;
  agentId: string | null;
  agentLocked: boolean;
  runtime: ProjectRuntime;
  working: boolean;
  onRuntime: (runtime: ProjectRuntime) => void;
  onAgent: (agentId: string) => void;
  onClose: () => void;
  treeOpen: boolean;
  onToggleTree: () => void;
}) {
  const { t } = useText();
  const projects = useProjects();
  const detail = () => projects.detailOf(props.project.id);
  const agentName = () => detail()?.agents.find((agent) => agent.id === props.agentId);
  return (
    <header class="project-panel-header">
      <span class="project-panel-project" title={props.project.mainFolder}>
        <span
          class="project-color-dot"
          style={props.project.color ? { "background-color": props.project.color } : undefined}
          aria-hidden="true"
        />
        <span class="project-panel-project-name">{props.project.name}</span>
      </span>
      <Show
        when={!props.agentLocked && (detail()?.agents.length ?? 0) > 1}
        fallback={
          <Show when={agentName()}>
            {(agent) => (
              <span class="project-panel-agent">
                {agent().role && agent().role !== agent().name ? `${agent().name} · ${agent().role}` : agent().name}
              </span>
            )}
          </Show>
        }
      >
        <NativeSelect
          size="sm"
          class="project-panel-agent-select"
          aria-label={t("panel.draft.agent")}
          value={props.agentId ?? ""}
          onChange={(event) => props.onAgent(event.currentTarget.value)}
        >
          {detail()?.agents.map((agent) => (
            <option value={agent.id}>
              {agent.role && agent.role !== agent.name ? `${agent.name} · ${agent.role}` : agent.name}
            </option>
          ))}
        </NativeSelect>
      </Show>
      <span class="project-panel-title">{props.title}</span>
      <Show when={props.working}>
        <Spinner class="project-panel-spinner" />
      </Show>
      <ProjectModelPicker runtime={props.runtime} label={t("panel.header.model")} onChange={props.onRuntime} />
      <Show when={projectSlots.chatFileTree !== undefined}>
        <IconButton
          label={t("panel.header.files")}
          size="icon-sm"
          variant="ghost"
          aria-pressed={props.treeOpen ? "true" : "false"}
          onClick={props.onToggleTree}
        >
          <Folder />
        </IconButton>
      </Show>
      <IconButton label={t("panel.close")} size="icon-sm" variant="ghost" onClick={props.onClose}>
        <X />
      </IconButton>
    </header>
  );
}

function useRuntimeFor(
  project: () => ProjectSummary,
  agentId: () => string | null,
  chat: () => ProjectChat | undefined,
): () => ProjectRuntime {
  const projects = useProjects();
  const agents = useAgents();
  return () => {
    const own = chat()?.runtime;
    if (own) return own;
    const detail = projects.detailOf(project().id);
    const projectAgent = detail?.agents.find((agent) => agent.id === agentId());
    if (projectAgent) return projectAgent.runtime;
    if (project().defaultRuntime) return project().defaultRuntime ?? FALLBACK_RUNTIME;
    return runtimeOfProfile(agents.agentList().find((agent) => agent.id === agentId()));
  };
}

function ProjectDraftChat(props: { api: DockviewPanelApi; params: ChatPanelParams; project: ProjectSummary }) {
  const { t } = useText();
  const projects = useProjects();
  const detail = () => projects.detailOf(props.project.id);
  const [agentId, setAgentId] = createSignal<string | null>(props.params.agentId);
  const [runtimeChoice, setRuntimeChoice] = createSignal<ProjectRuntime | null>(null);
  const chosenAgent = () => agentId() ?? detail()?.agents[0]?.id ?? null;
  const defaultRuntime = useRuntimeFor(
    () => props.project,
    chosenAgent,
    () => undefined,
  );
  const runtime = () => runtimeChoice() ?? defaultRuntime();
  const [sending, setSending] = createSignal(false);
  const [treeOpen, setTreeOpen] = createSignal(false);
  const draftKey = `draft:${props.api.id}`;
  const agents = useAgents();
  const profile = () => agents.agentList().find((agent) => agent.id === chosenAgent());
  const draftText = () => projects.state.drafts[draftKey] ?? "";

  async function send(text: string): Promise<boolean> {
    const agent = chosenAgent();
    if (!agent || sending()) return false;
    setSending(true);
    const chat = await projects.startChat({
      projectId: props.project.id,
      agentId: agent,
      text,
      runtime: runtimeChoice(),
    });
    setSending(false);
    if (!chat) return false;
    projects.setDraft(draftKey, "");
    props.api.updateParameters({ agentId: chat.agentId, chatId: chat.taskId });
    props.api.setTitle(chat.title || t("project.chat.untitled"));
    return true;
  }

  return (
    <>
      <PanelHeader
        project={props.project}
        title={t("project.chat.new")}
        agentId={chosenAgent()}
        agentLocked={false}
        runtime={runtime()}
        working={sending()}
        onRuntime={setRuntimeChoice}
        onAgent={(id) => {
          setAgentId(id);
          setRuntimeChoice(null);
          props.api.updateParameters({ agentId: id });
        }}
        onClose={() => props.api.close()}
        treeOpen={treeOpen()}
        onToggleTree={() => setTreeOpen((open) => !open)}
      />
      <div class="project-panel-body">
        <Show when={treeOpen() && projectSlots.chatFileTree}>
          {(Tree) => (
            <aside class="project-panel-tree">
              {Tree()({
                get project() {
                  return props.project;
                },
                chat: null,
                onClose: () => setTreeOpen(false),
              })}
            </aside>
          )}
        </Show>
        <Show when={profile()} fallback={<div class="project-chat-missing">{t("panel.chat.noAgent")}</div>}>
          {(agent) => (
            <ThreadSurface
              projectId={props.project.id}
              agentId={agent().id}
              task={null}
              messages={[]}
              draft={draftText()}
              onDraftChange={(text) => projects.setDraft(draftKey, text)}
              onSend={send}
              onStop={() => undefined}
              approval={undefined}
              onRespondApproval={() => Promise.resolve(false)}
              waitsForAnswer={false}
              attention={undefined}
              onRead={() => undefined}
              steps={undefined}
            />
          )}
        </Show>
      </div>
    </>
  );
}

function ProjectOpenChat(props: { api: DockviewPanelApi; params: ChatPanelParams; project: ProjectSummary }) {
  const { t } = useText();
  const projects = useProjects();
  const tasks = useAgentTasks();
  const turns = useTurns();
  const agentId = () => props.params.agentId ?? "";
  const taskId = () => props.params.chatId ?? "";
  const task = (): AgentTask | undefined => tasks.snapshot(agentId())?.tasks.find((entry) => entry.id === taskId());
  const chat = createMemo((): ProjectChat | undefined =>
    [...projects.listOf(props.project.id, false).chats, ...projects.listOf(props.project.id, true).chats].find(
      (entry) => entry.taskId === taskId(),
    ),
  );
  const [treeOpen, setTreeOpen] = createSignal(false);
  const runtime = useRuntimeFor(() => props.project, agentId, chat);
  const agents = useAgents();
  const profile = () => agents.agentList().find((agent) => agent.id === agentId());
  const [visible, setVisible] = createSignal(props.api.isVisible);

  onSettled(() => {
    const stop = props.api.onDidVisibilityChange((event) => setVisible(event.isVisible));
    return () => stop.dispose();
  });

  createEffect(
    () => ({ agent: agentId(), id: taskId(), loaded: tasks.conversation(taskId()) !== undefined }),
    ({ agent, id, loaded }) => {
      if (agent && id && !loaded) tasks.openTask(agent, id);
    },
  );

  createEffect(
    () => task()?.title,
    (title) => {
      props.api.setTitle(title || t("project.chat.untitled"));
    },
  );

  createEffect(
    () => visible() && agentId() !== "" && taskId() !== "",
    (shown) => {
      if (!shown) return;
      const latest = untrack(() => {
        const conversation = tasks.conversation(taskId());
        return conversation ? latestVisibleAgentMessageId(toAgentMessages(conversation.messages, agentId())) : null;
      });
      if (latest) void projects.markChatShown({ agentId: agentId(), taskId: taskId(), throughMessageId: latest });
    },
  );

  const messages = createProjection<AgentMessage[]>(
    () => {
      const conversation = tasks.conversation(taskId());
      const list = conversation?.messages.filter((message) => message.questionPrompt?.resolution !== null);
      return list ? toAgentMessages(list, agentId()) : [];
    },
    [],
    { key: "id" },
  );

  const approval = () => {
    const current = task();
    return current ? taskApproval(current, turns.approvals()) : undefined;
  };
  const prompt = () => {
    const current = task();
    const event = current ? turns.pendingPrompts()[attentionKey(agentId(), current.threadId)] : undefined;
    return event?.type === "prompt" && event.threadId === current?.threadId ? event : undefined;
  };

  async function send(text: string): Promise<boolean> {
    const current = task();
    if (!current) return false;
    if (current.state === "closed" && !(await tasks.reopenTask(agentId(), current.id))) return false;
    return tasks.sendToTask(agentId(), current.id, text);
  }

  const working = () => {
    const state = task()?.state;
    return state === "running" || state === "queued";
  };

  return (
    <>
      <PanelHeader
        project={props.project}
        title={task()?.title ?? chat()?.title ?? ""}
        agentId={agentId()}
        agentLocked={true}
        runtime={runtime()}
        working={working()}
        onRuntime={(next) =>
          void projects.setChatRuntime({ projectId: props.project.id, agentId: agentId(), taskId: taskId() }, next)
        }
        onAgent={() => undefined}
        onClose={() => props.api.close()}
        treeOpen={treeOpen()}
        onToggleTree={() => setTreeOpen((open) => !open)}
      />
      <div class="project-panel-body">
        <Show when={treeOpen() && projectSlots.chatFileTree}>
          {(Tree) => (
            <aside class="project-panel-tree">
              {Tree()({
                get project() {
                  return props.project;
                },
                get chat() {
                  return { agentId: agentId(), chatId: taskId() };
                },
                onClose: () => setTreeOpen(false),
              })}
            </aside>
          )}
        </Show>
        <Show
          when={profile() && task()}
          fallback={
            <div class="project-chat-missing">
              <Loading>
                <Spinner />
              </Loading>
            </div>
          }
        >
          <ThreadSurface
            projectId={props.project.id}
            agentId={agentId()}
            task={task() ?? null}
            messages={messages}
            draft={projects.state.drafts[taskId()] ?? ""}
            onDraftChange={(text) => projects.setDraft(taskId(), text)}
            onSend={send}
            onStop={() => tasks.stopTask(agentId(), taskId())}
            approval={approval()}
            onRespondApproval={(decision) => {
              const current = approval();
              return current
                ? turns.respondToApprovalRequest(current.agentId, current.requestId, decision)
                : Promise.resolve(false);
            }}
            waitsForAnswer={prompt() !== undefined}
            attention={
              <Show when={prompt()}>
                {(event) => (
                  <QuestionPromptBubble
                    questions={event().questions}
                    onSubmit={(answers) =>
                      turns.answerPromptRequest(agentId(), event().threadId ?? null, event().requestId, answers)
                    }
                    onOpenLink={(url) => void appPort().openUrl(url)}
                  />
                )}
              </Show>
            }
            onRead={(messageId) => tasks.markTaskRead(agentId(), taskId(), messageId)}
            steps
          />
        </Show>
      </div>
    </>
  );
}

function ThreadSurface(props: {
  projectId: string;
  agentId: string;
  task: AgentTask | null;
  messages: readonly AgentMessage[];
  draft: string;
  onDraftChange: (text: string) => void;
  onSend: (text: string) => Promise<boolean>;
  onStop: () => void;
  approval: AgentApproval | undefined;
  onRespondApproval: (decision: "accept" | "decline") => Promise<boolean>;
  waitsForAnswer: boolean;
  attention: import("@solidjs/web").JSX.Element;
  onRead: (messageId: string) => void;
  steps: unknown;
}) {
  const agents = useAgents();
  const projects = useProjects();
  const tasks = useAgentTasks();
  const platform = usePlatform();
  const showAgentSteps = useShowAgentSteps();
  const compactMessageActions = useCompactMessageActions();
  const bubbleStyle = useChatBubbleStyle();
  const profile = () => agents.agentList().find((agent) => agent.id === props.agentId);
  const servers = useServers();
  const slash = createSlashCommandsFor(() => ({
    agentId: props.agentId,
    taskId: props.task?.id,
    serverId: servers.activeServer()?.id ?? LOCAL_SERVER_ID,
  }));
  const turnSteps = createTurnSteps({
    messages: () => props.messages,
    lines: () => undefined,
    activeTurnId: () => props.task?.activeTurnId,
  });
  const turnTrace = useTurnTrace({
    turnSteps,
    agentName: () => profile()?.name,
    agents: () => agents.agentList(),
  });
  createEffect(
    () => ({
      messageId: platform.appFocused() ? latestVisibleAgentMessageId(props.messages) : null,
      read: props.task !== null,
    }),
    ({ messageId, read }) => {
      if (messageId && read) props.onRead(messageId);
    },
  );
  return (
    <Show when={profile()}>
      {(agent) => (
        <div class="project-thread">
          <AgentThreadView
            task={props.task}
            limit={tasks.snapshot(props.agentId)?.limit ?? 1}
            agent={agent()}
            agents={agents.agentList()}
            messages={props.messages}
            slashCommands={slash.commands()}
            onSlashScreen={slash.openScreen}
            draft={props.draft}
            onDraftChange={props.onDraftChange}
            onSend={props.onSend}
            onStop={props.onStop}
            onOpenLink={(url) => void appPort().openUrl(url)}
            onPreview={(attachment) =>
              projects
                .dock()
                ?.openContent(
                  previewOfAttachment(
                    props.projectId,
                    { agentId: props.agentId, chatId: props.task?.id ?? null },
                    attachment,
                  ),
                )
            }
            onOpenFile={(kind, agentId, path) =>
              projects
                .dock()
                ?.openContent(
                  previewOfFile(
                    props.projectId,
                    { agentId: props.agentId, chatId: props.task?.id ?? null },
                    { kind, agentId, path },
                  ),
                )
            }
            onAttachmentAction={() => undefined}
            approval={props.approval}
            onRespondApproval={props.onRespondApproval}
            waitsForAnswer={props.waitsForAnswer}
            attention={props.attention}
            stepsAbove={turnSteps.stepsAbove}
            factsAbove={turnSteps.factsAbove}
            loadDetailsAbove={(messageId) =>
              stepDetailsLoader({
                agentId: props.agentId,
                turnId: turnSteps.turnIdAbove(messageId),
                server: servers.activeServer(),
                hosted: false,
              })
            }
            traceAbove={turnTrace}
            activeSteps={turnSteps.activeSteps()}
            stepsOpenByDefault={showAgentSteps()}
            compactMessageActions={compactMessageActions()}
            bubbleStyle={bubbleStyle()}
            onCopyMessage={(message) => {
              void navigator.clipboard.writeText(message.body).catch(() => actionToast.error(message.body));
            }}
          />
        </div>
      )}
    </Show>
  );
}
