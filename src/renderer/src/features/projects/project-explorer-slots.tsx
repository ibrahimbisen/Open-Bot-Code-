import type { ExplorerScope, ProjectSummary } from "@codebot/contracts/ipc";
import { EXPLORER_GIT_CHANGES, LOCAL_SERVER_ID } from "@codebot/contracts/ipc";
import { Spinner } from "@codebot/ui";
import { createMemo, Loading, lazy, Show } from "solid-js";
import { z } from "zod";
import { appPort } from "../../app-port";
import type { ExplorerDiffTarget } from "../explorer/explorer-types";
import { useServers } from "../servers/servers-context";
import { type SlotPanelProps, slotPanelContents } from "./project-dock-panels";
import { projectSlots } from "./project-slots";
import { useProjects } from "./projects-context";

const ExplorerTree = lazy(() =>
  import("../explorer/ExplorerTree").then((module) => ({ default: module.ExplorerTree })),
);
const GitPanel = lazy(() => import("../explorer/GitPanel").then((module) => ({ default: module.GitPanel })));
const FilePanel = lazy(() => import("../explorer/FilePanel").then((module) => ({ default: module.FilePanel })));
const DiffViewer = lazy(() => import("../explorer/DiffViewer").then((module) => ({ default: module.DiffViewer })));

function useExplorerTarget(project: () => ProjectSummary | undefined, agentId: () => string | undefined) {
  const projects = useProjects();
  const servers = useServers();
  const serverId = () => servers.activeServer()?.id ?? LOCAL_SERVER_ID;
  const scope = createMemo((): ExplorerScope | null => {
    const id = agentId() ?? project()?.agentIds[0];
    return id ? { agentId: id } : null;
  });
  const openFile = (file: { path: string; name: string }) => {
    const current = project();
    const target = scope();
    if (!current || !target) return;
    projects.dock()?.openSlot({
      kind: "file",
      projectId: current.id,
      title: file.name,
      data: { path: file.path, name: file.name, agentId: target.agentId },
      placement: "active",
    });
  };
  const openDiff = (diff: ExplorerDiffTarget) => {
    const current = project();
    const target = scope();
    if (!current || !target) return;
    projects.dock()?.openSlot({
      kind: "diff",
      projectId: current.id,
      title: diff.label ?? diff.name,
      data: { diff: JSON.stringify(diff), agentId: target.agentId },
      placement: "active",
    });
  };
  return { serverId, scope, openFile, openDiff };
}

function Waiting() {
  return (
    <div class="project-explorer-waiting">
      <Spinner />
    </div>
  );
}

function ProjectTreeSlot(props: { project: ProjectSummary; agentId?: string | undefined }) {
  const target = useExplorerTarget(
    () => props.project,
    () => props.agentId,
  );
  return (
    <div class="project-explorer-slot" data-project-id={props.project.id}>
      <Show when={target.scope()}>
        {(scope) => (
          <Loading fallback={<Waiting />}>
            <ExplorerTree serverId={target.serverId()} scope={scope()} canReveal onOpenFile={target.openFile} />
          </Loading>
        )}
      </Show>
    </div>
  );
}

function ProjectGitSlot(props: { project: ProjectSummary }) {
  const target = useExplorerTarget(
    () => props.project,
    () => undefined,
  );
  return (
    <div class="project-explorer-slot" data-project-id={props.project.id}>
      <Show when={target.scope()}>
        {(scope) => (
          <Loading fallback={<Waiting />}>
            <GitPanel
              serverId={target.serverId()}
              scope={scope()}
              onOpenDiff={target.openDiff}
              onOpenFile={target.openFile}
            />
          </Loading>
        )}
      </Show>
    </div>
  );
}

function FileSlot(props: SlotPanelProps) {
  const servers = useServers();
  const scope = (): ExplorerScope | null => {
    const id = props.params.data.agentId ?? props.project?.agentIds[0];
    return id ? { agentId: id } : null;
  };
  return (
    <div class="project-explorer-slot project-explorer-file" data-project-id={props.params.projectId}>
      <Show when={scope()}>
        {(value) => (
          <Loading fallback={<Waiting />}>
            <FilePanel
              serverId={servers.activeServer()?.id ?? LOCAL_SERVER_ID}
              scope={value()}
              path={props.params.data.path ?? ""}
              name={props.params.data.name ?? props.params.title}
              canReveal
              onOpenLink={(url) => void appPort().openUrl(url)}
            />
          </Loading>
        )}
      </Show>
    </div>
  );
}

const diffTargetSchema = z.object({
  root: z.string(),
  path: z.string(),
  name: z.string(),
  originalPath: z.string().nullable(),
  hash: z.string().nullable(),
  change: z.enum(EXPLORER_GIT_CHANGES),
  label: z.string().nullable(),
});

function parseDiff(value: string | undefined): ExplorerDiffTarget | null {
  if (!value) return null;
  try {
    const parsed = diffTargetSchema.safeParse(JSON.parse(value));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

function DiffSlot(props: SlotPanelProps) {
  const servers = useServers();
  const scope = (): ExplorerScope | null => {
    const id = props.params.data.agentId ?? props.project?.agentIds[0];
    return id ? { agentId: id } : null;
  };
  return (
    <div class="project-explorer-slot project-explorer-file" data-project-id={props.params.projectId}>
      <Show when={scope()}>
        {(value) => (
          <Show when={parseDiff(props.params.data.diff)}>
            {(diff) => (
              <Loading fallback={<Waiting />}>
                <DiffViewer serverId={servers.activeServer()?.id ?? LOCAL_SERVER_ID} scope={value()} target={diff()} />
              </Loading>
            )}
          </Show>
        )}
      </Show>
    </div>
  );
}

projectSlots.projectFiles = (props) => <ProjectTreeSlot project={props.project} />;
projectSlots.projectGit = (props) => <ProjectGitSlot project={props.project} />;
projectSlots.chatFileTree = (props) => <ProjectTreeSlot project={props.project} agentId={props.chat?.agentId} />;
slotPanelContents.file = (props) => <FileSlot {...props} />;
slotPanelContents.diff = (props) => <DiffSlot {...props} />;
