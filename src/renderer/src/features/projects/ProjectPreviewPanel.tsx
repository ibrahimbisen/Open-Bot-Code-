import { type AttachmentSummary, type FilePreview, isAttachmentSummary } from "@codebot/contracts/ipc";
import { Spinner } from "@codebot/ui";
import FilePreviewPanel from "@codebot/ui/features/conversation/FilePreviewPanel";
import { useText } from "@codebot/ui/text";
import { createEffect, createSignal, Loading, onSettled, Show } from "solid-js";
import { appPort } from "../../app-port";
import { useAgents } from "../agents/agents-context";
import { attachmentFilePreview } from "../conversation/attachment-preview";
import type { SlotPanelProps } from "./project-dock-panels";
import { projectPreviewPort } from "./project-preview-port";

function attachmentOf(value: string | undefined): AttachmentSummary | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    return isAttachmentSummary(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

async function loadPreview(data: Record<string, string>): Promise<FilePreview> {
  const agent = projectPreviewPort().agent;
  if (data.source === "attachment") {
    const attachment = attachmentOf(data.attachment);
    if (!attachment) throw new Error("attachment");
    return attachmentFilePreview(attachment);
  }
  if (data.source === "shared" && data.path) return agent.previewSharedFile({ path: data.path });
  if (data.source === "workspace" && data.path && data.agentId)
    return agent.previewWorkspaceFile({ agentId: data.agentId, path: data.path });
  throw new Error("source");
}

export function ProjectPreviewPanel(props: SlotPanelProps) {
  const { t } = useText();
  const agents = useAgents();
  const [preview, setPreview] = createSignal<FilePreview | null>(null);
  const [failed, setFailed] = createSignal(false);

  createEffect(
    () => props.params.data,
    (data) => {
      let current = true;
      setFailed(false);
      loadPreview(data).then(
        (loaded) => {
          if (!current) return;
          setPreview(loaded);
          props.onTitleChange(loaded.name);
        },
        () => {
          if (current) setFailed(true);
        },
      );
      return () => {
        current = false;
      };
    },
  );

  onSettled(() => () => {
    const url = preview()?.pageUrl;
    if (url) void projectPreviewPort().agent.releaseFilePreview(url);
  });

  const noop = () => undefined;
  return (
    <div class="project-preview-host">
      <Show
        when={preview()}
        fallback={
          <div class="project-preview-note">
            <Show when={failed()} fallback={<Spinner aria-label={t("panel.preview.loading")} />}>
              <span>{t("panel.preview.failed")}</span>
            </Show>
          </div>
        }
      >
        {(file) => (
          <Loading>
            <FilePreviewPanel
              allowExternalOpen
              preview={file()}
              agents={agents.agentList()}
              maxWidth={() => 100000}
              readWidth={() => 0}
              onWidthChange={noop}
              onResizeEnd={noop}
              onResetWidth={noop}
              readWrapLines={() => false}
              onWrapLinesChange={noop}
              pageUrl={file().pageUrl ?? null}
              onOpenLink={(url) => void appPort().openUrl(url)}
              onOpenSharedFile={noop}
              onOpenExternally={() => {
                const data = props.params.data;
                if (data.source === "workspace" && data.path && data.agentId)
                  void projectPreviewPort().agent.openWorkspaceFile({ agentId: data.agentId, path: data.path });
                else if (data.source === "shared" && data.path)
                  void projectPreviewPort().agent.openSharedFile({ path: data.path });
              }}
              onClose={props.onClose}
            />
          </Loading>
        )}
      </Show>
    </div>
  );
}
