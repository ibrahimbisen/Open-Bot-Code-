import { Button, Dialog, Field, MessageCirclePlus, NativeSelect, Spinner } from "@codebot/ui";
import { useText } from "@codebot/ui/text";
import { createEffect, createSignal, For, Show, untrack } from "solid-js";
import { StatusDot } from "./ProjectsLeftBar";
import type { OpenChatRequest } from "./project-dock-controller";
import { useProjects } from "./projects-context";

export function ProjectChatPicker(props: { placement: OpenChatRequest["placement"]; onClose: () => void }) {
  const { t } = useText();
  const projects = useProjects();
  const [projectId, setProjectId] = createSignal(untrack(() => projects.state.activeProjectId ?? ""));
  const list = () => projects.listOf(projectId(), false);

  createEffect(projectId, (id) => {
    if (id) projects.ensureChats(id);
  });

  function open(agentId: string | null, chatId: string | null): void {
    props.onClose();
    const request = { projectId: projectId(), agentId, chatId, placement: props.placement };
    const controller = projects.dock();
    if (controller) controller.open(request);
    else projects.openChat(request);
  }

  return (
    <Dialog.Root
      open={true}
      onOpenChange={(next) => {
        if (!next) props.onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay>
          <Dialog.Content class="project-dialog project-picker-dialog" as="section">
            <header class="project-dialog-header">
              <Dialog.Title class="project-dialog-title">{t("panel.picker.title")}</Dialog.Title>
              <Dialog.Description class="project-dialog-description">
                {t("panel.picker.description")}
              </Dialog.Description>
            </header>
            <div class="project-dialog-form">
              <Field label={t("panel.picker.project")} htmlFor="project-picker-project">
                <NativeSelect
                  id="project-picker-project"
                  value={projectId()}
                  onChange={(event) => setProjectId(event.currentTarget.value)}
                >
                  <For each={projects.visibleProjects()}>
                    {(project) => <option value={project.id}>{project.name}</option>}
                  </For>
                </NativeSelect>
              </Field>
              <ul class="project-picker-list" aria-label={t("project.chat.history")}>
                <li>
                  <Button
                    variant="ghost"
                    class="project-picker-row"
                    onClick={() => open(projects.detailOf(projectId())?.agents[0]?.id ?? null, null)}
                  >
                    <MessageCirclePlus />
                    <span class="project-picker-title">{t("project.chat.new")}</span>
                  </Button>
                </li>
                <For each={list().chats}>
                  {(chat) => (
                    <li>
                      <Button
                        variant="ghost"
                        class="project-picker-row"
                        onClick={() => open(chat.agentId, chat.taskId)}
                      >
                        <StatusDot state={chat.activity} />
                        <span class="project-picker-title">{chat.title || t("project.chat.untitled")}</span>
                      </Button>
                    </li>
                  )}
                </For>
                <Show when={list().loading && list().chats.length === 0}>
                  <li class="project-picker-loading">
                    <Spinner aria-label={t("project.chat.loading")} />
                  </li>
                </Show>
              </ul>
            </div>
            <footer class="project-dialog-actions">
              <Button type="button" variant="ghost" onClick={props.onClose}>
                {t("common.cancel")}
              </Button>
            </footer>
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
