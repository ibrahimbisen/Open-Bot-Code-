import type { ProjectRuntime } from "@codebot/contracts/ipc";
import { ProviderModelPicker } from "@codebot/ui/components/ProviderModelPicker";
import { useText } from "@codebot/ui/text";
import { useAgents } from "../agents/agents-context";

export function ProjectModelPicker(props: {
  runtime: ProjectRuntime;
  label: string;
  variant?: "pill" | "field";
  disabled?: boolean;
  onChange: (runtime: ProjectRuntime) => void;
}) {
  const { modelOptions, agentStatus } = useAgents();
  const { t } = useText();
  return (
    <ProviderModelPicker
      variant={props.variant ?? "pill"}
      ariaLabel={props.label}
      provider={props.runtime.provider}
      value={props.runtime.model}
      modelOptions={modelOptions()}
      agentStatus={agentStatus()}
      providerAccountId={props.runtime.providerAccountId}
      reasoningEffort={props.runtime.reasoningEffort}
      disabled={props.disabled}
      disabledReason={t("panel.header.modelLocked")}
      onReasoningEffortChange={(effort) => props.onChange({ ...props.runtime, reasoningEffort: effort })}
      onChange={(model, provider, accountId, effort) =>
        props.onChange({
          provider,
          model,
          reasoningEffort: effort ?? props.runtime.reasoningEffort,
          ...(accountId ? { providerAccountId: accountId } : {}),
        })
      }
    />
  );
}
