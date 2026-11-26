import type { SlashCommandScreen } from "@codebot/contracts/ipc";
import { createSignal } from "solid-js";

export interface SlashScreenRequest {
  screen: SlashCommandScreen;
  agentId: string;
  taskId?: string | undefined;
}

const [slashScreenRequest, setSlashScreenRequest] = createSignal<SlashScreenRequest | null>(null);

export { slashScreenRequest };

export function openSlashScreen(request: SlashScreenRequest): void {
  setSlashScreenRequest(request);
}

export function closeSlashScreen(): void {
  setSlashScreenRequest(null);
}
