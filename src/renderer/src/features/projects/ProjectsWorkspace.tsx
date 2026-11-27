import { Button, FolderPlus, Spinner } from "@codebot/ui";
import { useText } from "@codebot/ui/text";
import { Show } from "solid-js";
import { ProjectChatPicker } from "./ProjectChatPicker";
import { ProjectColumn } from "./ProjectColumn";
import { ProjectCreateDialog } from "./ProjectCreateDialog";
import { ProjectDock } from "./ProjectDock";
import { ProjectSettingsDialog } from "./ProjectSettingsDialog";
import "./project-explorer-slots";
import { useProjects } from "./projects-context";

export function ProjectsWorkspace() {
  const { t } = useText();
  const projects = useProjects();
  return (
    <div class="projects-workspace">
      <Show
        when={projects.activeProject()}
        fallback={
          <div class="project-empty-screen">
            <Show when={projects.state.loaded} fallback={<Spinner aria-label={t("project.chat.loading")} />}>
              <div class="project-empty-card">
                <FolderPlus class="project-empty-icon" aria-hidden="true" />
                <h2 class="project-empty-title">{t("project.empty.title")}</h2>
                <p class="project-empty-body">{t("project.empty.body")}</p>
                <Button variant="default" onClick={() => projects.setCreateOpen(true)}>
                  {t("project.empty.action")}
                </Button>
              </div>
            </Show>
          </div>
        }
      >
        {(project) => (
          <>
            <ProjectColumn project={project()} />
            <ProjectDock projectId={project().id} />
          </>
        )}
      </Show>
      <Show when={projects.createOpen()}>
        <ProjectCreateDialog onClose={() => projects.setCreateOpen(false)} />
      </Show>
      <Show when={projects.settingsProjectId()}>
        {(projectId) => (
          <ProjectSettingsDialog projectId={projectId()} onClose={() => projects.setSettingsProjectId(null)} />
        )}
      </Show>
      <Show when={projects.pickerOpen()}>
        {(request) => (
          <ProjectChatPicker placement={request().placement} onClose={() => projects.setPickerOpen(null)} />
        )}
      </Show>
    </div>
  );
}
