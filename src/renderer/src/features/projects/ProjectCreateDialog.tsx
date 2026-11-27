import { INPUT_LIMITS } from "@codebot/contracts/input-limits";
import {
  type AvatarColor,
  DEFAULT_PROJECT_ACCESS_LEVEL,
  PROJECT_LIMITS,
  type ProjectAccessLevel,
  type ProjectRuntime,
} from "@codebot/contracts/ipc";
import {
  Alert,
  AlertContent,
  AlertDescription,
  AlertIcon,
  Button,
  Dialog,
  Field,
  FolderOpen,
  Input,
  OctagonX,
  Textarea,
} from "@codebot/ui";
import { useText } from "@codebot/ui/text";
import { createSignal, Show } from "solid-js";
import { useAgents } from "../agents/agents-context";
import { AccessLevelPicker, ProjectColorPicker } from "./ProjectFormParts";
import { ProjectModelPicker } from "./ProjectModelPicker";
import { folderBaseName } from "./project-colors";
import { runtimeOfProfile } from "./project-runtime";
import { useProjects } from "./projects-context";

export function ProjectCreateDialog(props: { onClose: () => void }) {
  const { t, errorMessage } = useText();
  const projects = useProjects();
  const agents = useAgents();
  const [name, setName] = createSignal("");
  const [nameTouched, setNameTouched] = createSignal(false);
  const [folder, setFolder] = createSignal("");
  const [level, setLevel] = createSignal<ProjectAccessLevel>(DEFAULT_PROJECT_ACCESS_LEVEL);
  const [color, setColor] = createSignal<AvatarColor | null>(null);
  const [role, setRole] = createSignal(t("project.agent.roleDefault"));
  const [instructions, setInstructions] = createSignal("");
  const [runtime, setRuntime] = createSignal<ProjectRuntime | null>(null);
  const [busy, setBusy] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [showErrors, setShowErrors] = createSignal(false);
  const trimmedName = () => name().trim();
  const shownRuntime = (): ProjectRuntime => {
    const chosen = runtime();
    if (chosen) return chosen;
    return runtimeOfProfile(agents.agentList()[0]);
  };

  async function chooseFolder(): Promise<void> {
    setError(null);
    try {
      const choice = await projects.chooseFolder();
      if (choice.outcome === "chosen") {
        setFolder(choice.path);
        if (!nameTouched()) setName(folderBaseName(choice.path));
      } else if (choice.outcome === "refused") setError(t("project.field.folderFailed"));
    } catch (cause) {
      setError(errorMessage(cause, t("project.field.folderFailed")));
    }
  }

  async function submit(): Promise<void> {
    if (busy()) return;
    setShowErrors(true);
    if (!trimmedName() || !folder() || !role().trim()) return;
    setBusy(true);
    setError(null);
    try {
      await projects.createProject({
        name: trimmedName(),
        mainFolder: folder(),
        accessLevel: level(),
        color: color(),
        defaultRuntime: runtime(),
        instructions: instructions(),
        agents: [{ name: role().trim(), role: role().trim() }],
      });
      props.onClose();
    } catch (cause) {
      setError(errorMessage(cause, t("project.create.failed")));
      setBusy(false);
    }
  }

  return (
    <Dialog.Root
      open={true}
      onOpenChange={(open) => {
        if (!open && !busy()) props.onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay>
          <Dialog.Content class="project-dialog" as="section" aria-busy={busy() ? "true" : undefined}>
            <header class="project-dialog-header">
              <Dialog.Title class="project-dialog-title">{t("project.create.title")}</Dialog.Title>
              <Dialog.Description class="project-dialog-description">
                {t("project.create.description")}
              </Dialog.Description>
            </header>
            <form
              class="project-dialog-form"
              onSubmit={(event) => {
                event.preventDefault();
                void submit();
              }}
            >
              <Field
                label={t("project.field.mainFolder")}
                error={showErrors() && !folder() ? t("project.field.mainFolderRequired") : undefined}
              >
                <div class="project-folder-field">
                  <Input
                    id="project-create-folder"
                    class="project-folder-input"
                    autocomplete="off"
                    spellcheck={false}
                    placeholder={t("project.field.mainFolderEmpty")}
                    aria-label={t("project.field.mainFolder")}
                    value={folder()}
                    maxlength={INPUT_LIMITS.path}
                    disabled={busy()}
                    onValueChange={(value) => {
                      setFolder(value.trim());
                      if (!nameTouched()) setName(folderBaseName(value.trim()));
                    }}
                  />
                  <Button type="button" variant="secondary" onClick={() => void chooseFolder()} disabled={busy()}>
                    <FolderOpen />
                    {t(folder() ? "project.field.changeFolder" : "project.field.chooseFolder")}
                  </Button>
                </div>
              </Field>
              <Field
                label={t("project.field.name")}
                htmlFor="project-create-name"
                error={showErrors() && !trimmedName() ? t("project.field.nameRequired") : undefined}
              >
                <Input
                  id="project-create-name"
                  autocomplete="off"
                  placeholder={t("project.field.namePlaceholder")}
                  value={name()}
                  maxlength={PROJECT_LIMITS.name}
                  disabled={busy()}
                  onValueChange={(value) => {
                    setName(value);
                    setNameTouched(true);
                  }}
                />
              </Field>
              <Field label={t("project.field.access")}>
                <AccessLevelPicker value={level()} disabled={busy()} onChange={setLevel} />
              </Field>
              <Field label={t("project.field.color")}>
                <ProjectColorPicker value={color()} disabled={busy()} onChange={setColor} />
              </Field>
              <Field
                label={t("project.agent.role")}
                htmlFor="project-create-role"
                error={showErrors() && !role().trim() ? t("project.agent.roleRequired") : undefined}
              >
                <Input
                  id="project-create-role"
                  autocomplete="off"
                  placeholder={t("project.agent.rolePlaceholder")}
                  value={role()}
                  maxlength={PROJECT_LIMITS.agentRole}
                  disabled={busy()}
                  onValueChange={setRole}
                />
              </Field>
              <Field label={t("project.field.model")} description={t("project.field.modelHint")}>
                <ProjectModelPicker
                  variant="field"
                  runtime={shownRuntime()}
                  label={t("project.field.model")}
                  disabled={busy()}
                  onChange={setRuntime}
                />
              </Field>
              <Field
                label={t("project.field.instructions")}
                htmlFor="project-create-instructions"
                description={t("project.field.instructionsHint")}
              >
                <Textarea
                  id="project-create-instructions"
                  rows={3}
                  value={instructions()}
                  maxlength={PROJECT_LIMITS.instructions}
                  disabled={busy()}
                  onValueChange={setInstructions}
                />
              </Field>
              <Show when={error()}>
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
              <footer class="project-dialog-actions">
                <Button type="button" variant="ghost" disabled={busy()} onClick={props.onClose}>
                  {t("common.cancel")}
                </Button>
                <Button type="submit" variant="default" loading={busy()} disabled={busy()}>
                  {t("project.create.submit")}
                </Button>
              </footer>
            </form>
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
