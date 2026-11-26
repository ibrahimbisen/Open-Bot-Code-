import type { AgentTask } from "@codebot/contracts/ipc";
import Check from "lucide-react-native/icons/check";
import Circle from "lucide-react-native/icons/circle";
import X from "lucide-react-native/icons/x";
import { View } from "react-native";
import { useCSSVariable } from "uniwind";

export function AgentTaskMark({ task }: { task: AgentTask }) {
  const muted = String(useCSSVariable("--codebot-text-grouped-secondary"));
  const accent = String(useCSSVariable("--codebot-accent-text"));
  const success = String(useCSSVariable("--codebot-success-text"));
  const danger = String(useCSSVariable("--codebot-danger-text"));
  return (
    <View
      className="size-4 items-center justify-center"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {task.state === "running" ? (
        <View className="size-2 rounded-full" style={{ backgroundColor: accent }} />
      ) : task.state === "queued" || task.outcome === null ? (
        <Circle color={muted} size={14} strokeWidth={1.8} />
      ) : task.outcome === "completed" ? (
        <Check color={success} size={16} strokeWidth={2} />
      ) : (
        <X color={danger} size={16} strokeWidth={2} />
      )}
    </View>
  );
}
