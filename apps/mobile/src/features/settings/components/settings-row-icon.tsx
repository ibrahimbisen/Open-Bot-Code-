import type { LucideIcon } from "lucide-react-native";
import { useCSSVariable } from "uniwind";

const TONE_COLORS = {
  muted: "--codebot-text-grouped-secondary",
  accent: "--codebot-accent",
  danger: "--codebot-danger-text",
} as const;

export function RowIcon({ icon: Icon, tone = "muted" }: { icon: LucideIcon; tone?: keyof typeof TONE_COLORS }) {
  const color = String(useCSSVariable(TONE_COLORS[tone]));
  return <Icon size={20} color={color} strokeWidth={1.75} />;
}
