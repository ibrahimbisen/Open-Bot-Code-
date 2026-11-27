import {
  type AvatarColor,
  PROJECT_LIMITS,
  type ProjectAccessLevel,
  type ProjectAgent,
  type ProjectDetail,
  type ProjectRuntime,
} from "@codebot/contracts/ipc";
import {
  Alert,
  AlertContent,
  AlertDescription,
  AlertIcon,
  Button,
  ConfirmDialog,
  Dialog,
  Field,
  FolderOpen,
  IconButton,
  Input,
  OctagonX,
  Pencil,
  Plus,
  Tabs,
  Textarea,
  Trash2,
  X,
} from "@codebot/ui";
import { useText } from "@codebot/ui/text";
import { createEffect, createSignal, For, Show, untrack } from "solid-js";
import { AccessLevelPicker, ProjectColorPicker } from "./ProjectFormParts";
import { ProjectModelPicker } from "./ProjectModelPicker";
import { FALLBACK_RUNTIME } from "./project-runtime";
import { projectSlots } from "./project-slots";
import { useProjects } from "./projects-context";

const SECTIONS = ["general", "folders", "agents", "danger"] as const;
type Section = (typeof SECTIONS)[number];

export function ProjectSettingsDialog(props: { projectId: string; onClose: () => void }) {
  const { t } = useText();
  const projects = useProjects();
  const [section, setSection] = createSignal<Section>("general");
  const project = () => projects.project(props.projectId);
  const detail = () => projects.detailOf(props.projectId);

  createEffect(
    () => props.projectId,
    (id) => {
      void projects.loadDetail(id);
    },
  );

  return (
    <Dialog.Root
      open={true}
      onOpenChange={(open) => {
        if (!open) props.onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay>
          <Dialog.Content class="project-dialog project-settings-dialog" as="section">
            <header class="project-dialog-header">
              <Dialog.Title class="project-dialog-title">{t("project.settings.title")}</Dialog.Title>
              <Dialog.Description class="project-dialog-description">
                {t("project.settings.description", { name: project()?.name ?? "" })}
              </Dialog.Description>
            </header>
            <Show when={project()}>
              {(current) => (
                <Tabs.Root
                  value={section()}
                  onChange={(value) => {
                    const next = SECTIONS.find((entry) => entry === value);
                    if (next) setSection(next);
                  }}
                  class="project-settings-tabs"
                >
                  <Tabs.List aria-label={t("project.settings.sections")} class="project-settings-tab-list">
                    <Tabs.Trigger value="general">{t("project.settings.general")}</Tabs.Trigger>
                    <Tabs.Trigger value="folders">{t("project.settings.folders")}</Tabs.Trigger>
                    <Tabs.Trigger value="agents">{t("project.settings.agents")}</Tabs.Trigger>
                    <Tabs.Trigger value="danger">{t("project.settings.danger")}</Tabs.Trigger>
                  </Tabs.List>
                  <Tabs.Content value="general" class="project-settings-panel">
                    <GeneralSection projectId={current().id} />
                  </Tabs.Content>
                  <Tabs.Content value="folders" class="project-settings-panel">
                    <FoldersSection projectId={current().id} detail={detail()} />
                  </Tabs.Content>
                  <Tabs.Content value="agents" class="project-settings-panel">
                    <AgentsSection projectId={current().id} detail={detail()} />
                  </Tabs.Content>
                  <Tabs.Content value="danger" class="project-settings-panel">
                    <DangerSection projectId={current().id} onClose={props.onClose} />
                  </Tabs.Content>
                </Tabs.Root>
              )}
            </Show>
            <footer class="project-dialog-actions">
              <Button type="button" variant="secondary" onClick={props.onClose}>
                {t("common.close")}
              </Button>
            </footer>
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function ErrorLine(props: { message: string | null }) {
  return (
    <Show when={props.message}>
      {(message) => (
        <Alert tone="danger" role="alert">
          <AlertIcon>
            <OctagonX />
          </AlertIcon>
          <AlertContent>
            <AlertDescription>{message()}</AlertDescription>
          </AlertContent>
        </Alert>
      )}
    </Show>
  );
}

function GeneralSection(props: { projectId: string }) {
  const { t, errorMessage } = useText();
  const projects = useProjects();
  const current = () => projects.project(props.projectId);
  const initial = untrack(current);
  const [name, setName] = createSignal(initial?.name ?? "");
  const [color, setColor] = createSignal<AvatarColor | null>(initial?.color ?? null);
  const [level, setLevel] = createSignal<ProjectAccessLevel>(initial?.accessLevel ?? "normal");
  const [runtime, setRuntime] = createSignal<ProjectRuntime | null>(initial?.defaultRuntime ?? null);
  const [instructions, setInstructions] = createSignal(initial?.instructions ?? "");
  const [replyRule, setReplyRule] = createSignal<string | null>(initial?.replyRule ?? null);
  const [busy, setBusy] = createSignal(false);
  const [saved, setSaved] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const shownRuntime = (): ProjectRuntime => runtime() ?? current()?.defaultRuntime ?? FALLBACK_RUNTIME;

  async function save(): Promise<void> {
    if (busy() || !name().trim()) return;
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      await projects.updateProject({
        projectId: props.projectId,
        name: name().trim(),
        color: color(),
        accessLevel: level(),
        defaultRuntime: runtime(),
        instructions: instructions(),
        replyRule: replyRule(),
      });
      setSaved(true);
    } catch (cause) {
      setError(errorMessage(cause, t("project.settings.failed")));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      class="project-dialog-form"
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
    >
      <Field label={t("project.field.name")} htmlFor="project-settings-name">
        <Input
          id="project-settings-name"
          autocomplete="off"
          value={name()}
          maxlength={PROJECT_LIMITS.name}
          onValueChange={(value) => {
            setName(value);
            setSaved(false);
          }}
        />
      </Field>
      <Field label={t("project.field.access")} description={t("project.field.accessNote")}>
        <AccessLevelPicker
          value={level()}
          onChange={(value) => {
            setLevel(value);
            setSaved(false);
          }}
        />
      </Field>
      <Field label={t("project.field.color")}>
        <ProjectColorPicker
          value={color()}
          onChange={(value) => {
            setColor(value);
            setSaved(false);
          }}
        />
      </Field>
      <Field label={t("project.field.model")} description={t("project.field.modelHint")}>
        <ProjectModelPicker
          variant="field"
          runtime={shownRuntime()}
          label={t("project.field.model")}
          onChange={(value) => {
            setRuntime(value);
            setSaved(false);
          }}
        />
      </Field>
      <Field
        label={t("project.field.instructions")}
        htmlFor="project-settings-instructions"
        description={t("project.field.instructionsHint")}
      >
        <Textarea
          id="project-settings-instructions"
          rows={4}
          value={instructions()}
          maxlength={PROJECT_LIMITS.instructions}
          onValueChange={(value) => {
            setInstructions(value);
            setSaved(false);
          }}
        />
      </Field>
      <Show when={projectSlots.settingsReplyRule}>
        {(slot) => {
          const entry = current();
          return entry
            ? slot()({
                project: entry,
                value: replyRule(),
                disabled: busy(),
                onChange: (value) => {
                  setReplyRule(value);
                  setSaved(false);
                },
              })
            : null;
        }}
      </Show>
      <ErrorLine message={error()} />
      <div class="project-settings-save">
        <Button type="submit" variant="default" loading={busy()} disabled={busy() || !name().trim()}>
          {t("project.settings.save")}
        </Button>
        <Show when={saved()}>
          <span class="project-settings-saved" role="status">
            {t("project.settings.saved")}
          </span>
        </Show>
      </div>
    </form>
  );
}

function FoldersSection(props: { projectId: string; detail: ProjectDetail | undefined }) {
  const { t, errorMessage } = useText();
  const projects = useProjects();
  const [error, setError] = createSignal<string | null>(null);
  const [busy, setBusy] = createSignal(false);

  async function run(action: () => Promise<void>): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (cause) {
      setError(errorMessage(cause, t("project.field.folderFailed")));
    } finally {
      setBusy(false);
    }
  }

  const changeMain = () =>
    run(async () => {
      const choice = await projects.chooseFolder(props.projectId);
      if (choice.outcome === "chosen")
        await projects.updateProject({ projectId: props.projectId, mainFolder: choice.path });
      else if (choice.outcome === "refused") setError(t("project.field.folderFailed"));
    });

  const addMore = () =>
    run(async () => {
      const choice = await projects.chooseFolder(props.projectId);
      if (choice.outcome === "chosen") {
        const change = await projects.addFolder(props.projectId, choice.path);
        if (change.outcome === "refused") setError(t("project.field.folderFailed"));
      } else if (choice.outcome === "refused") setError(t("project.field.folderFailed"));
    });

  return (
    <div class="project-dialog-form">
      <Field label={t("project.field.mainFolder")}>
        <div class="project-folder-field">
          <span class="project-folder-path" title={projects.project(props.projectId)?.mainFolder}>
            {projects.project(props.projectId)?.mainFolder}
          </span>
          <Button type="button" variant="secondary" disabled={busy()} onClick={() => void changeMain()}>
            <FolderOpen />
            {t("project.field.changeFolder")}
          </Button>
        </div>
      </Field>
      <Field label={t("project.field.folders")} description={t("project.field.foldersHint")}>
        <ul class="project-folder-list">
          <For each={props.detail?.folders.filter((folder) => !folder.main) ?? []}>
            {(folder) => (
              <li class="project-folder-item">
                <span class="project-folder-path" title={folder.path} data-missing={folder.found ? undefined : ""}>
                  {folder.path}
                </span>
                <IconButton
                  label={t("project.field.removeFolder", { folder: folder.path })}
                  size="icon-sm"
                  variant="ghost"
                  disabled={busy()}
                  onClick={() =>
                    void run(async () => {
                      await projects.removeFolder(props.projectId, folder.path);
                    })
                  }
                >
                  <X />
                </IconButton>
              </li>
            )}
          </For>
        </ul>
        <Button type="button" variant="secondary" disabled={busy()} onClick={() => void addMore()}>
          <Plus />
          {t("project.field.addFolder")}
        </Button>
      </Field>
      <ErrorLine message={error()} />
    </div>
  );
}

function AgentsSection(props: { projectId: string; detail: ProjectDetail | undefined }) {
  const { t, errorMessage } = useText();
  const projects = useProjects();
  const [editing, setEditing] = createSignal<ProjectAgent | null>(null);
  const [adding, setAdding] = createSignal(false);
  const [removing, setRemoving] = createSignal<ProjectAgent | null>(null);
  const [error, setError] = createSignal<string | null>(null);
  const agents = () => props.detail?.agents ?? [];

  return (
    <div class="project-dialog-form">
      <Show
        when={adding() || editing() !== null}
        fallback={
          <>
            <ul class="project-agent-list">
              <For each={agents()}>
                {(agent) => (
                  <li class="project-agent-item">
                    <span class="project-agent-text">
                      <span class="project-agent-name">{agent.name}</span>
                      <span class="project-agent-role">{agent.role}</span>
                    </span>
                    <IconButton
                      label={t("project.agent.edit", { name: agent.name })}
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => setEditing(agent)}
                    >
                      <Pencil />
                    </IconButton>
                    <IconButton
                      label={t("project.agent.remove", { name: agent.name })}
                      size="icon-sm"
                      variant="ghost"
                      disabled={agents().length <= 1}
                      title={agents().length <= 1 ? t("project.agent.last") : undefined}
                      onClick={() => setRemoving(agent)}
                    >
                      <Trash2 />
                    </IconButton>
                  </li>
                )}
              </For>
            </ul>
            <div>
              <Button type="button" variant="secondary" onClick={() => setAdding(true)}>
                <Plus />
                {t("project.agent.add")}
              </Button>
            </div>
          </>
        }
      >
        <AgentForm
          projectId={props.projectId}
          agent={editing()}
          onDone={() => {
            setEditing(null);
            setAdding(false);
          }}
        />
      </Show>
      <ErrorLine message={error()} />
      <ConfirmDialog
        open={removing() !== null}
        onCancel={() => setRemoving(null)}
        title={t("project.agent.removeTitle")}
        description={t("project.agent.removeDescription", { name: removing()?.name ?? "" })}
        confirmLabel={t("project.agent.removeConfirm")}
        onConfirm={async () => {
          const agent = removing();
          if (!agent) return;
          try {
            await projects.removeAgent(props.projectId, agent.id);
          } catch (cause) {
            setError(errorMessage(cause, t("project.agent.failed")));
          }
          setRemoving(null);
        }}
      />
    </div>
  );
}

function AgentForm(props: { projectId: string; agent: ProjectAgent | null; onDone: () => void }) {
  const { t, errorMessage } = useText();
  const projects = useProjects();
  const [name, setName] = createSignal(props.agent?.name ?? "");
  const [role, setRole] = createSignal(props.agent?.role ?? "");
  const [instructions, setInstructions] = createSignal(props.agent?.instructions ?? "");
  const [runtime, setRuntime] = createSignal<ProjectRuntime | null>(props.agent?.runtime ?? null);
  const [busy, setBusy] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const shownRuntime = (): ProjectRuntime =>
    runtime() ?? projects.project(props.projectId)?.defaultRuntime ?? FALLBACK_RUNTIME;

  async function save(): Promise<void> {
    if (busy() || !role().trim()) return;
    setBusy(true);
    setError(null);
    try {
      const chosen = runtime();
      if (props.agent)
        await projects.updateAgent({
          projectId: props.projectId,
          agentId: props.agent.id,
          name: name(),
          role: role(),
          instructions: instructions(),
          ...(chosen ? { runtime: chosen } : {}),
        });
      else
        await projects.createAgent(props.projectId, {
          name: name(),
          role: role(),
          instructions: instructions(),
          runtime: chosen,
        });
      props.onDone();
    } catch (cause) {
      setError(errorMessage(cause, t("project.agent.failed")));
      setBusy(false);
    }
  }

  return (
    <form
      class="project-dialog-form"
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
    >
      <Field label={t("project.agent.role")} htmlFor="project-agent-role">
        <Input
          id="project-agent-role"
          autocomplete="off"
          placeholder={t("project.agent.rolePlaceholder")}
          value={role()}
          maxlength={PROJECT_LIMITS.agentRole}
          onValueChange={setRole}
        />
      </Field>
      <Field label={t("project.agent.name")} htmlFor="project-agent-name">
        <Input
          id="project-agent-name"
          autocomplete="off"
          value={name()}
          maxlength={PROJECT_LIMITS.agentName}
          onValueChange={setName}
        />
      </Field>
      <Field label={t("project.agent.model")}>
        <ProjectModelPicker
          variant="field"
          runtime={shownRuntime()}
          label={t("project.agent.model")}
          onChange={setRuntime}
        />
      </Field>
      <Field label={t("project.agent.instructions")} htmlFor="project-agent-instructions">
        <Textarea
          id="project-agent-instructions"
          rows={4}
          placeholder={t("project.agent.instructionsPlaceholder")}
          value={instructions()}
          maxlength={PROJECT_LIMITS.agentInstructions}
          onValueChange={setInstructions}
        />
      </Field>
      <ErrorLine message={error()} />
      <div class="project-settings-save">
        <Button type="button" variant="ghost" disabled={busy()} onClick={props.onDone}>
          {t("common.cancel")}
        </Button>
        <Button type="submit" variant="default" loading={busy()} disabled={busy() || !role().trim()}>
          {t("project.agent.save")}
        </Button>
      </div>
    </form>
  );
}

function DangerSection(props: { projectId: string; onClose: () => void }) {
  const { t, errorMessage } = useText();
  const projects = useProjects();
  const [confirming, setConfirming] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const archived = () => projects.project(props.projectId)?.archivedAt !== null;
  return (
    <div class="project-dialog-form">
      <Field label={t("project.settings.archive")} description={t("project.settings.archiveHint")}>
        <div>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              void (archived() ? projects.restoreProject(props.projectId) : projects.archiveProject(props.projectId));
              props.onClose();
            }}
          >
            {t(archived() ? "project.settings.restore" : "project.settings.archive")}
          </Button>
        </div>
      </Field>
      <Field label={t("project.settings.delete")} description={t("project.settings.deleteHint")}>
        <div>
          <Button type="button" variant="destructive" onClick={() => setConfirming(true)}>
            <Trash2 />
            {t("project.settings.delete")}
          </Button>
        </div>
      </Field>
      <ErrorLine message={error()} />
      <ConfirmDialog
        open={confirming()}
        onCancel={() => setConfirming(false)}
        title={t("project.settings.deleteTitle")}
        description={t("project.settings.deleteDescription", {
          name: projects.project(props.projectId)?.name ?? "",
        })}
        confirmLabel={t("project.settings.deleteConfirm")}
        onConfirm={async () => {
          try {
            await projects.deleteProject(props.projectId);
            setConfirming(false);
            props.onClose();
          } catch (cause) {
            setConfirming(false);
            setError(errorMessage(cause, t("project.settings.failed")));
          }
        }}
      />
    </div>
  );
}
